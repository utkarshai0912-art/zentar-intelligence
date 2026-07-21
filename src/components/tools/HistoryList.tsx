'use client';

import type { Generation } from '@/lib/types';
import { formatDate, truncate } from '@/lib/utils';
import { Clock, Trash2 } from 'lucide-react';

interface HistoryListProps {
  generations: Generation[];
  onSelect: (gen: Generation) => void;
  onDelete: (id: string) => void;
  loading?: boolean;
  toolName: string;
}

export function HistoryList({ generations, onSelect, onDelete, loading, toolName }: HistoryListProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-tertiary dark:bg-dark-surface-tertiary" />
        ))}
      </div>
    );
  }

  if (generations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Clock className="mb-2 h-8 w-8 text-text-tertiary dark:text-dark-text-tertiary" />
        <p className="text-sm text-text-tertiary dark:text-dark-text-tertiary">
          No history yet
        </p>
        <p className="mt-1 text-xs text-text-tertiary/60 dark:text-dark-text-tertiary/60">
          Your {toolName} generations will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {generations.map((gen) => (
        <button
          key={gen.id}
          onClick={() => onSelect(gen)}
          className="group flex w-full items-start gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left transition-all hover:border-border hover:bg-surface-secondary dark:hover:border-dark-border dark:hover:bg-dark-surface-secondary"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary truncate dark:text-dark-text-primary">
              {truncate(gen.input_data, 60)}
            </p>
            <p className="mt-0.5 text-xs text-text-tertiary dark:text-dark-text-tertiary">
              {formatDate(gen.created_at)}
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(gen.id);
            }}
            className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg text-text-tertiary opacity-0 transition-all hover:bg-red-500/10 hover:text-red-500 group-hover:opacity-100 dark:text-dark-text-tertiary"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </button>
      ))}
    </div>
  );
}
