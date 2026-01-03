'use client';

import { useState, useEffect, useCallback, useRef, KeyboardEvent } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  Save,
  Trash2,
  FileUp,
  X,
  CheckSquare,
  FileText,
  AlertTriangle,
  Type,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListChecks,
  Sparkles,
  Plus,
  GripVertical,
  ChevronRight,
  ChevronDown,
  Code,
  Quote,
  AlertCircle,
  Columns2,
  Columns3,
  LayoutGrid,
  FileSymlink,
  ToggleLeft,
  Maximize2,
  Minimize2
} from 'lucide-react';
import type { Note } from './notes-sidebar';

interface NoteEditorProps {
  noteId: string;
  projectId: string;
  onDelete: () => void;
  onUpdate: () => void;
  onCreateSubpage?: (parentId: string) => void;
}

type BlockType =
  | 'text' | 'heading1' | 'heading2' | 'heading3'
  | 'bullet' | 'numbered' | 'todo' | 'toggle'
  | 'code' | 'quote' | 'callout'
  | 'page' | 'synced'
  | 'toggle-h1' | 'toggle-h2' | 'toggle-h3'
  | 'columns-2' | 'columns-3' | 'columns-4' | 'columns-5'
  | 'image' | 'file';

interface ContentBlock {
  id: string;
  type: BlockType;
  content: string;
  url?: string;
  fileName?: string;
  checked?: boolean;
  collapsed?: boolean;
  children?: ContentBlock[];
  columns?: ContentBlock[][];
  numbered?: number;
}

const BLOCK_MENU = [
  { category: 'Basic', items: [
    { type: 'text', label: 'Text', icon: Type, desc: 'Plain text' },
    { type: 'heading1', label: 'Heading 1', icon: Heading1, desc: 'Large heading' },
    { type: 'heading2', label: 'Heading 2', icon: Heading2, desc: 'Medium heading' },
    { type: 'heading3', label: 'Heading 3', icon: Heading3, desc: 'Small heading' },
  ]},
  { category: 'Pages', items: [
    { type: 'page', label: 'Page', icon: FileText, desc: 'Create subpage' },
    { type: 'synced', label: 'Synced block', icon: FileSymlink, desc: 'Synced content' },
  ]},
  { category: 'Lists', items: [
    { type: 'bullet', label: 'Bulleted list', icon: List, desc: 'Simple list' },
    { type: 'numbered', label: 'Numbered list', icon: ListOrdered, desc: 'Ordered list' },
    { type: 'todo', label: 'To-do list', icon: ListChecks, desc: 'Checkboxes' },
    { type: 'toggle', label: 'Toggle list', icon: ToggleLeft, desc: 'Collapsible' },
  ]},
  { category: 'Advanced', items: [
    { type: 'code', label: 'Code', icon: Code, desc: 'Code block' },
    { type: 'quote', label: 'Quote', icon: Quote, desc: 'Quotation' },
    { type: 'callout', label: 'Callout', icon: AlertCircle, desc: 'Highlight' },
  ]},
  { category: 'Toggle Headings', items: [
    { type: 'toggle-h1', label: 'Toggle H1', icon: Heading1, desc: 'Collapsible H1' },
    { type: 'toggle-h2', label: 'Toggle H2', icon: Heading2, desc: 'Collapsible H2' },
    { type: 'toggle-h3', label: 'Toggle H3', icon: Heading3, desc: 'Collapsible H3' },
  ]},
  { category: 'Layout', items: [
    { type: 'columns-2', label: '2 Columns', icon: Columns2, desc: 'Two columns' },
    { type: 'columns-3', label: '3 Columns', icon: Columns3, desc: 'Three columns' },
    { type: 'columns-4', label: '4 Columns', icon: LayoutGrid, desc: 'Four columns' },
    { type: 'columns-5', label: '5 Columns', icon: LayoutGrid, desc: 'Five columns' },
  ]},
];

