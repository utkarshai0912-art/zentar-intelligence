'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { Sun, Moon, Sparkles, LogOut, User, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export function Header() {
  const { user, profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-surface/80 backdrop-blur-xl dark:bg-dark-surface/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/10 ring-1 ring-brand-500/20 transition-all duration-300 group-hover:ring-brand-500/40 group-hover:shadow-lg group-hover:shadow-brand-500/10">
            <Sparkles className="h-5 w-5 text-brand-500" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-text-primary dark:text-dark-text-primary">
            Zentar <span className="text-brand-500">Intelligence</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href="/pricing"
            className="text-sm font-medium text-text-secondary transition-colors hover:text-text-primary dark:text-dark-text-secondary dark:hover:text-dark-text-primary"
          >
            Pricing
          </Link>

          {user && (
            <>
              <Link
                href="/account"
                className="text-sm font-medium text-text-secondary transition-colors hover:text-text-primary dark:text-dark-text-secondary dark:hover:text-dark-text-primary"
              >
                Account
              </Link>
              {profile?.plan_type === 'pro' || profile?.plan_type === 'business' ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-500/10 px-3 py-1 text-xs font-medium text-brand-500 ring-1 ring-brand-500/20">
                  <Sparkles className="h-3 w-3" />
                  {profile.plan_type === 'business' ? 'Business' : 'Pro'}
                </span>
              ) : null}
            </>
          )}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-tertiary hover:text-text-primary dark:text-dark-text-secondary dark:hover:bg-dark-surface-tertiary dark:hover:text-dark-text-primary"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {user ? (
            <div className="hidden items-center gap-2 md:flex">
              <Link
                href="/account"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-tertiary hover:text-text-primary dark:text-dark-text-secondary dark:hover:bg-dark-surface-tertiary dark:hover:text-dark-text-primary"
              >
                <User className="h-4 w-4" />
              </Link>
              <button
                onClick={signOut}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-tertiary hover:text-red-500 dark:text-dark-text-secondary dark:hover:bg-dark-surface-tertiary"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link
                href="/auth/login"
                className="rounded-lg px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-tertiary hover:text-text-primary dark:text-dark-text-secondary dark:hover:bg-dark-surface-tertiary dark:hover:text-dark-text-primary"
              >
                Log in
              </Link>
              <Link
                href="/auth/signup"
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-brand-600 hover:shadow-lg hover:shadow-brand-500/20"
              >
                Sign up
              </Link>
            </div>
          )}

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary md:hidden dark:text-dark-text-secondary"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      <div
        className={cn(
          'border-t border-border/50 bg-surface px-4 pb-4 pt-2 md:hidden dark:bg-dark-surface',
          mobileOpen ? 'block' : 'hidden'
        )}
      >
        <nav className="flex flex-col gap-2">
          <Link
            href="/"
            className="rounded-lg px-3 py-2 text-sm font-medium text-text-secondary hover:bg-surface-tertiary dark:text-dark-text-secondary dark:hover:bg-dark-surface-tertiary"
            onClick={() => setMobileOpen(false)}
          >
            Home
          </Link>
          <Link
            href="/pricing"
            className="rounded-lg px-3 py-2 text-sm font-medium text-text-secondary hover:bg-surface-tertiary dark:text-dark-text-secondary dark:hover:bg-dark-surface-tertiary"
            onClick={() => setMobileOpen(false)}
          >
            Pricing
          </Link>
          {user ? (
            <>
              <Link
                href="/account"
                className="rounded-lg px-3 py-2 text-sm font-medium text-text-secondary hover:bg-surface-tertiary dark:text-dark-text-secondary dark:hover:bg-dark-surface-tertiary"
                onClick={() => setMobileOpen(false)}
              >
                Account
              </Link>
              <Link
                href="/billing"
                className="rounded-lg px-3 py-2 text-sm font-medium text-text-secondary hover:bg-surface-tertiary dark:text-dark-text-secondary dark:hover:bg-dark-surface-tertiary"
                onClick={() => setMobileOpen(false)}
              >
                Billing
              </Link>
              <button
                onClick={() => { signOut(); setMobileOpen(false); }}
                className="rounded-lg px-3 py-2 text-left text-sm font-medium text-red-500 hover:bg-surface-tertiary dark:hover:bg-dark-surface-tertiary"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="rounded-lg px-3 py-2 text-sm font-medium text-text-secondary hover:bg-surface-tertiary dark:text-dark-text-secondary dark:hover:bg-dark-surface-tertiary"
                onClick={() => setMobileOpen(false)}
              >
                Log in
              </Link>
              <Link
                href="/auth/signup"
                className="rounded-lg bg-brand-500 px-3 py-2 text-center text-sm font-medium text-white"
                onClick={() => setMobileOpen(false)}
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
