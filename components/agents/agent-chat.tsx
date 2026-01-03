'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Paperclip, X, FileText, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { useNotifications } from '@/components/providers/notification-provider';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachments?: AttachedFile[];
}

interface AttachedFile {
  id: string;
  name: string;
}

interface ProjectFile {
  id: string;
  original_name: string;
  file_type: string;
}

interface AgentChatProps {
  agentId: string;
  agentName: string;
  agentAvatar: string;
  agentColor: string;
  projectId: string;
}

export function AgentChat({
  agentId,
  agentName,
  agentAvatar,
  agentColor,
  projectId
}: AgentChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [typing, setTyping] = useState(false);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<AttachedFile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { markAsRead, markAsUnread } = useNotifications();

  // Normalize text for diacritic-insensitive search
  const normalizeText = (text: string) =>
    text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  // Filter messages by search query
  const filteredMessages = searchQuery
    ? messages.filter(m => normalizeText(m.content).includes(normalizeText(searchQuery)))
    : messages;

  // Load chat history on mount
  useEffect(() => {
    const loadHistory = async () => {
      if (!agentId || !projectId) {
        setLoadingHistory(false);
        return;
      }

      try {
        const res = await fetch(`/api/chat/${agentId}/history?projectId=${projectId}`);
        if (res.ok) {
          const data = await res.json();
          const historyMessages: Message[] = (data.messages || []).map((m: { role: 'user' | 'assistant'; content: string; created_at?: string }, i: number) => ({
            id: `history-${i}`,
            role: m.role,
            content: m.content,
            timestamp: m.created_at ? new Date(m.created_at) : new Date(),
          }));
          setMessages(historyMessages);
        }
      } catch (error) {
        console.error('Failed to load chat history:', error);
      } finally {
        setLoadingHistory(false);
      }
    };

    loadHistory();
  }, [agentId, projectId]);

  // Mark as read when opening chat
  useEffect(() => {
    markAsRead(agentId);
  }, [agentId, markAsRead]);

  // Load project files when file picker is opened
  useEffect(() => {
    if (showFilePicker && projectFiles.length === 0) {
      const loadFiles = async () => {
        try {
          const res = await fetch(`/api/files?projectId=${projectId}`);
          if (res.ok) {
            const data = await res.json();
            setProjectFiles(data.files || []);
          }
        } catch (error) {
          console.error('Failed to load project files:', error);
        }
      };
      loadFiles();
    }
  }, [showFilePicker, projectId, projectFiles.length]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const toggleFileSelection = (file: ProjectFile) => {
    const isSelected = selectedFiles.some(f => f.id === file.id);
    if (isSelected) {
      setSelectedFiles(prev => prev.filter(f => f.id !== file.id));
    } else {
      setSelectedFiles(prev => [...prev, { id: file.id, name: file.original_name }]);
    }
  };

  const removeSelectedFile = (fileId: string) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const sendMessage = async () => {
    if ((!input.trim() && selectedFiles.length === 0) || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
      attachments: selectedFiles.length > 0 ? [...selectedFiles] : undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setSelectedFiles([]);
    setShowFilePicker(false);
    setLoading(true);
    setTyping(true);

    try {
      const response = await fetch(`/api/chat/${agentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          message: input,
          fileIds: userMessage.attachments?.map(f => f.id) || [],
          messages: messages.map(m => ({ role: m.role, content: m.content }))
        })
      });

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message || data.content,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Mark as unread for notification (will show if user navigates away)
      // But immediately mark as read since user is viewing
      markAsUnread(agentId);
      setTimeout(() => markAsRead(agentId), 100);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Omlouvám se, došlo k chybě. Zkus to prosím znovu.',
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
      setTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Card className="flex flex-col h-[calc(100vh-16rem)] min-h-[400px] max-h-[800px] overflow-hidden">
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{agentAvatar}</span>
          <div className="flex-1">
            <h3 className="font-semibold">{agentName}</h3>
            <p className="text-sm text-muted-foreground">
              {typing ? 'Píše...' : 'Online'}
            </p>
          </div>
          <Button
            variant={showSearch ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setShowSearch(!showSearch)}
          >
            <Search className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm">
            Request Deliverable
          </Button>
        </div>
        {showSearch && (
          <div className="mt-3">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Hledat v konverzaci..."
              className="text-sm"
              autoFocus
            />
            {searchQuery && (
              <p className="text-xs text-muted-foreground mt-1">
                Nalezeno {filteredMessages.length} z {messages.length} zprav
              </p>
            )}
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 min-h-0 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {loadingHistory ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p>Začni konverzaci s {agentName}</p>
            </div>
          ) : null}

          {filteredMessages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                {message.attachments && message.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {message.attachments.map((file) => (
                      <span
                        key={file.id}
                        className="inline-flex items-center gap-1 text-xs bg-background/20 rounded px-2 py-0.5"
                      >
                        <FileText className="h-3 w-3" />
                        {file.name}
                      </span>
                    ))}
                  </div>
                )}
                {message.role === 'assistant' ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                    <ReactMarkdown
                      components={{
                        h1: ({ children }) => <h1 className="text-xl font-bold mt-4 mb-2">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-lg font-semibold mt-3 mb-2">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-base font-semibold mt-3 mb-1">{children}</h3>,
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                        li: ({ children }) => <li className="mb-0.5">{children}</li>,
                        strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                        em: ({ children }) => <em className="italic">{children}</em>,
                        code: ({ children }) => <code className="bg-background/50 px-1 py-0.5 rounded text-sm">{children}</code>,
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                )}
                <p className="text-xs opacity-70 mt-1">
                  {message.timestamp.toLocaleTimeString('cs-CZ', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          ))}

          {typing && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-4 py-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t space-y-2">
        {/* Selected Files */}
        {selectedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedFiles.map((file) => (
              <span
                key={file.id}
                className="inline-flex items-center gap-1 text-xs bg-muted rounded-full px-2 py-1"
              >
                <FileText className="h-3 w-3" />
                {file.name}
                <button
                  onClick={() => removeSelectedFile(file.id)}
                  className="hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* File Picker Dropdown */}
        {showFilePicker && (
          <Card className="p-2 max-h-32 overflow-y-auto">
            {projectFiles.length === 0 ? (
              <p className="text-sm text-muted-foreground p-2">Zadne soubory</p>
            ) : (
              <div className="space-y-1">
                {projectFiles.map((file) => {
                  const isSelected = selectedFiles.some(f => f.id === file.id);
                  return (
                    <button
                      key={file.id}
                      onClick={() => toggleFileSelection(file)}
                      className={`w-full text-left text-sm p-2 rounded hover:bg-muted flex items-center gap-2 ${
                        isSelected ? 'bg-primary/10 text-primary' : ''
                      }`}
                    >
                      <FileText className="h-4 w-4" />
                      {file.original_name}
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
        )}

        <div className="flex gap-2">
          <Button
            variant={showFilePicker ? 'secondary' : 'outline'}
            size="icon"
            onClick={() => setShowFilePicker(!showFilePicker)}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Napiš ${agentName}...`}
            disabled={loading}
            className="flex-1"
          />
          <Button
            onClick={sendMessage}
            disabled={(!input.trim() && selectedFiles.length === 0) || loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
