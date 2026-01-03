'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface AgentNotifications {
  [agentId: string]: boolean;
}

interface NotificationContextType {
  notifications: AgentNotifications;
  markAsRead: (agentId: string) => void;
  markAsUnread: (agentId: string) => void;
  hasUnread: (agentId: string) => boolean;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

const STORAGE_KEY = 'agent-notifications';

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AgentNotifications>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setNotifications(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load notifications:', e);
    }
  }, []);

  const setUnread = useCallback((agentId: string, hasUnread: boolean) => {
    setNotifications(prev => {
      const updated = { ...prev, [agentId]: hasUnread };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save notifications:', e);
      }
      return updated;
    });
  }, []);

  const markAsRead = useCallback((agentId: string) => {
    setUnread(agentId, false);
  }, [setUnread]);

  const markAsUnread = useCallback((agentId: string) => {
    setUnread(agentId, true);
  }, [setUnread]);

  const hasUnread = useCallback((agentId: string) => {
    return notifications[agentId] || false;
  }, [notifications]);

  return (
    <NotificationContext.Provider value={{ notifications, markAsRead, markAsUnread, hasUnread }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}
