import { NotionSync } from '@/components/notion/notion-sync';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-4xl">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zpět na Dashboard
          </Button>
        </Link>

        <h1 className="text-4xl font-bold mb-2">Nastavení</h1>
        <p className="text-muted-foreground mb-8">
          Konfigurace API klíčů a integrací
        </p>

        <div className="space-y-6">
          {/* API Keys */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">API Klíče</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="anthropic">Anthropic API Key</Label>
                <Input
                  id="anthropic"
                  type="password"
                  placeholder="sk-ant-..."
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="uxpilot">UX Pilot API Key</Label>
                <Input
                  id="uxpilot"
                  type="password"
                  placeholder="uxp_..."
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="notion">Notion API Key</Label>
                <Input
                  id="notion"
                  type="password"
                  placeholder="secret_..."
                  className="mt-2"
                />
              </div>

              <Button>
                <Save className="mr-2 h-4 w-4" />
                Uložit Klíče
              </Button>
            </div>
          </Card>

          {/* Notion Integration */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Notion Integrace</h2>
            <NotionSync />
          </Card>

          {/* Usage Stats */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Využití API</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Claude API</p>
                <p className="text-2xl font-bold">0 / 10K</p>
                <p className="text-xs text-muted-foreground">tokenů tento měsíc</p>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">UX Pilot</p>
                <p className="text-2xl font-bold">0 / 50</p>
                <p className="text-xs text-muted-foreground">wireframes zbývá</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
