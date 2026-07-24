'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Lock, Sparkles, ChevronRight, type LucideIcon } from 'lucide-react';
import { TOOL_ICONS, DEFAULT_ICON } from '@/lib/icons';

interface ToolCardProps {
  name: string;
  slug: string;
  description: string;
  isPremium: boolean;
  userPlan?: string;
}

export function ToolCard({ name, slug, description, isPremium, userPlan }: ToolCardProps) {
  const isLocked = isPremium && userPlan === 'free';
  const Icon: LucideIcon = TOOL_ICONS[slug] || DEFAULT_ICON;

  return (
    <Link href={isLocked ? '/pricing' : `/tool/${slug}`}>
      <div
        className={cn(
          'group relative overflow-hidden rounded-xl border border-border bg-surface p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 dark:border-dark-border dark:bg-dark-surface',
          isLocked
            ? 'opacity-75 hover:opacity-90'
            : 'hover:border-brand-500/30 hover:shadow-brand-500/5 dark:hover:border-brand-500/30',
          'animate-fade-in'
        )}
      >
        {/* Hover gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-500/[0.02] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {/* Premium badge */}
        {isPremium && (
          <div className="absolute right-3 top-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-600 ring-1 ring-amber-500/20 dark:text-amber-400">
              <Sparkles className="h-3 w-3" />
              Premium
            </span>
          </div>
        )}

        {/* Icon */}
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10 ring-1 ring-brand-500/20 transition-all duration-300 group-hover:ring-brand-500/40 group-hover:shadow-lg group-hover:shadow-brand-500/10">
          <Icon className="h-6 w-6 text-brand-500" />
        </div>

        {/* Content */}
        <h3 className="mb-1.5 text-base font-semibold text-text-primary dark:text-dark-text-primary">
          {name}
        </h3>
        <p className="mb-4 text-sm leading-relaxed text-text-secondary dark:text-dark-text-secondary">
          {description}
        </p>

        {/* Action */}
        <div className="flex items-center gap-1.5 text-sm font-medium">
          {isLocked ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-1.5 text-amber-600 ring-1 ring-amber-500/20 dark:text-amber-400">
              <Lock className="h-3.5 w-3.5" />
              Upgrade to Access
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-brand-500 transition-all duration-300 group-hover:gap-2">
              Open
              <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
