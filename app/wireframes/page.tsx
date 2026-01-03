'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Wand2, Loader2, Download, FileText } from 'lucide-react';

export default function WireframesPage() {
  const [description, setDescription] = useState('');
  const [screenType, setScreenType] = useState<'mobile' | 'desktop' | 'tablet'>('desktop');
  const [complexity, setComplexity] = useState<'simple' | 'medium' | 'complex'>('medium');
  const [generating, setGenerating] = useState(false);
  const [wireframe, setWireframe] = useState<any>(null);

  const handleGenerate = async () => {
    if (!description.trim()) return;
    setGenerating(true);

    try {
      const response = await fetch('/api/uxpilot/generate-wireframe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          screenType,
          complexity,
        }),
      });

      const data = await response.json();
      setWireframe(data);
    } catch (error) {
      console.error('Wireframe generation error:', error);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-8">
        <div>
          <h1 className="text-4xl font-bold">Wireframes</h1>
          <p className="text-muted-foreground mt-2">
            Generujte wireframes pomocí UX Pilot AI
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 space-y-6">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Nastavení</h2>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Popis obrazovky</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Popište obrazovku, kterou chcete vytvořit..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Typ obrazovky</Label>
              <RadioGroup value={screenType} onValueChange={(v: any) => setScreenType(v)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="mobile" id="mobile" />
                  <Label htmlFor="mobile">Mobile</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="desktop" id="desktop" />
                  <Label htmlFor="desktop">Desktop</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="tablet" id="tablet" />
                  <Label htmlFor="tablet">Tablet</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Komplexita</Label>
              <RadioGroup value={complexity} onValueChange={(v: any) => setComplexity(v)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="simple" id="simple" />
                  <Label htmlFor="simple">Jednoduchá</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="medium" id="medium" />
                  <Label htmlFor="medium">Střední</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="complex" id="complex" />
                  <Label htmlFor="complex">Komplexní</Label>
                </div>
              </RadioGroup>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={generating || !description.trim()}
              className="w-full"
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generuji...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Generovat Wireframe
                </>
              )}
            </Button>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Wand2 className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Výsledek</h2>
            </div>

            {wireframe ? (
              <div className="space-y-4">
                <div className="border rounded-lg overflow-hidden">
                  <img
                    src={wireframe.imageUrl}
                    alt="Generated wireframe"
                    className="w-full"
                  />
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1">
                    <Download className="mr-2 h-4 w-4" />
                    Stáhnout PNG
                  </Button>
                  <Button variant="outline" className="flex-1">
                    Export do Figma
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  onClick={() => setWireframe(null)}
                  className="w-full"
                >
                  Generovat nový
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">
                  Wireframe se zobrazí zde
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
