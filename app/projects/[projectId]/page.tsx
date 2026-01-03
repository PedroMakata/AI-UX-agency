'use client';

import { useState, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FileUpload } from '@/components/files/file-upload';
import { FileList } from '@/components/files/file-list';
import { NotionSync } from '@/components/notion/notion-sync';
import { NotesPanel } from '@/components/notes/notes-panel';
import { AgentSettingsModal } from '@/components/agents/agent-settings-modal';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Plus,
  MessageSquare,
  Upload,
  Sparkles,
  Loader2,
  ArrowLeft,
  Settings,
  UserPlus,
  LayoutGrid,
  Check,
  Maximize2,
  Pencil,
  X,
} from 'lucide-react';
import { useProject, type CustomAgent } from '@/hooks/use-projects';
import { AGENTS, type Agent } from '@/lib/ai/agents';
import { useChatWidget } from '@/components/providers/chat-widget-provider';

const EMOJI_OPTIONS = ['🤖', '👨‍💻', '👩‍💼', '🧠', '💡', '📝', '🎯', '🔍', '📊', '🎨'];
const COLOR_OPTIONS = ['#6366F1', '#EC4899', '#14B8A6', '#F59E0B', '#8B5CF6', '#EF4444', '#10B981', '#3B82F6'];

export default function ProjectDashboardPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const router = useRouter();
  const { project, loading, error, updateProject, refresh } = useProject(projectId);
  const { openChat } = useChatWidget();

  const [showAddAgentModal, setShowAddAgentModal] = useState(false);
  const [showCreateAgentModal, setShowCreateAgentModal] = useState(false);
  const [settingsAgent, setSettingsAgent] = useState<Agent | CustomAgent | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [uploadTab, setUploadTab] = useState<'upload' | 'notion'>('upload');
  const [newAgent, setNewAgent] = useState<CustomAgent>({
    id: '',
    name: '',
    role: '',
    avatar: '🤖',
    color: '#6366F1',
    systemPrompt: '',
  });
  const [fileListKey, setFileListKey] = useState(0);

  const handleFileUploadComplete = useCallback(() => {
    setFileListKey(k => k + 1);
    refresh();
  }, [refresh]);

  const handleStartEditName = () => {
    setEditedName(project?.name || '');
    setEditingName(true);
  };

  const handleSaveName = async () => {
    if (!editedName.trim() || editedName === project?.name) {
      setEditingName(false);
      return;
    }
    await updateProject({ name: editedName.trim() });
    setEditingName(false);
    refresh();
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      setEditingName(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Projekt nenalezen</h1>
          <p className="text-muted-foreground mb-4">{error || 'Nepodařilo se načíst projekt'}</p>
          <Button onClick={() => router.push('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zpět na Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const projectSettings = project.settings || { agents: ['riley'], customAgents: [] };
  const activeAgentIds = projectSettings.agents || ['riley'];
  const customAgents = projectSettings.customAgents || [];

  // Get active agents (both built-in and custom)
  const activeAgents: (Agent | CustomAgent)[] = [
    ...activeAgentIds.map((id) => AGENTS[id]).filter(Boolean),
    ...customAgents,
  ];

  // Get available built-in agents not yet added
  const availableAgents = Object.values(AGENTS).filter(
    (agent) => !activeAgentIds.includes(agent.id)
  );

  const handleAddBuiltInAgent = async (agentId: string) => {
    const newAgentIds = [...activeAgentIds, agentId];
    await updateProject({
      settings: {
        ...projectSettings,
        agents: newAgentIds,
      },
    });
    setShowAddAgentModal(false);
    refresh();
  };

  const handleRemoveAgent = async (agentId: string, isCustom: boolean) => {
    if (isCustom) {
      const newCustomAgents = customAgents.filter((a) => a.id !== agentId);
      await updateProject({
        settings: {
          ...projectSettings,
          customAgents: newCustomAgents,
        },
      });
    } else {
      const newAgentIds = activeAgentIds.filter((id) => id !== agentId);
      await updateProject({
        settings: {
          ...projectSettings,
          agents: newAgentIds,
        },
      });
    }
    refresh();
  };

  const handleCreateCustomAgent = async () => {
    if (!newAgent.name.trim() || !newAgent.role.trim()) return;

    const agentWithId: CustomAgent = {
      ...newAgent,
      id: `custom-${Date.now()}`,
    };

    await updateProject({
      settings: {
        ...projectSettings,
        customAgents: [...customAgents, agentWithId],
      },
    });

    setShowCreateAgentModal(false);
    setNewAgent({
      id: '',
      name: '',
      role: '',
      avatar: '🤖',
      color: '#6366F1',
      systemPrompt: '',
    });
    refresh();
  };

  const handleUpdateAgentPrompt = async (
    agentId: string,
    newPrompt: string,
    isCustom: boolean,
    capabilities?: string[],
    tools?: string[]
  ) => {
    if (isCustom) {
      const updatedCustomAgents = customAgents.map((a) =>
        a.id === agentId
          ? { ...a, systemPrompt: newPrompt, capabilities, tools }
          : a
      );
      await updateProject({
        settings: {
          ...projectSettings,
          customAgents: updatedCustomAgents,
        },
      });
    } else {
      // For built-in agents, store custom prompts in project settings
      await updateProject({
        settings: {
          ...projectSettings,
          agentPromptOverrides: {
            ...projectSettings.agentPromptOverrides || {},
            [agentId]: newPrompt,
          },
        },
      });
    }
    setSettingsAgent(null);
    refresh();
  };

  const getAgentPrompt = (agent: Agent | CustomAgent): string => {
    if (!agent.id.startsWith('custom-')) {
      // Built-in agent - check for override
      const overrides = projectSettings.agentPromptOverrides || {};
      return overrides[agent.id] || agent.systemPrompt;
    }
    return agent.systemPrompt;
  };

  const isCustomAgent = (agent: Agent | CustomAgent): boolean => {
    return agent.id.startsWith('custom-');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              {editingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    onBlur={handleSaveName}
                    onKeyDown={handleNameKeyDown}
                    className="text-4xl font-bold h-auto py-1 px-2"
                    autoFocus
                  />
                  <Button variant="ghost" size="icon" onClick={() => setEditingName(false)}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <h1 className="text-4xl font-bold">{project.name}</h1>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={handleStartEditName}
                  >
                    <Pencil className="h-5 w-5" />
                  </Button>
                </div>
              )}
              {project.description && (
                <p className="text-muted-foreground mt-1">{project.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Soubory</p>
                <p className="text-3xl font-bold">{project.stats?.files || 0}</p>
              </div>
              <Upload className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Konverzace</p>
                <p className="text-3xl font-bold">{project.stats?.messages || 0}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Wireframes</p>
                <p className="text-3xl font-bold">{project.stats?.wireframes || 0}</p>
              </div>
              <LayoutGrid className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Prototypy</p>
                <p className="text-3xl font-bold">{project.stats?.prototypes || 0}</p>
              </div>
              <Sparkles className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>
        </div>

        {/* AI Agents */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">AI Tým</h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowAddAgentModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Přidat agenta
              </Button>
              <Button onClick={() => setShowCreateAgentModal(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Vlastní agent
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {activeAgents.map((agent) => {
              const custom = isCustomAgent(agent);
              const agentAvatar = custom
                ? agent.avatar
                : agent.id === 'riley' ? '👩‍🔬'
                : agent.id === 'sam' ? '🎯'
                : agent.id === 'blake' ? '📊'
                : agent.id === 'alex' ? '✏️'
                : agent.id === 'jordan' ? '🎨' : '🤖';

              return (
                <Card key={agent.id} className="p-6 relative group">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setSettingsAgent(agent)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>

                  <div className="text-center space-y-3">
                    <div className="text-6xl">{agentAvatar}</div>
                    <div>
                      <h3 className="font-semibold">{agent.name}</h3>
                      <p className="text-sm text-muted-foreground">{agent.role}</p>
                    </div>
                    <div
                      className="h-1 rounded-full"
                      style={{ backgroundColor: agent.color }}
                    />
                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        variant="outline"
                        size="sm"
                        onClick={() => openChat({
                          agentId: agent.id,
                          agentName: agent.name,
                          agentAvatar: agentAvatar,
                          agentColor: agent.color,
                          projectId: projectId,
                        })}
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Chat
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/agents/${agent.id}?projectId=${projectId}`)}
                      >
                        <Maximize2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* File Upload Section - Compact Tabs */}
        <div>
          <div className="flex items-center gap-4 mb-4">
            <h2 className="text-2xl font-bold">Soubory</h2>
            <div className="flex border-b">
              <button
                className={`px-4 py-2 flex items-center gap-2 text-sm font-medium transition-colors relative ${
                  uploadTab === 'upload'
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setUploadTab('upload')}
              >
                <Upload className="h-4 w-4" />
                Nahrát
                {uploadTab === 'upload' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
              <button
                className={`px-4 py-2 flex items-center gap-2 text-sm font-medium transition-colors relative ${
                  uploadTab === 'notion'
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setUploadTab('notion')}
              >
                <Sparkles className="h-4 w-4" />
                Notion
                {uploadTab === 'notion' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
            </div>
          </div>
          {uploadTab === 'upload' ? (
            <FileUpload projectId={projectId} onUploadComplete={handleFileUploadComplete} />
          ) : (
            <NotionSync
              projectId={projectId}
              notionDatabaseId={projectSettings.notionDatabaseId}
              lastSync={projectSettings.lastNotionSync}
              onConnectionChange={refresh}
            />
          )}
        </div>

        {/* Files List */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Nahrané Soubory</h2>
          <FileList projectId={projectId} key={fileListKey} />
        </div>

        {/* Notes Section */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Poznamky</h2>
          <NotesPanel projectId={projectId} />
        </div>
      </div>

      {/* Add Built-in Agent Modal */}
      {showAddAgentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg p-6 m-4">
            <h2 className="text-2xl font-bold mb-6">Přidat agenta</h2>

            {availableAgents.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Všichni agenti jsou již přidáni
              </p>
            ) : (
              <div className="space-y-3">
                {availableAgents.map((agent) => (
                  <Card
                    key={agent.id}
                    className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleAddBuiltInAgent(agent.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-4xl">
                        {agent.id === 'riley' && '👩‍🔬'}
                        {agent.id === 'sam' && '🎯'}
                        {agent.id === 'blake' && '📊'}
                        {agent.id === 'alex' && '✏️'}
                        {agent.id === 'jordan' && '🎨'}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{agent.name}</h3>
                        <p className="text-sm text-muted-foreground">{agent.role}</p>
                      </div>
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: agent.color }}
                      />
                    </div>
                  </Card>
                ))}
              </div>
            )}

            <div className="flex justify-end mt-6">
              <Button variant="outline" onClick={() => setShowAddAgentModal(false)}>
                Zavřít
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Create Custom Agent Modal */}
      {showCreateAgentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
          <Card className="w-full max-w-lg p-6 m-4 my-8">
            <h2 className="text-2xl font-bold mb-6">Vytvořit vlastního agenta</h2>

            <div className="space-y-4">
              <div>
                <Label htmlFor="agent-name">Jméno agenta *</Label>
                <Input
                  id="agent-name"
                  value={newAgent.name}
                  onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                  placeholder="např. Max"
                />
              </div>

              <div>
                <Label htmlFor="agent-role">Role *</Label>
                <Input
                  id="agent-role"
                  value={newAgent.role}
                  onChange={(e) => setNewAgent({ ...newAgent, role: e.target.value })}
                  placeholder="např. Marketing Specialist"
                />
              </div>

              <div>
                <Label>Avatar</Label>
                <div className="flex gap-2 flex-wrap mt-2">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <Button
                      key={emoji}
                      variant={newAgent.avatar === emoji ? 'default' : 'outline'}
                      size="icon"
                      className="text-2xl"
                      onClick={() => setNewAgent({ ...newAgent, avatar: emoji })}
                    >
                      {emoji}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Barva</Label>
                <div className="flex gap-2 flex-wrap mt-2">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      className="w-8 h-8 rounded-full border-2 flex items-center justify-center"
                      style={{
                        backgroundColor: color,
                        borderColor: newAgent.color === color ? 'white' : 'transparent',
                      }}
                      onClick={() => setNewAgent({ ...newAgent, color })}
                    >
                      {newAgent.color === color && (
                        <Check className="h-4 w-4 text-white" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="agent-prompt">System Prompt</Label>
                <Textarea
                  id="agent-prompt"
                  value={newAgent.systemPrompt}
                  onChange={(e) => setNewAgent({ ...newAgent, systemPrompt: e.target.value })}
                  placeholder="Definujte osobnost a schopnosti agenta..."
                  rows={6}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Tento prompt určuje, jak se agent chová a jaké má znalosti.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateAgentModal(false);
                  setNewAgent({
                    id: '',
                    name: '',
                    role: '',
                    avatar: '🤖',
                    color: '#6366F1',
                    systemPrompt: '',
                  });
                }}
              >
                Zrušit
              </Button>
              <Button
                onClick={handleCreateCustomAgent}
                disabled={!newAgent.name.trim() || !newAgent.role.trim()}
              >
                Vytvořit agenta
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Agent Settings Modal */}
      {settingsAgent && (
        <AgentSettingsModal
          agent={settingsAgent}
          currentPrompt={getAgentPrompt(settingsAgent)}
          isCustom={isCustomAgent(settingsAgent)}
          onClose={() => setSettingsAgent(null)}
          onSave={(newPrompt, capabilities, tools) =>
            handleUpdateAgentPrompt(
              settingsAgent.id,
              newPrompt,
              isCustomAgent(settingsAgent),
              capabilities,
              tools
            )
          }
          onRemove={() => {
            handleRemoveAgent(settingsAgent.id, isCustomAgent(settingsAgent));
            setSettingsAgent(null);
          }}
        />
      )}
    </div>
  );
}
