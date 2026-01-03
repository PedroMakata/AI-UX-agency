'use client';

import { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NotesSidebar } from './notes-sidebar';
import { NoteEditor } from './note-editor';
import { FileText, Loader2 } from 'lucide-react';

interface NotesPanelProps {
  projectId: string;
}

export function NotesPanel({ projectId }: NotesPanelProps) {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [creating, setCreating] = useState(false);

  const handleOpenCreateModal = () => {
    setNewNoteTitle('');
    setShowCreateModal(true);
  };

  const handleCreateNote = async () => {
    if (!newNoteTitle.trim()) return;

    setCreating(true);
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          title: newNoteTitle.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedNoteId(data.note.id);
        setRefreshKey(k => k + 1);
        setShowCreateModal(false);
        setNewNoteTitle('');
      }
    } catch (error) {
      console.error('Failed to create note:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteNote = useCallback(() => {
    setSelectedNoteId(null);
    setRefreshKey(k => k + 1);
  }, []);

  const handleUpdateNote = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  const handleCreateSubpage = useCallback(async (parentId: string) => {
    setCreating(true);
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          title: 'Nova podstranka',
          parentId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedNoteId(data.note.id);
        setRefreshKey(k => k + 1);
      }
    } catch (error) {
      console.error('Failed to create subpage:', error);
    } finally {
      setCreating(false);
    }
  }, [projectId]);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[400px]">
        <div className="md:col-span-1" key={`sidebar-${refreshKey}`}>
          <NotesSidebar
            projectId={projectId}
            selectedNoteId={selectedNoteId}
            onSelectNote={setSelectedNoteId}
            onCreateNote={handleOpenCreateModal}
          />
        </div>

        <div className="md:col-span-2">
          {selectedNoteId ? (
            <NoteEditor
              key={selectedNoteId}
              noteId={selectedNoteId}
              projectId={projectId}
              onDelete={handleDeleteNote}
              onUpdate={handleUpdateNote}
              onCreateSubpage={handleCreateSubpage}
            />
          ) : (
            <Card className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <FileText className="h-12 w-12 mb-4" />
              <p>Vyberte poznamku nebo vytvorte novou</p>
            </Card>
          )}
        </div>
      </div>

      {/* Create Note Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6 m-4">
            <h2 className="text-xl font-bold mb-4">Nova poznamka</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="note-title">Nazev poznamky</Label>
                <Input
                  id="note-title"
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  placeholder="Zadejte nazev..."
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateNote();
                    if (e.key === 'Escape') setShowCreateModal(false);
                  }}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowCreateModal(false)}
                disabled={creating}
              >
                Zrusit
              </Button>
              <Button
                onClick={handleCreateNote}
                disabled={!newNoteTitle.trim() || creating}
              >
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Vytvorit
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
