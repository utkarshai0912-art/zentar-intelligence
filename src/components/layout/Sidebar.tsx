'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { X, Sparkles } from 'lucide-react';
import type { Tool } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';

const DEFAULT_TOOLS = [
  { name: 'AI Thumbnail Analyser', icon: '🎯', slug: 'thumbnail-analyser' },
  { name: 'AI Thumbnail Maker', icon: '🎨', slug: 'thumbnail-maker' },
  { name: 'AI Logo Prompter', icon: '🪄', slug: 'logo-prompter' },
  { name: 'AI Message Writer', icon: '✉️', slug: 'message-writer' },
  { name: 'AI Web Prompter', icon: '🌐', slug: 'web-prompter' },
  { name: 'AI Objection Handler', icon: '🤝', slug: 'objection-handler' },
  { name: 'AI UGC / Ads Prompter', icon: '📱', slug: 'ugc-ads-prompter' },
  { name: 'AI Script Writer', icon: '🎬', slug: 'script-writer' },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [tools, setTools] = useState<Tool[]>([]);

  useEffect(() => {
    const fetchTools = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('tools')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true });
      if (data && data.length > 0) {
        setTools(data as Tool[]);
      }
    };
    fetchTools();
  }, []);

  const displayTools = tools.length > 0 ? tools : DEFAULT_TOOLS;

  return (
    <aside
      className={cn(
        'fixed left-0 top-16 z-30 h-[calc(100vh-4rem)] w-64 border-r border-border bg-surface transition-transform duration-300 dark:border-dark-border dark:bg-dark-surface',
        open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-border px-4 py-3 dark:border-dark-border">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-tertiary dark:text-dark-text-tertiary">
            All Tools
          </span>
          <button onClick={onClose} className="md:hidden">
            <X className="h-4 w-4 text-text-tertiary" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {displayTools.map((tool: any) => {
            const slug = tool.slug;
            const isActive = pathname === `/tool/${slug}`;
            return (
              <Link
                key={slug}
                href={`/tool/${slug}`}
                onClick={() => onClose()}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400'
                    : 'text-text-secondary hover:bg-surface-tertiary hover:text-text-primary dark:text-dark-text-secondary dark:hover:bg-dark-surface-tertiary dark:hover:text-dark-text-primary'
                )}
              >
                <span className="text-lg">{tool.icon}</span>
                <span className="truncate">{tool.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-4 dark:border-dark-border">
          <Link
            href="/pricing"
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-brand-500/10 to-purple-500/10 px-3 py-2.5 text-sm font-medium text-brand-600 ring-1 ring-brand-500/20 transition-all hover:shadow-lg hover:shadow-brand-500/10 dark:text-brand-400"
          >
            <Sparkles className="h-4 w-4" />
            Upgrade Plan
          </Link>
        </div>
      </div>
    </aside>
  );
}
