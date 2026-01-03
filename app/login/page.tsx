'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/card';
import { LoginButton } from '@/components/auth/login-button';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        router.push('/');
      } else {
        setChecking(false);
      }
    };

    checkUser();
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">UX AI Agency</h1>
          <p className="text-muted-foreground">
            Prihlaste se pro pristup k vasim projektum
          </p>
        </div>

        <LoginButton />

        <p className="text-xs text-muted-foreground text-center mt-6">
          Prihlasenim souhlasíte s nasimi podminkami pouziti
        </p>
      </Card>
    </div>
  );
}
