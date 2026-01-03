'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, Upload, Check } from 'lucide-react';

const AVATAR_PRESETS = [
  '👤', '👨', '👩', '🧑‍💻', '👨‍💼', '👩‍💼', '🧙', '🦸', '🥷', '🤖'
];

interface UserProfile {
  id: string;
  email: string;
  phone: string;
  avatar_url: string;
  avatar_preset: number;
}

export default function ProfileSettingsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarPreset, setAvatarPreset] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        setProfile(profile);
        setEmail(profile.email || user.email || '');
        setPhone(profile.phone || '');
        setAvatarPreset(profile.avatar_preset ?? 0);
        setAvatarUrl(profile.avatar_url || '');
      } else {
        setEmail(user.email || '');
      }
      setLoading(false);
    };

    loadProfile();
  }, [router]);

  const handleSave = async () => {
    if (!profile) return;

    setSaving(true);
    try {
      const supabase = createClient();
      await supabase
        .from('user_profiles')
        .update({
          email,
          phone,
          avatar_preset: avatarUrl ? null : avatarPreset,
          avatar_url: avatarUrl || null,
        })
        .eq('id', profile.id);

      router.push('/');
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setUploading(true);
    try {
      const supabase = createClient();
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setAvatarUrl(publicUrl);
    } catch (error) {
      console.error('Failed to upload avatar:', error);
    } finally {
      setUploading(false);
    }
  };

  const selectPreset = (index: number) => {
    setAvatarPreset(index);
    setAvatarUrl(''); // Clear custom avatar when selecting preset
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-2xl">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold">Nastaveni profilu</h1>
        </div>

        <Card className="p-6 space-y-6">
          {/* Avatar Section */}
          <div>
            <Label className="text-base font-semibold">Avatar</Label>
            <div className="mt-4 flex items-center gap-6">
              {/* Current Avatar Preview */}
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-4xl overflow-hidden border-2 border-border">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  AVATAR_PRESETS[avatarPreset]
                )}
              </div>

              {/* Upload Button */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Nahrat obrazek
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  JPG, PNG nebo GIF. Max 2MB.
                </p>
              </div>
            </div>

            {/* Preset Avatars */}
            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-2">Nebo vyberte preset:</p>
              <div className="flex gap-2 flex-wrap">
                {AVATAR_PRESETS.map((emoji, index) => (
                  <button
                    key={index}
                    onClick={() => selectPreset(index)}
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all ${
                      !avatarUrl && avatarPreset === index
                        ? 'bg-primary/20 ring-2 ring-primary'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {emoji}
                    {!avatarUrl && avatarPreset === index && (
                      <span className="absolute bottom-0 right-0 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Email */}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vas@email.cz"
            />
          </div>

          {/* Phone */}
          <div>
            <Label htmlFor="phone">Telefon</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+420 123 456 789"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => router.push('/')}>
              Zrusit
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ulozit zmeny
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
