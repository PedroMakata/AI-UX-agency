'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Něco se pokazilo</h2>
        <p className="text-muted-foreground mb-6">
          {error.message || 'Nastala neočekávaná chyba'}
        </p>
        <Button onClick={reset}>Zkusit znovu</Button>
      </div>
    </div>
  );
}
