'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface ChatInstance {
  id: string;
  isMinimized: boolean;
  agentId: string;
  agentName: string;
  agentAvatar: string;
  agentColor: string;
  projectId: string;
}

interface ChatWidgetContextType {
  chats: ChatInstance[];
  openChat: (params: {
    agentId: string;
    agentName: string;
    agentAvatar: string;
    agentColor: string;
    projectId: string;
  }) => void;
  closeChat: (chatId: string) => void;
  toggleMinimize: (chatId: string) => void;
  // Legacy support for single chat
  state: {
    isOpen: boolean;
    isMinimized: boolean;
    agentId: string | null;
    agentName: string;
    agentAvatar: string;
    agentColor: string;
    projectId: string | null;
  };
}

const MAX_OPEN_CHATS = 5;

const ChatWidgetContext = createContext<ChatWidgetContextType | null>(null);

export function ChatWidgetProvider({ children }: { children: ReactNode }) {
  const [chats, setChats] = useState<ChatInstance[]>([]);

  const openChat = useCallback((params: {
    agentId: string;
    agentName: string;
    agentAvatar: string;
    agentColor: string;
    projectId: string;
  }) => {
    setChats(prev => {
      // Check if chat already exists for this agent/project combo
      const existingIndex = prev.findIndex(
        c => c.agentId === params.agentId && c.projectId === params.projectId
      );

      if (existingIndex >= 0) {
        // Bring existing chat to front (last position) and un-minimize
        const existing = prev[existingIndex];
        const newChats = [...prev.filter((_, i) => i !== existingIndex)];
        return [...newChats, { ...existing, isMinimized: false }];
      }

      // Create new chat
      const newChat: ChatInstance = {
        id: `${params.agentId}-${params.projectId}-${Date.now()}`,
        isMinimized: false,
        ...params,
      };

      // If at max, close oldest chat
      if (prev.length >= MAX_OPEN_CHATS) {
        return [...prev.slice(1), newChat];
      }

      return [...prev, newChat];
    });
  }, []);

  const closeChat = useCallback((chatId: string) => {
    setChats(prev => prev.filter(c => c.id !== chatId));
  }, []);

  const toggleMinimize = useCallback((chatId: string) => {
    setChats(prev =>
      prev.map(c =>
        c.id === chatId ? { ...c, isMinimized: !c.isMinimized } : c
      )
    );
  }, []);

  // Legacy state for backward compatibility (uses first non-minimized chat or last chat)
  const activeChat = chats.find(c => !c.isMinimized) || chats[chats.length - 1];
  const legacyState = {
    isOpen: chats.length > 0,
    isMinimized: activeChat?.isMinimized ?? false,
    agentId: activeChat?.agentId ?? null,
    agentName: activeChat?.agentName ?? '',
    agentAvatar: activeChat?.agentAvatar ?? '',
    agentColor: activeChat?.agentColor ?? '',
    projectId: activeChat?.projectId ?? null,
  };

  return (
    <ChatWidgetContext.Provider
      value={{
        chats,
        openChat,
        closeChat,
        toggleMinimize,
        state: legacyState,
      }}
    >
      {children}
    </ChatWidgetContext.Provider>
  );
}

export function useChatWidget() {
  const context = useContext(ChatWidgetContext);
  if (!context) {
    throw new Error('useChatWidget must be used within a ChatWidgetProvider');
  }
  return context;
}
