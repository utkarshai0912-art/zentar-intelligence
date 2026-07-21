'use client';

import type { Tool } from '@/lib/types';
import { ImageUpload } from './ImageUpload';
import { useState } from 'react';

interface ToolFormProps {
  tool: Tool;
  onSubmit: (input: string, file?: File | null) => void;
  loading: boolean;
}

export function ToolForm({ tool, onSubmit, loading }: ToolFormProps) {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tool.input_type === 'image_upload') {
      if (!file) return;
      onSubmit('', file);
    } else {
      if (!text.trim()) return;
      onSubmit(text);
    }
  };

  const getPlaceholder = () => {
    switch (tool.slug) {
      case 'thumbnail-analyser':
        return 'Optional: paste your video title or niche...';
      case 'thumbnail-maker':
        return 'Describe your video content and niche...';
      case 'logo-prompter':
        return 'Describe your brand, industry, and style preferences...';
      case 'message-writer':
        return 'Paste the client brief or context...';
      case 'web-prompter':
        return 'Describe your business, industry, and goals...';
      case 'objection-handler':
        return 'Paste the client\'s objection or concern...';
      case 'ugc-ads-prompter':
        return 'Describe your product, target audience, and key features...';
      case 'script-writer':
        return 'Describe your video topic, target audience, and desired tone...';
      default:
        return 'Enter your input...';
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-text-primary dark:text-dark-text-primary">
          Input
        </label>

        {tool.input_type === 'image_upload' ? (
          <div className="space-y-3">
            <ImageUpload value={file} onChange={setFile} />
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={getPlaceholder()}
              rows={2}
              className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-primary placeholder-text-tertiary transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-dark-border dark:bg-dark-surface dark:text-dark-text-primary dark:placeholder-dark-text-tertiary"
            />
          </div>
        ) : (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={getPlaceholder()}
            rows={tool.input_type === 'long_text' ? 6 : 3}
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-primary placeholder-text-tertiary transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-dark-border dark:bg-dark-surface dark:text-dark-text-primary dark:placeholder-dark-text-tertiary"
          />
        )}
      </div>

      <button
        type="submit"
        disabled={loading || (!text.trim() && !file)}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-brand-600 hover:shadow-lg hover:shadow-brand-500/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Generating...
          </>
        ) : (
          <>
            <div className="h-4 w-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
            Generate
          </>
        )}
      </button>
    </form>
  );
}
