'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, FolderPlus } from 'lucide-react';
import Link from 'next/link';

export default function NewProjectPage() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    client_name: '',
    client_email: '',
  });

  const handleCreateProject = async () => {
    if (!newProject.name.trim()) return;

    setCreating(true);
    setError(null);

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create project');
      }

      router.push(`/projects/${data.project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-2xl">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zpět na Dashboard
          </Button>
        </Link>

        <Card className="p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-primary/10 rounded-lg">
              <FolderPlus className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Nový Projekt</h1>
              <p className="text-muted-foreground">Vytvořte nový projekt pro váš tým</p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-destructive/10 text-destructive rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <Label htmlFor="name">Název projektu *</Label>
              <Input
                id="name"
                value={newProject.name}
                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                placeholder="Název vašeho projektu"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="description">Popis</Label>
              <Textarea
                id="description"
                value={newProject.description}
                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                placeholder="Stručný popis projektu"
                rows={4}
                className="mt-2"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="client_name">Jméno klienta</Label>
                <Input
                  id="client_name"
                  value={newProject.client_name}
                  onChange={(e) => setNewProject({ ...newProject, client_name: e.target.value })}
                  placeholder="Jméno klienta (volitelné)"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="client_email">Email klienta</Label>
                <Input
                  id="client_email"
                  type="email"
                  value={newProject.client_email}
                  onChange={(e) => setNewProject({ ...newProject, client_email: e.target.value })}
                  placeholder="email@klient.cz"
                  className="mt-2"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8 pt-6 border-t">
            <Button
              variant="outline"
              onClick={() => router.push('/')}
              disabled={creating}
            >
              Zrušit
            </Button>
            <Button
              onClick={handleCreateProject}
              disabled={!newProject.name.trim() || creating}
            >
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Vytvořit projekt
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
