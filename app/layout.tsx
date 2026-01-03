import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/navigation/sidebar';
import { NotificationProvider } from '@/components/providers/notification-provider';
import { ChatWidgetProvider } from '@/components/providers/chat-widget-provider';
import { AgentChatWidget } from '@/components/agents/agent-chat-widget';
import { UserMenu } from '@/components/auth/user-menu';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'UX AI Agency',
  description: 'Virtuální UX tým poháněný AI',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="cs">
      <body className={inter.className}>
        <NotificationProvider>
          <ChatWidgetProvider>
            <div className="flex h-screen">
              <Sidebar />
              <div className="flex-1 flex flex-col overflow-hidden">
                <header className="h-14 border-b flex items-center justify-end px-6 shrink-0">
                  <UserMenu />
                </header>
                <main className="flex-1 overflow-auto">
                  {children}
                </main>
              </div>
            </div>
            <AgentChatWidget />
          </ChatWidgetProvider>
        </NotificationProvider>
      </body>
    </html>
  );
}
