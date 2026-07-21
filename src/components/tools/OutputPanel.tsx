'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Copy, Check, Download, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OutputPanelProps {
  content: string;
  loading: boolean;
  toolName: string;
}

export function OutputPanel({ content, loading, toolName }: OutputPanelProps) {
  const [copied, setCopied] = useState(false);
  const [displayedContent, setDisplayedContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const contentRef = useRef(content);
  const indexRef = useRef(0);

  // Simulate streaming effect when content comes in
  useEffect(() => {
    if (loading) {
      setDisplayedContent('');
      indexRef.current = 0;
      setIsStreaming(false);
      return;
    }

    if (!content) {
      setDisplayedContent('');
      return;
    }

    contentRef.current = content;
    indexRef.current = 0;
    setIsStreaming(true);
  }, [content, loading]);

  useEffect(() => {
    if (!isStreaming || !content) return;

    const words = content.split(' ');
    const interval = setInterval(() => {
      if (indexRef.current < words.length) {
        indexRef.current += 2; // stream 2 words at a time
        setDisplayedContent(words.slice(0, indexRef.current).join(' '));
      } else {
        setDisplayedContent(content);
        setIsStreaming(false);
        clearInterval(interval);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [isStreaming, content]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const textarea = document.createElement('textarea');
      textarea.value = content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [content]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${toolName.replace(/\s+/g, '-').toLowerCase()}-result.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [content, toolName]);

  const showContent = displayedContent || content;

  return (
    <div className="flex flex-col rounded-xl border border-border bg-surface-secondary dark:border-dark-border dark:bg-dark-surface-secondary">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 dark:border-dark-border">
        <span className="text-xs font-medium uppercase tracking-wider text-text-tertiary dark:text-dark-text-tertiary">
          Output
        </span>
        <div className="flex items-center gap-1">
          {content && !loading && (
            <>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-tertiary hover:text-text-primary dark:text-dark-text-secondary dark:hover:bg-dark-surface-tertiary dark:hover:text-dark-text-primary"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-green-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </>
                )}
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-tertiary hover:text-text-primary dark:text-dark-text-secondary dark:hover:bg-dark-surface-tertiary dark:hover:text-dark-text-primary"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="relative min-h-[200px] p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
            <p className="text-sm text-text-tertiary dark:text-dark-text-tertiary">
              Generating with AI...
            </p>
            <div className="flex gap-1.5">
              <span className="h-2 w-2 animate-bounce rounded-full bg-brand-400" style={{ animationDelay: '0ms' }} />
              <span className="h-2 w-2 animate-bounce rounded-full bg-brand-500" style={{ animationDelay: '150ms' }} />
              <span className="h-2 w-2 animate-bounce rounded-full bg-brand-600" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        ) : showContent ? (
          <div className="animate-fade-in whitespace-pre-wrap text-sm leading-relaxed text-text-primary dark:text-dark-text-primary">
            {showContent}
            {isStreaming && (
              <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-brand-500" />
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-text-tertiary dark:text-dark-text-tertiary">
              Your generated content will appear here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
