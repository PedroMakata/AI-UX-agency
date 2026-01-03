'use client';

import { use } from 'react';
import { useSearchParams } from 'next/navigation';
import { AgentChat } from '@/components/agents/agent-chat';
import { ChatHistorySidebar } from '@/components/agents/chat-history-sidebar';
import { WireframeGenerator } from '@/components/agents/wireframe-generator';
import { VibePromptGenerator } from '@/components/agents/vibe-prompt-generator';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useDefaultProject } from '@/hooks/use-default-project';
import { useProject, type CustomAgent } from '@/hooks/use-projects';

const AGENTS = {
  riley: {
    name: 'Riley',
    role: 'UX Researcher',
    avatar: '👩‍🔬',
    color: 'blue',
    description: 'Analyzuji user research a hledám insights'
  },
  sam: {
    name: 'Sam',
    role: 'Product Strategist',
    avatar: '🎯',
    color: 'purple',
    description: 'Vytvářím product strategii a roadmapy'
  },
  blake: {
    name: 'Blake',
    role: 'Business Analyst',
    avatar: '📊',
    color: 'orange',
    description: 'Píšu requirements a user stories'
  },
  alex: {
    name: 'Alex',
    role: 'UX Designer',
    avatar: '✏️',
    color: 'green',
    description: 'Navrhuji user flows a wireframes'
  },
  jordan: {
    name: 'Jordan',
    role: 'UI Designer',
    avatar: '🎨',
    color: 'pink',
    description: 'Vytvářím visual design a prototypy'
  }
};

interface AgentInfo {
  name: string;
  role: string;
  avatar: string;
  color: string;
  description: string;
}

export default function AgentPage({
  params
}: {
  params: Promise<{ agentId: string }>
}) {
  const { agentId } = use(params);
  const searchParams = useSearchParams();
  const urlProjectId = searchParams.get('projectId');

  // Check if this is a custom agent
  const isCustomAgentId = agentId.startsWith('custom-');

  // Get built-in agent if not custom
  const builtInAgent = AGENTS[agentId as keyof typeof AGENTS];

  // Use project from URL if provided, otherwise use default
  const { project, loading: projectLoading } = useProject(urlProjectId || '');
  const { projectId: defaultProjectId, loading: defaultLoading, error } = useDefaultProject();

  // Determine the active projectId
  const projectId = urlProjectId || defaultProjectId;
  const loading = urlProjectId ? projectLoading : defaultLoading;

  // Get custom agent from project settings
  let customAgent: CustomAgent | undefined;
  if (isCustomAgentId && project?.settings?.customAgents) {
    customAgent = project.settings.customAgents.find((a: CustomAgent) => a.id === agentId);
  }

  // Determine agent info
  const agent: AgentInfo | undefined = builtInAgent || (customAgent ? {
    name: customAgent.name,
    role: customAgent.role,
    avatar: customAgent.avatar,
    color: customAgent.color.replace('#', ''),
    description: customAgent.systemPrompt?.substring(0, 100) || ''
  } : undefined);

  // Back URL - go to project if we have projectId from URL
  const backUrl = urlProjectId ? `/projects/${urlProjectId}` : '/';
  const backLabel = urlProjectId ? 'Zpět na projekt' : 'Zpět na Dashboard';

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Agent nenalezen</h1>
          <Link href={backUrl}>
            <Button className="mt-4">{backLabel}</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (error || !projectId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{error || 'Failed to load project'}</p>
          <Link href="/">
            <Button>Zpět na Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <Link href={backUrl}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {backLabel}
            </Button>
          </Link>

          <div className="flex items-center gap-4 mt-4">
            <span className="text-6xl">{agent.avatar}</span>
            <div>
              <h1 className="text-3xl font-bold">{agent.name}</h1>
              <p className="text-muted-foreground">{agent.role}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {agent.description}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chat - 2 columns */}
          <div className="lg:col-span-2">
            <AgentChat
              agentId={agentId}
              agentName={agent.name}
              agentAvatar={agent.avatar}
              agentColor={agent.color}
              projectId={projectId}
            />
          </div>

          {/* Side Panel - 1 column */}
          <div className="space-y-6">
            {/* Alex má Wireframe Generator */}
            {agentId === 'alex' && (
              <WireframeGenerator
                description=""
                onGenerate={(wireframe) => {
                  console.log('Wireframe generated:', wireframe);
                }}
              />
            )}

            {/* Jordan má Vibe Prompt Generator */}
            {agentId === 'jordan' && (
              <VibePromptGenerator
                wireframeData={null}
                onPromptGenerated={(prompt) => {
                  console.log('Prompt generated:', prompt);
                }}
                onPrototypeCreated={(prototype) => {
                  console.log('Prototype created:', prototype);
                }}
              />
            )}

            {/* Chat History Sidebar for all agents */}
            <ChatHistorySidebar
              agentId={agentId}
              agentName={agent.name}
              projectId={projectId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
