'use client';

import { useState, useCallback } from 'react';
import { Upload, X, Loader2, AlertCircle, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';

interface FileUploadProps {
  projectId: string;
  onUploadComplete?: () => void;
}

const MAX_FILE_SIZE = 100 * 1024 * 1024;
const MAX_FILE_SIZE_MB = 100;
const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.mp4', '.mp3', '.wav', '.txt', '.jpg', '.jpeg', '.png', '.gif', '.webp'];

interface FileError {
  fileName: string;
  error: string;
  suggestion: string;
}

interface DuplicateInfo {
  file: File;
  originalName: string;
  suggestedName: string;
}

export function FileUpload({ projectId, onUploadComplete }: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [errorModal, setErrorModal] = useState<FileError | null>(null);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [duplicateModal, setDuplicateModal] = useState<DuplicateInfo | null>(null);
  const [customName, setCustomName] = useState('');

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const validateFile = (file: File): FileError | null => {
    if (file.size > MAX_FILE_SIZE) {
      return {
        fileName: file.name,
        error: 'Soubor je prilis velky (' + formatFileSize(file.size) + ')',
        suggestion: 'Max velikost je ' + MAX_FILE_SIZE_MB + 'MB. Zkomprimujte soubor.',
      };
    }
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return {
        fileName: file.name,
        error: 'Nepodporovany format (' + ext + ')',
        suggestion: 'Formaty: ' + ALLOWED_EXTENSIONS.join(', '),
      };
    }
    return null;
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  }, []);

  const processFiles = useCallback((newFiles: File[]) => {
    for (const file of newFiles) {
      const error = validateFile(file);
      if (error) { setErrorModal(error); return; }
    }
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    processFiles(Array.from(e.dataTransfer.files));
  }, [processFiles]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  const removeFile = (i: number) => setFiles(prev => prev.filter((_, idx) => idx !== i));

  // Upload single file with optional rename strategy
  const uploadSingleFile = async (
    file: File,
    renameStrategy?: 'auto' | 'custom',
    customFileName?: string
  ): Promise<{ success: boolean; isDuplicate?: boolean; data?: DuplicateInfo }> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', projectId);
    if (renameStrategy) formData.append('renameStrategy', renameStrategy);
    if (customFileName) formData.append('customName', customFileName);

    const res = await fetch('/api/files/upload', { method: 'POST', body: formData });
    const data = await res.json();

    if (res.status === 409 && data.isDuplicate) {
      return {
        success: false,
        isDuplicate: true,
        data: {
          file,
          originalName: data.originalName,
          suggestedName: data.suggestedName
        }
      };
    }

    return { success: res.ok };
  };

  const uploadFiles = async () => {
    if (!files.length || !projectId) return;
    setUploading(true); setProgress(0); setUploadErrors([]);
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const result = await uploadSingleFile(file);

        if (result.isDuplicate && result.data) {
          // Show duplicate modal and pause upload
          setDuplicateModal(result.data);
          setCustomName(result.data.suggestedName.replace(/\.[^/.]+$/, '')); // Set suggested name without extension
          setUploading(false);
          // Keep remaining files for later
          setFiles(files.slice(i));
          return;
        }

        if (!result.success) {
          errors.push(file.name + ': Upload failed');
        }
        setProgress(((i + 1) / files.length) * 100);
      } catch {
        errors.push(file.name + ': Error');
      }
    }

    setUploading(false); setFiles([]); setProgress(0);
    if (errors.length) setUploadErrors(errors);
    onUploadComplete?.();
  };

  // Handle duplicate resolution
  const handleDuplicateResolve = async (action: 'auto' | 'custom' | 'skip') => {
    if (!duplicateModal) return;

    const { file } = duplicateModal;
    setDuplicateModal(null);

    if (action === 'skip') {
      // Remove the file and continue with remaining
      setFiles(prev => prev.slice(1));
      if (files.length > 1) {
        uploadFiles();
      }
      return;
    }

    setUploading(true);

    try {
      const result = await uploadSingleFile(
        file,
        action,
        action === 'custom' ? customName : undefined
      );

      if (!result.success) {
        setUploadErrors(prev => [...prev, file.name + ': Upload failed']);
      }
    } catch {
      setUploadErrors(prev => [...prev, file.name + ': Error']);
    }

    // Remove processed file and continue with remaining
    setFiles(prev => prev.slice(1));
    setUploading(false);

    // Continue with remaining files
    if (files.length > 1) {
      setTimeout(() => uploadFiles(), 100);
    } else {
      onUploadComplete?.();
    }
  };

  const icon = (f: File) => {
    const e = f.name.split('.').pop()?.toLowerCase();
    if (e === 'mp4') return '🎬';
    if (e === 'mp3' || e === 'wav') return '🎵';
    if (e === 'pdf') return '📄';
    if (e === 'docx') return '📝';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(e || '')) return '🖼️';
    return '📁';
  };

  return (
    <>
      <Card className="p-4">
        <div className={'border-2 border-dashed rounded-lg p-4 ' + (dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25')}
          onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}>
          <input type="file" multiple accept=".pdf,.docx,.mp4,.mp3,.wav,.txt,.jpg,.jpeg,.png,.gif,.webp,image/*" onChange={handleFileInput} className="hidden" id="file-upload" />
          <label htmlFor="file-upload" className="cursor-pointer flex items-center gap-4">
            <Upload className="w-8 h-8 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold">Pretahni nebo klikni pro nahrani</p>
              <p className="text-sm text-muted-foreground">PDF, DOCX, MP4, MP3, WAV, TXT, JPG, PNG • Max: {MAX_FILE_SIZE_MB}MB</p>
            </div>
          </label>
        </div>
        {uploadErrors.length > 0 && (
          <div className="mt-4 p-4 bg-destructive/10 rounded-lg">
            <div className="flex gap-2 text-destructive mb-2"><AlertCircle className="w-4 h-4" /><span className="font-semibold">Chyby:</span></div>
            <ul className="text-sm">{uploadErrors.map((e, i) => <li key={i}>{e}</li>)}</ul>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setUploadErrors([])}>Zavrit</Button>
          </div>
        )}
        {files.length > 0 && (
          <div className="mt-6 space-y-2">
            <h4 className="font-semibold">Vybrano: {files.length}</h4>
            {files.map((f, i) => (
              <div key={i} className="flex items-center p-3 bg-muted rounded-lg">
                <span className="text-xl mr-3">{icon(f)}</span>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{f.name}</p><p className="text-xs text-muted-foreground">{formatFileSize(f.size)}</p></div>
                <Button variant="ghost" size="icon" onClick={() => removeFile(i)} disabled={uploading}><X className="w-4 h-4" /></Button>
              </div>
            ))}
            {uploading && <div className="mt-4"><Progress value={progress} /><p className="text-sm text-center mt-2">{Math.round(progress)}%</p></div>}
            <Button onClick={uploadFiles} disabled={uploading} className="w-full mt-4">
              {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Nahravam...</> : <><Upload className="mr-2 h-4 w-4" />Nahrat</>}
            </Button>
          </div>
        )}
      </Card>
      {errorModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6 m-4">
            <div className="flex gap-3 text-destructive mb-4"><AlertCircle className="w-8 h-8" /><h2 className="text-xl font-bold">Chyba</h2></div>
            <p className="font-medium">{errorModal.fileName}</p>
            <p className="text-destructive mb-4">{errorModal.error}</p>
            <div className="bg-muted p-4 rounded-lg mb-4"><p className="text-sm font-medium">Tip:</p><p className="text-sm text-muted-foreground">{errorModal.suggestion}</p></div>
            <Button className="w-full" onClick={() => setErrorModal(null)}>OK</Button>
          </Card>
        </div>
      )}

      {/* Duplicate File Modal */}
      {duplicateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6 m-4">
            <div className="flex gap-3 text-amber-500 mb-4">
              <Copy className="w-8 h-8" />
              <h2 className="text-xl font-bold">Soubor již existuje</h2>
            </div>

            <p className="text-sm text-muted-foreground mb-2">Soubor s názvem:</p>
            <p className="font-medium mb-4 p-2 bg-muted rounded">{duplicateModal.originalName}</p>

            <div className="space-y-4">
              {/* Auto rename option */}
              <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer" onClick={() => handleDuplicateResolve('auto')}>
                <p className="font-medium">Automaticky přejmenovat</p>
                <p className="text-sm text-muted-foreground">
                  Uložit jako: <span className="font-mono text-primary">{duplicateModal.suggestedName}</span>
                </p>
              </div>

              {/* Custom name option */}
              <div className="p-4 border rounded-lg">
                <p className="font-medium mb-2">Vlastní název</p>
                <div className="flex gap-2">
                  <Input
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Zadej nový název"
                    className="flex-1"
                  />
                  <span className="flex items-center text-muted-foreground">
                    .{duplicateModal.originalName.split('.').pop()}
                  </span>
                </div>
                <Button
                  className="w-full mt-2"
                  variant="outline"
                  onClick={() => handleDuplicateResolve('custom')}
                  disabled={!customName.trim()}
                >
                  Použít tento název
                </Button>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button variant="ghost" className="flex-1" onClick={() => handleDuplicateResolve('skip')}>
                Přeskočit
              </Button>
              <Button variant="ghost" className="flex-1" onClick={() => { setDuplicateModal(null); setFiles([]); }}>
                Zrušit vše
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
