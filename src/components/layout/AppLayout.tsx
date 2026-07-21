'use client';

import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
}

export function AppLayout({ children, showSidebar = false }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex flex-1">
        {showSidebar && (
          <>
            {/* Mobile overlay */}
            {sidebarOpen && (
              <div
                className="fixed inset-0 z-40 bg-black/50 md:hidden"
                onClick={() => setSidebarOpen(false)}
              />
            )}
            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          </>
        )}
        <main
          className={cn(
            'flex-1',
            showSidebar && 'md:ml-64'
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
