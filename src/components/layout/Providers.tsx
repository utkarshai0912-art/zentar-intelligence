'use client';

import { ThemeProvider } from '@/lib/theme-context';
import { AuthProvider } from '@/lib/auth-context';
import { Toaster } from 'sonner';
import { useEffect, useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        {mounted && <Toaster position="top-right" richColors />}
        {children}
      </AuthProvider>
    </ThemeProvider>
  );
}
