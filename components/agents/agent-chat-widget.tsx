'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useChatWidget } from '@/components/providers/chat-widget-provider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { X, Minus, Maximize2, Send, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatInstance {
  id: string;
  isMinimized: boolean;
  agentId: string;
  agentName: string;
  agentAvatar: string;
  agentColor: string;
  projectId: string;
}

function SingleChatWidget({
  chat,
  index,
  totalMinimized,
  onClose,
  onToggleMinimize,
}: {
  chat: ChatInstance;
  index: number;
  totalMinimized: number;
  onClose: () => void;
  onToggleMinimize: () => void;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadHistory();
  }, [chat.agentId, chat.projectId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(
        `/api/chat/${chat.agentId}/history?projectId=${chat.projectId}`
      );
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch(`/api/chat/${chat.agentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: chat.projectId,
          message: userMessage,
          messages: messages.slice(-10),
        }),
      });

      const data = await res.json();
      if (data.message) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Minimized state - show avatar bubble positioned horizontally
  if (chat.isMinimized) {
    const rightOffset = index * 60 + 16;
    return (
      <button
        onClick={onToggleMinimize}
        className="fixed bottom-4 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl hover:scale-110 transition-transform"
        style={{
          right: `${rightOffset}px`,
          backgroundColor: chat.agentColor,
        }}
        title={chat.agentName}
      >
        {chat.agentAvatar}
      </button>
    );
  }

  // Expanded chat widget - position based on number of minimized chats
  const rightOffset = totalMinimized * 60 + 16;

  return (
    <Card
      className="fixed bottom-4 z-50 w-96 h-[500px] flex flex-col shadow-2xl"
      style={{ right: `${rightOffset}px` }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 border-b"
        style={{ backgroundColor: chat.agentColor + '20' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-2xl">{chat.agentAvatar}</span>
          <span className="font-semibold">{chat.agentName}</span>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              onClose();
              router.push(`/agents/${chat.agentId}?projectId=${chat.projectId}`);
            }}
            title="Otevřít na celou stránku"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleMinimize}>
            <Minus className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loadingHistory ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <span className="text-4xl block mb-2">{chat.agentAvatar}</span>
            <p>Start a conversation with {chat.agentName}</p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                    <ReactMarkdown
                      components={{
                        h1: ({ children }) => <h1 className="text-lg font-bold mt-3 mb-1">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-base font-semibold mt-2 mb-1">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-sm font-semibold mt-2 mb-1">{children}</h3>,
                        p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc pl-3 mb-1.5 space-y-0.5">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-3 mb-1.5 space-y-0.5">{children}</ol>,
                        li: ({ children }) => <li>{children}</li>,
                        strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                        em: ({ children }) => <em className="italic">{children}</em>,
                        code: ({ children }) => <code className="bg-background/50 px-1 py-0.5 rounded text-xs">{children}</code>,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted px-3 py-2 rounded-lg">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={loading}
            className="flex-1"
          />
          <Button onClick={sendMessage} disabled={loading || !input.trim()} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function AgentChatWidget() {
  const { chats, closeChat, toggleMinimize } = useChatWidget();

  if (chats.length === 0) return null;

  // Calculate indices for minimized bubbles
  const minimizedChats = chats.filter(c => c.isMinimized);
  const expandedChats = chats.filter(c => !c.isMinimized);

  return (
    <>
      {/* Render minimized bubbles */}
      {minimizedChats.map((chat, index) => (
        <SingleChatWidget
          key={chat.id}
          chat={chat}
          index={index}
          totalMinimized={minimizedChats.length}
          onClose={() => closeChat(chat.id)}
          onToggleMinimize={() => toggleMinimize(chat.id)}
        />
      ))}
      {/* Render expanded chat (only the last expanded one is fully visible) */}
      {expandedChats.length > 0 && (
        <SingleChatWidget
          key={expandedChats[expandedChats.length - 1].id}
          chat={expandedChats[expandedChats.length - 1]}
          index={0}
          totalMinimized={minimizedChats.length}
          onClose={() => closeChat(expandedChats[expandedChats.length - 1].id)}
          onToggleMinimize={() => toggleMinimize(expandedChats[expandedChats.length - 1].id)}
        />
      )}
    </>
  );
}
