'use client';

import { useState, useEffect, useCallback } from 'react';

interface AgentNotifications {
  [agentId: string]: boolean;
}

const STORAGE_KEY = 'agent-notifications';

export function useAgentNotifications() {
  const [notifications, setNotifications] = useState<AgentNotifications>({});

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setNotifications(JSON.parse(stored));
    }
  }, []);

  const setUnread = useCallback((agentId: string, hasUnread: boolean) => {
    setNotifications(prev => {
      const updated = { ...prev, [agentId]: hasUnread };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
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

  return {
    notifications,
    markAsRead,
    markAsUnread,
    hasUnread,
  };
}
