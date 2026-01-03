'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, Loader2, RotateCcw } from 'lucide-react';
import { AGENTS } from '@/lib/ai/agents';

const STORAGE_KEY = 'agent-prompts';

function getStoredPrompts(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : {};
}

function savePrompt(agentId: string, prompt: string) {
  const prompts = getStoredPrompts();
  prompts[agentId] = prompt;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
}

function getPrompt(agentId: string, defaultPrompt: string): string {
  const prompts = getStoredPrompts();
  return prompts[agentId] || defaultPrompt;
}

export default function AgentSettingsPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = use(params);
  const router = useRouter();
  const agent = AGENTS[agentId];

  const [prompt, setPrompt] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (agent) {
      setPrompt(getPrompt(agentId, agent.systemPrompt));
    }
  }, [agentId, agent]);

  if (!agent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Agent nenalezen</h1>
          <Link href="/">
            <Button className="mt-4">Zpět na Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    savePrompt(agentId, prompt);
    await new Promise(resolve => setTimeout(resolve, 500));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setPrompt(agent.systemPrompt);
  };

  const agentEmoji = agentId === 'riley' ? '👩‍🔬' :
                     agentId === 'sam' ? '🎯' :
                     agentId === 'blake' ? '📊' :
                     agentId === 'alex' ? '✏️' :
                     agentId === 'jordan' ? '🎨' : '🤖';

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-4xl">
        <Link href={`/agents/${agentId}`}>
          <Button variant="ghost" size="sm" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zpět na chat
          </Button>
        </Link>

        <div className="flex items-center gap-4 mb-8">
          <span className="text-5xl">{agentEmoji}</span>
          <div>
            <h1 className="text-3xl font-bold">{agent.name} - Nastavení</h1>
            <p className="text-muted-foreground">{agent.role}</p>
          </div>
        </div>

        <Card className="p-6">
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="prompt">System Prompt</Label>
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Obnovit výchozí
                </Button>
              </div>
              <Textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="System prompt pro agenta..."
                rows={20}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Tento prompt určuje osobnost a chování agenta. Změny se projeví v dalších konverzacích.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                {saved && (
                  <span className="text-sm text-green-600">
                    Změny byly uloženy
                  </span>
                )}
              </div>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ukládám...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Uložit změny
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-6 mt-6">
          <h2 className="text-xl font-bold mb-4">Schopnosti agenta</h2>
          <div className="flex flex-wrap gap-2">
            {agent.capabilities.map((capability) => (
              <span
                key={capability}
                className="px-3 py-1 bg-muted rounded-full text-sm"
              >
                {capability}
              </span>
            ))}
          </div>
        </Card>

        <Card className="p-6 mt-6">
          <h2 className="text-xl font-bold mb-4">Dostupné nástroje</h2>
          <div className="flex flex-wrap gap-2">
            {agent.tools.map((tool) => (
              <span
                key={tool}
                className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
              >
                {tool}
              </span>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
