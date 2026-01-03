'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { User, Settings, LogOut, ChevronDown } from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  avatar_preset?: number;
}

const AVATAR_PRESETS = [
  '👤', '👨', '👩', '🧑‍💻', '👨‍💼', '👩‍💼', '🧙', '🦸', '🥷', '🤖'
];

export function UserMenu() {
  const router = useRouter();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setProfile(profile);
      }
      setLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setShowMenu(false);
    router.push('/login');
  };

  if (loading) {
    return null;
  }

  if (!user) {
    return (
      <Button variant="outline" onClick={() => router.push('/login')}>
        Prihlasit se
      </Button>
    );
  }

  const getAvatar = () => {
    if (profile?.avatar_url) {
      return (
        <img
          src={profile.avatar_url}
          alt="Avatar"
          className="w-8 h-8 rounded-full object-cover"
        />
      );
    }
    if (profile?.avatar_preset !== undefined && profile.avatar_preset >= 0) {
      return (
        <span className="text-xl">{AVATAR_PRESETS[profile.avatar_preset]}</span>
      );
    }
    return <User className="h-5 w-5" />;
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        className="flex items-center gap-2"
        onClick={() => setShowMenu(!showMenu)}
      >
        {getAvatar()}
        <span className="hidden md:inline max-w-32 truncate">
          {user.email}
        </span>
        <ChevronDown className="h-4 w-4" />
      </Button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <Card className="absolute right-0 top-full mt-2 w-56 z-50 py-2">
            <div className="px-4 py-2 border-b">
              <p className="text-sm font-medium truncate">{user.email}</p>
              {profile?.phone && (
                <p className="text-xs text-muted-foreground">{profile.phone}</p>
              )}
            </div>
            <button
              onClick={() => {
                setShowMenu(false);
                router.push('/settings/profile');
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors"
            >
              <Settings className="h-4 w-4" />
              Nastaveni profilu
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors text-destructive"
            >
              <LogOut className="h-4 w-4" />
              Odhlasit se
            </button>
          </Card>
        </>
      )}
    </div>
  );
}
