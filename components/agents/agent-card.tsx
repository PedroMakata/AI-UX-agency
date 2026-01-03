'use client';

import Link from 'next/link';
import { MessageSquare, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { Agent } from '@/lib/ai/agents';

interface AgentCardProps {
  agent: Agent;
  projectId?: string;
  messagesCount?: number;
  isActive?: boolean;
  progress?: number;
  onChat?: () => void;
}

export function AgentCard({
  agent,
  projectId,
  messagesCount = 0,
  isActive = false,
  progress,
  onChat,
}: AgentCardProps) {
  const initials = agent.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all hover:shadow-lg',
        isActive && 'ring-2 ring-primary'
      )}
    >
      {/* Color accent bar */}
      <div
        className="absolute left-0 top-0 h-1 w-full"
        style={{ backgroundColor: agent.color }}
      />

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border-2" style={{ borderColor: agent.color }}>
              <AvatarImage src={agent.avatar} alt={agent.name} />
              <AvatarFallback style={{ backgroundColor: agent.color, color: 'white' }}>
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{agent.name}</CardTitle>
              <CardDescription className="text-sm">{agent.role}</CardDescription>
            </div>
          </div>
          {isActive && (
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="h-3 w-3" />
              Active
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Capabilities */}
        <div className="flex flex-wrap gap-1.5">
          {agent.capabilities.slice(0, 4).map((capability) => (
            <Badge key={capability} variant="outline" className="text-xs font-normal">
              {capability}
            </Badge>
          ))}
          {agent.capabilities.length > 4 && (
            <Badge variant="outline" className="text-xs font-normal">
              +{agent.capabilities.length - 4} more
            </Badge>
          )}
        </div>

        {/* Tools */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Tools:</span>
          <div className="flex gap-1">
            {agent.tools.map((tool) => (
              <Badge
                key={tool}
                variant="secondary"
                className="text-xs capitalize"
                style={{
                  backgroundColor: `${agent.color}20`,
                  color: agent.color,
                }}
              >
                {tool}
              </Badge>
            ))}
          </div>
        </div>

        {/* Progress indicator */}
        {typeof progress === 'number' && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Task Progress</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Messages count */}
        {messagesCount > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MessageSquare className="h-3.5 w-3.5" />
            <span>{messagesCount} messages in conversation</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0">
        {projectId ? (
          <Button
            className="w-full gap-2"
            style={{
              backgroundColor: agent.color,
              color: 'white',
            }}
            onClick={onChat}
            asChild
          >
            <Link href={`/agents/${agent.id}?projectId=${projectId}`}>
              <MessageSquare className="h-4 w-4" />
              Chat with {agent.name}
            </Link>
          </Button>
        ) : (
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={onChat}
          >
            <MessageSquare className="h-4 w-4" />
            Start Conversation
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

// Compact version for lists
export function AgentCardCompact({
  agent,
  projectId,
  isActive = false,
  onClick,
}: {
  agent: Agent;
  projectId?: string;
  isActive?: boolean;
  onClick?: () => void;
}) {
  const initials = agent.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all hover:bg-accent',
        isActive && 'border-primary bg-accent'
      )}
    >
      <Avatar className="h-10 w-10" style={{ borderColor: agent.color }}>
        <AvatarImage src={agent.avatar} alt={agent.name} />
        <AvatarFallback style={{ backgroundColor: agent.color, color: 'white' }}>
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="font-medium">{agent.name}</span>
          {isActive && (
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: agent.color }}
            />
          )}
        </div>
        <p className="truncate text-sm text-muted-foreground">{agent.role}</p>
      </div>
    </button>
  );
}

export default AgentCard;
