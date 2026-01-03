'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Trash2, RotateCcw, Check } from 'lucide-react';
import { type Agent, type AgentTool } from '@/lib/ai/agents';
import { type CustomAgent } from '@/hooks/use-projects';

const AVAILABLE_CAPABILITIES = [
  'User research',
  'User interviews',
  'Surveys',
  'Data analysis',
  'Persona creation',
  'Journey mapping',
  'Competitive analysis',
  'UX writing',
  'Microcopy',
  'Content audits',
  'Tone of voice',
  'Wireframing',
  'Prototyping',
  'UI patterns',
  'Design systems',
  'Visual design',
  'Brand design',
  'Style guides',
  'Information architecture',
  'Site mapping',
  'Requirements',
  'User stories',
  'Product strategy',
  'Roadmapping'
];

const AVAILABLE_TOOLS: { id: AgentTool; label: string }[] = [
  { id: 'files', label: 'File Access' },
  { id: 'analyze', label: 'Data Analysis' },
  { id: 'search', label: 'Web Search' },
  { id: 'notion', label: 'Notion Integration' },
  { id: 'uxpilot', label: 'UXPilot Wireframes' },
  { id: 'vibe', label: 'Vibe Prototypes' }
];

interface AgentSettingsModalProps {
  agent: Agent | CustomAgent;
  currentPrompt: string;
  isCustom: boolean;
  onClose: () => void;
  onSave: (newPrompt: string, capabilities?: string[], tools?: AgentTool[]) => void;
  onRemove: () => void;
}

export function AgentSettingsModal({
  agent,
  currentPrompt,
  isCustom,
  onClose,
  onSave,
  onRemove,
}: AgentSettingsModalProps) {
  const [prompt, setPrompt] = useState(currentPrompt);
  const [saving, setSaving] = useState(false);
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>(
    isCustom && 'capabilities' in agent ? (agent as CustomAgent).capabilities || [] : []
  );
  const [selectedTools, setSelectedTools] = useState<AgentTool[]>(
    isCustom && 'tools' in agent ? ((agent as CustomAgent).tools as AgentTool[]) || ['files'] : ['files']
  );

  const originalPrompt = 'capabilities' in agent && !isCustom ? (agent as Agent).systemPrompt : '';
  const hasChanges = prompt !== currentPrompt ||
    (isCustom && (
      JSON.stringify(selectedCapabilities) !== JSON.stringify((agent as CustomAgent).capabilities || []) ||
      JSON.stringify(selectedTools) !== JSON.stringify((agent as CustomAgent).tools || ['files'])
    ));
  const isModified = !isCustom && prompt !== originalPrompt;

  const toggleCapability = (cap: string) => {
    setSelectedCapabilities(prev =>
      prev.includes(cap) ? prev.filter(c => c !== cap) : [...prev, cap]
    );
  };

  const toggleTool = (tool: AgentTool) => {
    setSelectedTools(prev =>
      prev.includes(tool) ? prev.filter(t => t !== tool) : [...prev, tool]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    if (isCustom) {
      await onSave(prompt, selectedCapabilities, selectedTools);
    } else {
      await onSave(prompt);
    }
    setSaving(false);
  };

  const handleReset = () => {
    if ('capabilities' in agent) {
      setPrompt(agent.systemPrompt);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
      <Card className="w-full max-w-2xl p-6 m-4 my-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="text-4xl">
              {isCustom ? agent.avatar : (
                agent.id === 'riley' ? '👩‍🔬' :
                agent.id === 'sam' ? '🎯' :
                agent.id === 'blake' ? '📊' :
                agent.id === 'alex' ? '✏️' :
                agent.id === 'jordan' ? '🎨' : '🤖'
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{agent.name}</h2>
              <p className="text-muted-foreground">{agent.role}</p>
            </div>
          </div>
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: agent.color }}
          />
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="system-prompt">System Prompt</Label>
              {!isCustom && isModified && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="text-muted-foreground"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Obnovit výchozí
                </Button>
              )}
            </div>
            <Textarea
              id="system-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={12}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-2">
              {isCustom
                ? 'Definujte osobnost, znalosti a schopnosti agenta.'
                : 'Upravte chování agenta pro tento projekt. Změny se projeví pouze v tomto projektu.'}
            </p>
          </div>

          {/* Built-in agent capabilities (read-only) */}
          {!isCustom && 'capabilities' in agent && (
            <div>
              <Label>Schopnosti</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {(agent as Agent).capabilities.map((cap) => (
                  <span
                    key={cap}
                    className="px-2 py-1 bg-muted rounded-md text-sm"
                  >
                    {cap}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Built-in agent tools (read-only) */}
          {!isCustom && 'tools' in agent && (
            <div>
              <Label>Nástroje</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {(agent as Agent).tools.map((tool) => (
                  <span
                    key={tool}
                    className="px-2 py-1 bg-primary/10 text-primary rounded-md text-sm"
                  >
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Custom agent capabilities (editable) */}
          {isCustom && (
            <div>
              <Label>Schopnosti</Label>
              <p className="text-xs text-muted-foreground mb-2">Vyberte schopnosti pro tohoto agenta</p>
              <div className="flex flex-wrap gap-2 mt-2 max-h-40 overflow-y-auto p-2 border rounded-lg">
                {AVAILABLE_CAPABILITIES.map((cap) => (
                  <button
                    key={cap}
                    type="button"
                    onClick={() => toggleCapability(cap)}
                    className={`px-2 py-1 rounded-md text-sm flex items-center gap-1 transition-colors ${
                      selectedCapabilities.includes(cap)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {selectedCapabilities.includes(cap) && <Check className="h-3 w-3" />}
                    {cap}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom agent tools (editable) */}
          {isCustom && (
            <div>
              <Label>Nástroje</Label>
              <p className="text-xs text-muted-foreground mb-2">Vyberte nástroje, které může agent používat</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {AVAILABLE_TOOLS.map((tool) => (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => toggleTool(tool.id)}
                    className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-1 transition-colors ${
                      selectedTools.includes(tool.id)
                        ? 'bg-primary/20 text-primary border border-primary'
                        : 'bg-muted hover:bg-muted/80 border border-transparent'
                    }`}
                  >
                    {selectedTools.includes(tool.id) && <Check className="h-3 w-3" />}
                    {tool.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between mt-6">
          <Button
            variant="destructive"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Odebrat z projektu
          </Button>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Zrušit
            </Button>
            <Button onClick={handleSave} disabled={!hasChanges || saving}>
              {saving ? 'Ukládám...' : 'Uložit změny'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
