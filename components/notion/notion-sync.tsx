'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Loader2, CheckCircle, Database, Link2, Unlink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface NotionSyncProps {
  projectId: string;
  notionDatabaseId?: string;
  lastSync?: string;
  onConnectionChange?: () => void;
}

export function NotionSync({ projectId, notionDatabaseId, lastSync, onConnectionChange }: NotionSyncProps) {
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [showConnectForm, setShowConnectForm] = useState(false);
  const [databaseId, setDatabaseId] = useState('');
  const [syncResult, setSyncResult] = useState<{ pages: number; newPages: number; updatedPages: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(!!notionDatabaseId);

  useEffect(() => {
    setIsConnected(!!notionDatabaseId);
  }, [notionDatabaseId]);

  const connectDatabase = async () => {
    if (!databaseId.trim()) return;

    setConnecting(true);
    setError(null);

    try {
      const response = await fetch('/api/notion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          notionDatabaseId: databaseId.trim()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect');
      }

      setIsConnected(true);
      setShowConnectForm(false);
      setDatabaseId('');
      onConnectionChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setConnecting(false);
    }
  };

  const syncNotion = async () => {
    setSyncing(true);
    setError(null);

    try {
      const response = await fetch('/api/notion/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Sync failed');
      }

      setSyncResult({
        pages: data.totalPages || 0,
        newPages: data.newPages || 0,
        updatedPages: data.updatedPages || 0
      });
      onConnectionChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Database className="w-6 h-6" />
          <div>
            <h3 className="font-semibold">Notion Sync</h3>
            <p className="text-sm text-muted-foreground">
              {isConnected ? 'Synchronizuj poznámky z Notion' : 'Připoj Notion databázi'}
            </p>
          </div>
        </div>

        {isConnected ? (
          <div className="flex gap-2">
            <Button onClick={syncNotion} disabled={syncing}>
              {syncing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Synchronizuji...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Synchronizovat
                </>
              )}
            </Button>
          </div>
        ) : (
          <Button onClick={() => setShowConnectForm(true)} variant="outline">
            <Link2 className="mr-2 h-4 w-4" />
            Připojit Notion
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
          {error}
        </div>
      )}

      {showConnectForm && !isConnected && (
        <div className="space-y-4 p-4 bg-muted rounded-lg mb-4">
          <div>
            <Label htmlFor="databaseId">Notion Database ID</Label>
            <Input
              id="databaseId"
              value={databaseId}
              onChange={(e) => setDatabaseId(e.target.value)}
              placeholder="abc123def456..."
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Najdeš ho v URL Notion databáze: notion.so/workspace/<strong>DATABASE_ID</strong>?v=...
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={connectDatabase} disabled={connecting || !databaseId.trim()}>
              {connecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Připojuji...
                </>
              ) : (
                'Připojit'
              )}
            </Button>
            <Button variant="ghost" onClick={() => setShowConnectForm(false)}>
              Zrušit
            </Button>
          </div>
        </div>
      )}

      {isConnected && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="w-4 h-4" />
            <span>Notion databáze připojena</span>
          </div>

          {lastSync && (
            <p className="text-xs text-muted-foreground">
              Poslední sync: {new Date(lastSync).toLocaleString('cs-CZ')}
            </p>
          )}

          {syncResult && (
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="p-3 bg-muted rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Celkem</p>
                <p className="text-xl font-bold">{syncResult.pages}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Nové</p>
                <p className="text-xl font-bold text-green-600">{syncResult.newPages}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Aktualizované</p>
                <p className="text-xl font-bold text-blue-600">{syncResult.updatedPages}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {!isConnected && !showConnectForm && (
        <div className="text-center py-6 text-muted-foreground">
          <p>Notion databáze není připojena</p>
          <p className="text-xs mt-1">Klikni na "Připojit Notion" pro začátek</p>
        </div>
      )}
    </Card>
  );
}
