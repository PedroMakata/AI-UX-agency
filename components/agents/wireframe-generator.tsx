'use client';

import { useState } from 'react';
import { Wand2, Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface WireframeGeneratorProps {
  description: string;
  onGenerate: (wireframe: any) => void;
}

export function WireframeGenerator({ description, onGenerate }: WireframeGeneratorProps) {
  const [screenType, setScreenType] = useState<'mobile' | 'desktop' | 'tablet'>('desktop');
  const [complexity, setComplexity] = useState<'simple' | 'medium' | 'complex'>('medium');
  const [generating, setGenerating] = useState(false);
  const [wireframe, setWireframe] = useState<any>(null);

  const handleGenerate = async () => {
    setGenerating(true);

    try {
      const response = await fetch('/api/uxpilot/generate-wireframe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          screenType,
          complexity
        })
      });

      const data = await response.json();
      setWireframe(data);
      onGenerate(data);
    } catch (error) {
      console.error('Wireframe generation error:', error);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Wand2 className="h-5 w-5" />
        <h3 className="font-semibold">UX Pilot - Wireframe Generator</h3>
      </div>

      {!wireframe ? (
        <>
          <div className="space-y-2">
            <Label>Screen Type</Label>
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
            <Label>Complexity</Label>
            <RadioGroup value={complexity} onValueChange={(v: any) => setComplexity(v)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="simple" id="simple" />
                <Label htmlFor="simple">Simple</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="medium" id="medium" />
                <Label htmlFor="medium">Medium</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="complex" id="complex" />
                <Label htmlFor="complex">Complex</Label>
              </div>
            </RadioGroup>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full"
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                Generate Wireframe
              </>
            )}
          </Button>
        </>
      ) : (
        <>
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
              Download PNG
            </Button>
            <Button variant="outline" className="flex-1">
              Export to Figma
            </Button>
          </div>

          <Button
            variant="ghost"
            onClick={() => setWireframe(null)}
            className="w-full"
          >
            Generate New
          </Button>
        </>
      )}
    </Card>
  );
}
