'use client';

import { useState, useEffect } from 'react';
import { File, Download, Trash2, FileText, FileAudio, FileVideo, FileImage, Globe, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface FileItem {
  id: string;
  name: string;
  original_name: string;
  file_type: string;
  mime_type: string;
  size_bytes: number;
  storage_path: string;
  public_url: string;
  created_at: string;
  is_global?: boolean;
}

interface FileListProps {
  projectId: string;
}

export function FileList({ projectId }: FileListProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteFileId, setDeleteFileId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadFiles();
  }, [projectId]);

  const loadFiles = async () => {
    try {
      const response = await fetch(`/api/files?projectId=${projectId}`);
      const data = await response.json();
      setFiles(data.files || []);
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFile = async () => {
    if (!deleteFileId) return;

    setDeleting(true);
    try {
      await fetch(`/api/files/${deleteFileId}`, {
        method: 'DELETE'
      });
      setFiles(prev => prev.filter(f => f.id !== deleteFileId));
      setDeleteFileId(null);
    } catch (error) {
      console.error('Error deleting file:', error);
    } finally {
      setDeleting(false);
    }
  };

  const fileToDelete = files.find(f => f.id === deleteFileId);

  const getFileIcon = (type: string) => {
    if (type.includes('pdf') || type.includes('document')) return <FileText className="w-5 h-5" />;
    if (type.includes('audio')) return <FileAudio className="w-5 h-5" />;
    if (type.includes('video')) return <FileVideo className="w-5 h-5" />;
    if (type.includes('image')) return <FileImage className="w-5 h-5" />;
    return <File className="w-5 h-5" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <Card className="p-6">Načítám soubory...</Card>;
  }

  if (files.length === 0) {
    return (
      <Card className="p-6 text-center text-muted-foreground">
        Žádné soubory nebyly nahrány
      </Card>
    );
  }

  return (
    <>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Název</TableHead>
              <TableHead>Velikost</TableHead>
              <TableHead>Datum</TableHead>
              <TableHead className="text-right">Akce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.map((file) => (
              <TableRow key={file.id}>
                <TableCell>
                  {getFileIcon(file.file_type)}
                </TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {file.original_name}
                    {file.is_global && <span title="Globalni soubor"><Globe className="w-3 h-3 text-muted-foreground" /></span>}
                  </div>
                </TableCell>
                <TableCell>{formatFileSize(file.size_bytes)}</TableCell>
                <TableCell>{formatDate(file.created_at)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon">
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteFileId(file.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Delete Confirmation Modal */}
      {deleteFileId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6 m-4">
            <div className="flex items-center gap-3 text-destructive mb-4">
              <AlertTriangle className="h-8 w-8" />
              <h2 className="text-xl font-bold">Smazat soubor</h2>
            </div>

            <p className="text-muted-foreground mb-2">
              Opravdu chcete smazat tento soubor?
            </p>
            {fileToDelete && (
              <p className="font-medium mb-6">{fileToDelete.original_name}</p>
            )}

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setDeleteFileId(null)}
                disabled={deleting}
              >
                Zrušit
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteFile}
                disabled={deleting}
              >
                {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Smazat soubor
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
