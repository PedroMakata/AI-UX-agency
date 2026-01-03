'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, MessageSquare, Calendar } from 'lucide-react';

interface Session {
  id: string;
  date: string;
  topic: string;
  messageCount: number;
  firstMessageAt: string;
}

interface ChatHistorySidebarProps {
  agentId: string;
  agentName: string;
  projectId: string;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dateOnly = dateStr.split('T')[0];
  const todayOnly = today.toISOString().split('T')[0];
  const yesterdayOnly = yesterday.toISOString().split('T')[0];

  if (dateOnly === todayOnly) return 'Dnes';
  if (dateOnly === yesterdayOnly) return 'Vcera';

  return date.toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'long',
  });
}

function groupSessionsByRelativeDate(sessions: Session[]): Map<string, Session[]> {
  const groups = new Map<string, Session[]>();

  for (const session of sessions) {
    const label = formatDate(session.date);
    if (!groups.has(label)) {
      groups.set(label, []);
    }
    groups.get(label)!.push(session);
  }

  return groups;
}

export function ChatHistorySidebar({ agentId, agentName, projectId }: ChatHistorySidebarProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await fetch(`/api/chat/${agentId}/sessions?projectId=${projectId}`);
        if (res.ok) {
          const data = await res.json();
          setSessions(data.sessions || []);
        }
      } catch (error) {
        console.error('Failed to fetch sessions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [agentId, projectId]);

  const groupedSessions = groupSessionsByRelativeDate(sessions);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Historie chatu
        </h3>
        <p className="text-sm text-muted-foreground">
          Zatim zadna historie s {agentName}. Zacnete konverzaci!
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <MessageSquare className="h-5 w-5" />
        Historie chatu
      </h3>
      <ScrollArea className="h-[300px]">
        <div className="space-y-4">
          {Array.from(groupedSessions).map(([dateLabel, dateSessions]) => (
            <div key={dateLabel}>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <Calendar className="h-3 w-3" />
                {dateLabel}
              </div>
              <div className="space-y-2">
                {dateSessions.map((session) => (
                  <div
                    key={session.id}
                    className="p-2 rounded-lg bg-muted hover:bg-muted/80 cursor-pointer transition-colors"
                  >
                    <p className="text-sm font-medium line-clamp-2">{session.topic}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {session.messageCount} zprav
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}
