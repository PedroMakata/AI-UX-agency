'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Home, Plus, Settings } from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r bg-muted/40 p-4 hidden md:block">
      <div className="mb-8">
        <h2 className="text-2xl font-bold">UX AI Agency</h2>
      </div>

      <nav className="space-y-2">
        <Link href="/">
          <Button
            variant={pathname === '/' ? 'secondary' : 'ghost'}
            className="w-full justify-start"
          >
            <Home className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
        </Link>

        <Link href="/projects/new">
          <Button
            variant={pathname === '/projects/new' ? 'secondary' : 'ghost'}
            className="w-full justify-start"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nový Projekt
          </Button>
        </Link>

        <div className="pt-4">
          <Link href="/settings">
            <Button
              variant={pathname === '/settings' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
            >
              <Settings className="mr-2 h-4 w-4" />
              Nastavení
            </Button>
          </Link>
        </div>
      </nav>
    </aside>
  );
}
