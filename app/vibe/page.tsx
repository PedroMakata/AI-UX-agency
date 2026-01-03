'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sparkles, Loader2, Code, Rocket, Palette } from 'lucide-react';

export default function VibePage() {
  const [prompt, setPrompt] = useState('');
  const [creating, setCreating] = useState(false);
  const [prototype, setPrototype] = useState<any>(null);

  const createPrototype = async () => {
    if (!prompt.trim()) return;
    setCreating(true);

    try {
      const response = await fetch('/api/vibe/create-prototype', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();
      setPrototype(data);
    } catch (error) {
      console.error('Prototype creation error:', error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-8">
        <div>
          <h1 className="text-4xl font-bold">Vibe AI</h1>
          <p className="text-muted-foreground mt-2">
            Vytvářejte živé prototypy pomocí Vibe AI
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 space-y-6">
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-purple-500" />
              <h2 className="text-xl font-semibold">Prompt</h2>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prompt">Vibe AI Prompt</Label>
              <Textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Popište prototyp, který chcete vytvořit..."
                rows={12}
                className="font-mono text-sm"
              />
            </div>

            <Button
              onClick={createPrototype}
              disabled={creating || !prompt.trim()}
              className="w-full"
            >
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Vytvářím prototyp...
                </>
              ) : (
                <>
                  <Rocket className="mr-2 h-4 w-4" />
                  Vytvořit Live Prototyp
                </>
              )}
            </Button>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-purple-500" />
              <h2 className="text-xl font-semibold">Prototyp</h2>
            </div>

            {prototype ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm font-semibold text-green-700 dark:text-green-300">
                    Prototyp vytvořen!
                  </p>
                  <a
                    href={prototype.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Otevřít Live Prototyp
                  </a>
                </div>

                {prototype.preview && (
                  <div className="border rounded-lg overflow-hidden">
                    <iframe
                      src={prototype.url}
                      className="w-full h-96"
                      title="Prototype Preview"
                    />
                  </div>
                )}

                <Button
                  variant="ghost"
                  onClick={() => setPrototype(null)}
                  className="w-full"
                >
                  Vytvořit nový prototyp
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
                <div className="text-center">
                  <Code className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">
                    Prototyp se zobrazí zde
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