export function NoteEditor({ noteId, projectId, onDelete, onUpdate, onCreateSubpage }: NoteEditorProps) {
  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showExpandedModal, setShowExpandedModal] = useState(false);
  const [structuring, setStructuring] = useState(false);
  const [activeMenuBlockId, setActiveMenuBlockId] = useState<string | null>(null);
  const [menuFilter, setMenuFilter] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const blockRefs = useRef<Map<string, HTMLInputElement | HTMLTextAreaElement>>(new Map());

  useEffect(() => {
    const fetchNote = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/notes/${noteId}`);
        if (res.ok) {
          const data = await res.json();
          setNote(data.note);
          setTitle(data.note.title || '');
          const contentBlocks = Array.isArray(data.note.content)
            ? data.note.content as ContentBlock[]
            : [];
          if (contentBlocks.length === 0) {
            const initialBlock = { id: Date.now().toString(), type: 'text' as const, content: '' };
            setBlocks([initialBlock]);
            setTimeout(() => focusBlock(initialBlock.id), 100);
          } else {
            setBlocks(contentBlocks);
          }
        }
      } catch (error) {
        console.error('Failed to fetch note:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchNote();
  }, [noteId]);

  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) await uploadImage(file);
          break;
        }
      }
    };
    const editor = editorRef.current;
    if (editor) {
      editor.addEventListener('paste', handlePaste);
      return () => editor.removeEventListener('paste', handlePaste);
    }
  }, [projectId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (activeMenuBlockId && !(e.target as Element).closest('.block-menu')) {
        setActiveMenuBlockId(null);
        setMenuFilter('');
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeMenuBlockId]);

  const focusBlock = (blockId: string, position: 'start' | 'end' = 'end') => {
    setTimeout(() => {
      const el = blockRefs.current.get(blockId);
      if (el) {
        el.focus();
        if ('setSelectionRange' in el) {
          const len = position === 'end' ? el.value.length : 0;
          el.setSelectionRange(len, len);
        }
      }
    }, 0);
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectId', projectId);
      const res = await fetch('/api/files/upload', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        setBlocks(prev => [...prev, {
          id: Date.now().toString(),
          type: 'image',
          content: file.name,
          url: data.file.public_url,
          fileName: file.name,
        }]);
      }
    } catch (error) {
      console.error('Failed to upload image:', error);
    } finally {
      setUploading(false);
    }
  };

  const saveNote = useCallback(async () => {
    setSaving(true);
    try {
      await fetch(`/api/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content: blocks }),
      });
      onUpdate();
    } catch (error) {
      console.error('Failed to save note:', error);
    } finally {
      setSaving(false);
    }
  }, [noteId, title, blocks, onUpdate]);

  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveNote(), 1000);
  }, [saveNote]);

  const handleDeleteNote = async () => {
    setDeleting(true);
    try {
      await fetch(`/api/notes/${noteId}`, { method: 'DELETE' });
      onDelete();
    } catch (error) {
      console.error('Failed to delete note:', error);
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const structureWithAI = async () => {
    const allText = blocks.filter(b => !['image', 'file'].includes(b.type)).map(b => b.content).filter(c => c.trim()).join('\n');
    if (!allText.trim()) return;
    setStructuring(true);
    try {
      const res = await fetch('/api/notes/structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: allText }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.blocks?.length > 0) {
          const mediaBlocks = blocks.filter(b => ['image', 'file'].includes(b.type));
          setBlocks([...data.blocks, ...mediaBlocks]);
          debouncedSave();
        }
      }
    } catch (error) {
      console.error('Failed to structure with AI:', error);
    } finally {
      setStructuring(false);
    }
  };

  const updateBlock = (blockId: string, updates: Partial<ContentBlock>) => {
    setBlocks(prev => prev.map(block => block.id === blockId ? { ...block, ...updates } : block));
    debouncedSave();
  };

  const transformBlock = (blockId: string, newType: BlockType) => {
    // Handle page transformation - call outside of setBlocks to avoid setState during render
    if (newType === 'page' && onCreateSubpage) {
      onCreateSubpage(noteId);
      setActiveMenuBlockId(null);
      setMenuFilter('');
      return;
    }

    setBlocks(prev => prev.map(block => {
      if (block.id !== blockId) return block;

      // Handle columns transformation
      if (newType.startsWith('columns-')) {
        const numCols = parseInt(newType.split('-')[1]);
        const columns: ContentBlock[][] = Array(numCols).fill(null).map((_, i) =>
          i === 0 ? [{ id: `${Date.now()}-0`, type: 'text', content: block.content }] : []
        );
        return { ...block, type: newType, columns, content: '' };
      }

      // Handle toggle transformation
      if (newType === 'toggle' || newType.startsWith('toggle-h')) {
        return { ...block, type: newType, collapsed: false, children: [] };
      }

      // Handle numbered list
      if (newType === 'numbered') {
        const index = prev.findIndex(b => b.id === blockId);
        let num = 1;
        for (let i = index - 1; i >= 0; i--) {
          if (prev[i].type === 'numbered') {
            num = (prev[i].numbered || 0) + 1;
            break;
          } else break;
        }
        return { ...block, type: newType, numbered: num };
      }

      return { ...block, type: newType };
    }));
    setActiveMenuBlockId(null);
    setMenuFilter('');
    debouncedSave();
  };

  const addBlockAfter = (afterBlockId: string, type: BlockType = 'text') => {
    const newBlock: ContentBlock = { id: Date.now().toString(), type, content: '' };
    setBlocks(prev => {
      const index = prev.findIndex(b => b.id === afterBlockId);
      const newBlocks = [...prev];
      newBlocks.splice(index + 1, 0, newBlock);
      return newBlocks;
    });
    focusBlock(newBlock.id, 'start');
    debouncedSave();
  };

  const removeBlock = (blockId: string) => {
    const index = blocks.findIndex(b => b.id === blockId);
    if (blocks.length <= 1) return null;
    setBlocks(prev => prev.filter(b => b.id !== blockId));
    debouncedSave();
    return index > 0 ? blocks[index - 1].id : blocks[1]?.id;
  };

  const mergeWithPreviousBlock = (blockId: string) => {
    const index = blocks.findIndex(b => b.id === blockId);
    if (index <= 0) return;
    const currentBlock = blocks[index];
    const previousBlock = blocks[index - 1];
    if (['image', 'file'].includes(previousBlock.type)) return;
    const cursorPosition = previousBlock.content.length;
    setBlocks(prev => {
      const newBlocks = [...prev];
      newBlocks[index - 1] = { ...previousBlock, content: previousBlock.content + currentBlock.content };
      newBlocks.splice(index, 1);
      return newBlocks;
    });
    setTimeout(() => {
      const el = blockRefs.current.get(previousBlock.id);
      if (el && 'setSelectionRange' in el) {
        el.focus();
        el.setSelectionRange(cursorPosition, cursorPosition);
      }
    }, 0);
    debouncedSave();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>, block: ContentBlock) => {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    const cursorPos = target.selectionStart || 0;
    const content = block.content;

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const before = content.substring(0, cursorPos);
      const after = content.substring(cursorPos);
      updateBlock(block.id, { content: before });

      // Continue same type for lists
      const continueTypes: BlockType[] = ['bullet', 'numbered', 'todo'];
      const newType = continueTypes.includes(block.type) ? block.type : 'text';

      const newBlock: ContentBlock = { id: Date.now().toString(), type: newType, content: after };
      if (newType === 'numbered') {
        newBlock.numbered = (block.numbered || 0) + 1;
      }
      setBlocks(prev => {
        const index = prev.findIndex(b => b.id === block.id);
        const newBlocks = [...prev];
        newBlocks.splice(index + 1, 0, newBlock);
        return newBlocks;
      });
      focusBlock(newBlock.id, 'start');
      return;
    }

    if (e.key === 'Backspace' && cursorPos === 0 && target.selectionEnd === 0) {
      e.preventDefault();
      if (content === '' && blocks.length > 1) {
        const prevId = removeBlock(block.id);
        if (prevId) focusBlock(prevId, 'end');
      } else if (content === '' && block.type !== 'text') {
        transformBlock(block.id, 'text');
      } else {
        mergeWithPreviousBlock(block.id);
      }
      return;
    }

    if (e.key === 'ArrowUp' && cursorPos === 0) {
      const index = blocks.findIndex(b => b.id === block.id);
      if (index > 0) {
        e.preventDefault();
        focusBlock(blocks[index - 1].id, 'end');
      }
    }

    if (e.key === 'ArrowDown' && cursorPos === content.length) {
      const index = blocks.findIndex(b => b.id === block.id);
      if (index < blocks.length - 1) {
        e.preventDefault();
        focusBlock(blocks[index + 1].id, 'start');
      }
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, block: ContentBlock) => {
    const value = e.target.value;
    updateBlock(block.id, { content: value });

    // Markdown shortcuts
    if (value === '# ') { transformBlock(block.id, 'heading1'); updateBlock(block.id, { content: '' }); }
    else if (value === '## ') { transformBlock(block.id, 'heading2'); updateBlock(block.id, { content: '' }); }
    else if (value === '### ') { transformBlock(block.id, 'heading3'); updateBlock(block.id, { content: '' }); }
    else if (value === '- ' || value === '* ') { transformBlock(block.id, 'bullet'); updateBlock(block.id, { content: '' }); }
    else if (value === '1. ') { transformBlock(block.id, 'numbered'); updateBlock(block.id, { content: '', numbered: 1 }); }
    else if (value === '[] ' || value === '[ ] ') { transformBlock(block.id, 'todo'); updateBlock(block.id, { content: '' }); }
    else if (value === '> ') { transformBlock(block.id, 'quote'); updateBlock(block.id, { content: '' }); }
    else if (value === '```') { transformBlock(block.id, 'code'); updateBlock(block.id, { content: '' }); }
  };

  const getBlockStyle = (type: BlockType) => {
    switch (type) {
      case 'heading1': case 'toggle-h1': return 'text-3xl font-bold';
      case 'heading2': case 'toggle-h2': return 'text-2xl font-semibold';
      case 'heading3': case 'toggle-h3': return 'text-xl font-medium';
      case 'code': return 'font-mono bg-muted p-2 rounded';
      case 'quote': return 'border-l-4 border-muted-foreground/30 pl-4 italic';
      case 'callout': return 'bg-primary/5 border border-primary/20 rounded-lg p-3';
      default: return '';
    }
  };

  const renderBlockPrefix = (block: ContentBlock) => {
    switch (block.type) {
      case 'bullet':
        return <span className="text-muted-foreground mr-2">•</span>;
      case 'numbered':
        return <span className="text-muted-foreground mr-2 min-w-[1.5rem]">{block.numbered || 1}.</span>;
      case 'todo':
        return (
          <button
            onClick={() => updateBlock(block.id, { checked: !block.checked })}
            className={`mr-2 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
              block.checked ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/50 hover:border-primary'
            }`}
          >
            {block.checked && <CheckSquare className="h-3 w-3" />}
          </button>
        );
      case 'toggle':
      case 'toggle-h1':
      case 'toggle-h2':
      case 'toggle-h3':
        return (
          <button
            onClick={() => updateBlock(block.id, { collapsed: !block.collapsed })}
            className="mr-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            {block.collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        );
      case 'callout':
        return <AlertCircle className="h-5 w-5 mr-2 text-primary shrink-0" />;
      default:
        return null;
    }
  };

  const renderBlock = (block: ContentBlock, index: number) => {
    const isMediaBlock = ['image', 'file'].includes(block.type);
    const isColumnsBlock = block.type.startsWith('columns-');

    return (
      <div key={block.id} className="group relative flex items-start gap-1 py-0.5">
        {/* Plus button and drag handle */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 -ml-14 w-12 justify-end">
          <button className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded cursor-grab">
            <GripVertical className="h-3 w-3" />
          </button>
          <div className="relative block-menu">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenuBlockId(activeMenuBlockId === block.id ? null : block.id);
                setMenuFilter('');
              }}
              className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded"
            >
              <Plus className="h-4 w-4" />
            </button>

            {/* Block menu */}
            {activeMenuBlockId === block.id && (
              <div className="absolute left-0 top-full mt-1 bg-background border rounded-lg shadow-lg z-50 w-80 max-h-[70vh] overflow-y-auto">
                <div className="p-2 border-b sticky top-0 bg-background">
                  <input
                    type="text"
                    value={menuFilter}
                    onChange={(e) => setMenuFilter(e.target.value)}
                    placeholder="Filter..."
                    className="w-full px-2 py-1 text-sm bg-muted rounded border-none outline-none"
                    autoFocus
                  />
                </div>
                {BLOCK_MENU.map(category => {
                  const filteredItems = category.items.filter(item =>
                    item.label.toLowerCase().includes(menuFilter.toLowerCase()) ||
                    item.type.includes(menuFilter.toLowerCase())
                  );
                  if (filteredItems.length === 0) return null;
                  return (
                    <div key={category.category}>
                      <div className="px-3 py-1 text-xs text-muted-foreground font-medium">{category.category}</div>
                      {filteredItems.map(item => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.type}
                            onClick={() => transformBlock(block.id, item.type as BlockType)}
                            className="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-muted text-sm"
                          >
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <span>{item.label}</span>
                            <span className="text-xs text-muted-foreground ml-auto">{item.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Block content */}
        <div className="flex-1 min-w-0">
          {isColumnsBlock ? (
            <div className={`grid gap-4 ${
              block.type === 'columns-2' ? 'grid-cols-2' :
              block.type === 'columns-3' ? 'grid-cols-3' :
              block.type === 'columns-4' ? 'grid-cols-4' : 'grid-cols-5'
            }`}>
              {block.columns?.map((col, colIndex) => (
                <div key={colIndex} className="border border-dashed border-muted-foreground/20 rounded p-2 min-h-[60px]">
                  {col.length === 0 ? (
                    <span className="text-muted-foreground text-sm">Column {colIndex + 1}</span>
                  ) : (
                    col.map(c => <div key={c.id}>{c.content}</div>)
                  )}
                </div>
              ))}
            </div>
          ) : isMediaBlock ? (
            <div className="relative">
              {block.type === 'image' && block.url && (
                <img src={block.url} alt={block.fileName || ''} className="max-w-full rounded-lg border" />
              )}
              {block.type === 'file' && (
                <a href={block.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-muted rounded-lg hover:bg-muted/80">
                  <FileUp className="h-5 w-5" />
                  <span>{block.fileName}</span>
                </a>
              )}
              <button
                onClick={() => removeBlock(block.id)}
                className="absolute -right-2 -top-2 opacity-0 group-hover:opacity-100 bg-destructive text-destructive-foreground rounded-full p-1"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className={`flex items-start ${getBlockStyle(block.type)}`}>
              {renderBlockPrefix(block)}
              {block.type === 'code' ? (
                <textarea
                  ref={el => { if (el) blockRefs.current.set(block.id, el); }}
                  value={block.content}
                  onChange={(e) => handleInput(e, block)}
                  onKeyDown={(e) => handleKeyDown(e, block)}
                  placeholder="Code..."
                  className="flex-1 bg-transparent border-none outline-none resize-none min-h-[60px] font-mono text-sm"
                  rows={3}
                />
              ) : (
                <input
                  ref={el => { if (el) blockRefs.current.set(block.id, el); }}
                  type="text"
                  value={block.content}
                  onChange={(e) => handleInput(e, block)}
                  onKeyDown={(e) => handleKeyDown(e, block)}
                  placeholder={index === 0 ? "Type '/' for commands..." : ""}
                  className={`flex-1 bg-transparent border-none outline-none py-0.5 ${
                    block.checked ? 'line-through text-muted-foreground' : ''
                  }`}
                />
              )}
            </div>
          )}

          {/* Toggle children */}
          {(block.type === 'toggle' || block.type.startsWith('toggle-h')) && !block.collapsed && (
            <div className="ml-6 mt-1 border-l-2 border-muted pl-3">
              {block.children?.length ? (
                block.children.map((child, i) => renderBlock(child, i))
              ) : (
                <span className="text-muted-foreground text-sm">Empty. Click to add content.</span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="p-6 h-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  if (!note) {
    return (
      <Card className="p-6 h-full flex items-center justify-center">
        <p className="text-muted-foreground">Poznamka nenalezena</p>
      </Card>
    );
  }

  return (
    <>
      <Card className="flex flex-col h-full" ref={editorRef}>
        <div className="p-4 border-b flex items-center justify-between gap-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => title !== note?.title && saveNote()}
            placeholder="Untitled"
            className="text-xl font-bold border-none shadow-none focus-visible:ring-0 px-0"
          />
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setShowExpandedModal(true)} title="Rozsirit">
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={structureWithAI} disabled={structuring} title="AI Structure" className="text-primary">
              {structuring ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            </Button>
            {onCreateSubpage && (
              <Button variant="outline" size="sm" onClick={() => onCreateSubpage(noteId)} title="Subpage">
                <FileText className="h-4 w-4" />
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
            </Button>
            <input ref={fileInputRef} type="file" className="hidden" onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) await uploadImage(file);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }} accept="image/*,.pdf,.doc,.docx" />
            <Button variant="outline" size="sm" onClick={saveNote} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowDeleteModal(true)} className="text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pl-16">
          <div className="max-w-3xl mx-auto space-y-0">
            {blocks.map((block, index) => renderBlock(block, index))}
          </div>
        </div>

        <div className="p-2 border-t text-xs text-muted-foreground text-center">
          <kbd className="px-1 bg-muted rounded">/</kbd> commands
          <span className="mx-2">•</span>
          <kbd className="px-1 bg-muted rounded">#</kbd> heading
          <span className="mx-2">•</span>
          <kbd className="px-1 bg-muted rounded">-</kbd> list
          <span className="mx-2">•</span>
          Click <Plus className="h-3 w-3 inline" /> to transform block
        </div>
      </Card>

      {/* Expanded Modal */}
      {showExpandedModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-5xl h-[90vh] flex flex-col">
            <div className="p-4 border-b flex items-center justify-between gap-4">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => title !== note?.title && saveNote()}
                placeholder="Untitled"
                className="text-2xl font-bold border-none shadow-none focus-visible:ring-0 px-0"
              />
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={structureWithAI} disabled={structuring} title="AI Structure" className="text-primary">
                  {structuring ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                </Button>
                {onCreateSubpage && (
                  <Button variant="outline" size="sm" onClick={() => onCreateSubpage(noteId)} title="Subpage">
                    <FileText className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                </Button>
                <Button variant="outline" size="sm" onClick={saveNote} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowExpandedModal(false)} title="Zavrit">
                  <Minimize2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 pl-20">
              <div className="max-w-4xl mx-auto space-y-0">
                {blocks.map((block, index) => renderBlock(block, index))}
              </div>
            </div>

            <div className="p-3 border-t text-xs text-muted-foreground text-center">
              <kbd className="px-1.5 py-0.5 bg-muted rounded">/</kbd> commands
              <span className="mx-3">•</span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded">#</kbd> heading
              <span className="mx-3">•</span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded">-</kbd> list
              <span className="mx-3">•</span>
              Click <Plus className="h-3 w-3 inline" /> to transform block
            </div>
          </Card>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6 m-4">
            <div className="flex items-center gap-3 text-destructive mb-4">
              <AlertTriangle className="h-8 w-8" />
              <h2 className="text-xl font-bold">Delete note</h2>
            </div>
            <p className="text-muted-foreground mb-6">Are you sure? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteNote} disabled={deleting}>
                {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
