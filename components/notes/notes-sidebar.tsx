'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Plus, ChevronRight, Loader2 } from 'lucide-react';

export interface Note {
  id: string;
  project_id: string;
  parent_id: string | null;
  title: string;
  content: unknown[];
  type: 'page' | 'section';
  order_index: number;
  created_at: string;
  updated_at: string;
}

interface NotesSidebarProps {
  projectId: string;
  selectedNoteId: string | null;
  onSelectNote: (noteId: string | null) => void;
  onCreateNote: () => void;
}

function buildNoteTree(notes: Note[]): Map<string | null, Note[]> {
  const tree = new Map<string | null, Note[]>();

  for (const note of notes) {
    const parentId = note.parent_id;
    if (!tree.has(parentId)) {
      tree.set(parentId, []);
    }
    tree.get(parentId)!.push(note);
  }

  return tree;
}

function NoteItem({
  note,
  tree,
  depth,
  selectedNoteId,
  onSelectNote,
}: {
  note: Note;
  tree: Map<string | null, Note[]>;
  depth: number;
  selectedNoteId: string | null;
  onSelectNote: (noteId: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const children = tree.get(note.id) || [];
  const hasChildren = children.length > 0;
  const isSelected = selectedNoteId === note.id;

  return (
    <div>
      <div
        onClick={() => onSelectNote(note.id)}
        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm hover:bg-muted transition-colors cursor-pointer ${
          isSelected ? 'bg-primary/10 text-primary font-medium' : ''
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="p-0.5 hover:bg-muted-foreground/20 rounded"
          >
            <ChevronRight
              className={`h-3 w-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
            />
          </button>
        )}
        {!hasChildren && <span className="w-4" />}
        <FileText className="h-4 w-4 shrink-0" />
        <span className="truncate">{note.title || 'Untitled'}</span>
      </div>

      {hasChildren && expanded && (
        <div>
          {children.map((child) => (
            <NoteItem
              key={child.id}
              note={child}
              tree={tree}
              depth={depth + 1}
              selectedNoteId={selectedNoteId}
              onSelectNote={onSelectNote}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function NotesSidebar({
  projectId,
  selectedNoteId,
  onSelectNote,
  onCreateNote,
}: NotesSidebarProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const res = await fetch(`/api/notes?projectId=${projectId}`);
        if (res.ok) {
          const data = await res.json();
          setNotes(data.notes || []);
        }
      } catch (error) {
        console.error('Failed to fetch notes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, [projectId]);

  const tree = buildNoteTree(notes);
  const rootNotes = tree.get(null) || [];

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-full">
      <div className="p-3 border-b flex items-center justify-between">
        <h3 className="font-semibold text-sm">Poznamky</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCreateNote}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-2">
        {rootNotes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Zadne poznamky
          </p>
        ) : (
          <div className="space-y-0.5">
            {rootNotes.map((note) => (
              <NoteItem
                key={note.id}
                note={note}
                tree={tree}
                depth={0}
                selectedNoteId={selectedNoteId}
                onSelectNote={onSelectNote}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
}
