'use client';

import { useState } from 'react';
import { Sparkles, Loader2, Code, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface VibePromptGeneratorProps {
  wireframeData: any;
  onPromptGenerated: (prompt: string) => void;
  onPrototypeCreated: (prototype: any) => void;
}

export function VibePromptGenerator({
  wireframeData,
  onPromptGenerated,
  onPrototypeCreated
}: VibePromptGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [creating, setCreating] = useState(false);
  const [prototype, setPrototype] = useState<any>(null);

  const generatePrompt = async () => {
    setGenerating(true);

    try {
      const response = await fetch('/api/vibe/generate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wireframeData })
      });

      const data = await response.json();
      setPrompt(data.prompt);
      onPromptGenerated(data.prompt);
    } catch (error) {
      console.error('Prompt generation error:', error);
    } finally {
      setGenerating(false);
    }
  };

  const createPrototype = async () => {
    setCreating(true);

    try {
      const response = await fetch('/api/vibe/create-prototype', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      const data = await response.json();
      setPrototype(data);
      onPrototypeCreated(data);
    } catch (error) {
      console.error('Prototype creation error:', error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-purple-500" />
        <h3 className="font-semibold">Vibe AI - Prototype Generator</h3>
      </div>

      {!prompt ? (
        <Button
          onClick={generatePrompt}
          disabled={generating}
          className="w-full"
        >
          {generating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Prompt...
            </>
          ) : (
            <>
              <Code className="mr-2 h-4 w-4" />
              Generate Vibe Prompt
            </>
          )}
        </Button>
      ) : (
        <>
          <div className="space-y-2">
            <Label>Vibe AI Prompt (editable)</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={10}
              className="font-mono text-sm"
            />
          </div>

          {!prototype ? (
            <Button
              onClick={createPrototype}
              disabled={creating}
              className="w-full"
            >
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Prototype...
                </>
              ) : (
                <>
                  <Rocket className="mr-2 h-4 w-4" />
                  Create Live Prototype
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm font-semibold text-green-700 dark:text-green-300">
                  ✅ Prototype Created!
                </p>
                <a
                  href={prototype.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  Open Live Prototype →
                </a>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
