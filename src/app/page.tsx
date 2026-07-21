'use client';

import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ToolCard } from '@/components/tools/ToolCard';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';
import type { Tool } from '@/lib/types';
import { Sparkles, ArrowRight, Brain, Wand2, Zap, Shield, Palette, MessageSquare, Globe, Handshake } from 'lucide-react';

const DEFAULT_TOOLS = [
  {
    id: '1', name: 'AI Thumbnail Analyser', slug: 'thumbnail-analyser', icon: '🎯',
    description: 'Upload a thumbnail and get a CTR-potential score with specific fixes.', is_premium: false,
  },
  {
    id: '2', name: 'AI Thumbnail Maker', slug: 'thumbnail-maker', icon: '🎨',
    description: 'Describe your video and get a thumbnail design brief with image prompts.', is_premium: false,
  },
  {
    id: '3', name: 'AI Logo Prompter', slug: 'logo-prompter', icon: '🪄',
    description: 'Turn your brand description into logo concepts and image-gen prompts.', is_premium: false,
  },
  {
    id: '4', name: 'AI Message Writer', slug: 'message-writer', icon: '✉️',
    description: 'Craft polished outreach messages with multiple tone variants.', is_premium: false,
  },
  {
    id: '5', name: 'AI Web Prompter', slug: 'web-prompter', icon: '🌐',
    description: 'Get a structured website build prompt from your business description.', is_premium: true,
  },
  {
    id: '6', name: 'AI Objection Handler', slug: 'objection-handler', icon: '🤝',
    description: 'Turn client objections into professional, persuasive responses.', is_premium: false,
  },
  {
    id: '7', name: 'AI UGC / Ads Prompter', slug: 'ugc-ads-prompter', icon: '📱',
    description: 'Generate UGC-style ad scripts from your product details.', is_premium: true,
  },
  {
    id: '8', name: 'AI Script Writer', slug: 'script-writer', icon: '🎬',
    description: 'Turn a topic or outline into a full video script.', is_premium: false,
  },
];

export default function HomePage() {
  const { user, profile } = useAuth();
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);

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
      setLoading(false);
    };
    fetchTools();
  }, []);

  const displayTools = tools.length > 0 ? tools : DEFAULT_TOOLS;

  return (
    <AppLayout>
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border/50 dark:border-dark-border/50">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-500/[0.03] to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-brand-500/5 to-transparent blur-3xl" />
        <div className="mx-auto max-w-7xl px-4 pb-16 pt-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-brand-500/10 px-4 py-1.5 text-xs font-medium text-brand-500 ring-1 ring-brand-500/20">
              <Sparkles className="h-3.5 w-3.5" />
              8 Specialized AI Tools
            </div>
            <h1 className="mb-4 text-4xl font-bold tracking-tight text-text-primary sm:text-5xl dark:text-dark-text-primary">
              Your AI Arsenal for{' '}
              <span className="bg-gradient-to-r from-brand-500 to-purple-500 bg-clip-text text-transparent">
                Content Creation
              </span>
            </h1>
            <p className="mx-auto max-w-xl text-lg leading-relaxed text-text-secondary dark:text-dark-text-secondary">
              Thumbnails, scripts, ads, messaging — niche AI assistants purpose-built for content creators.
              No fluff, just results.
            </p>
            {!user && (
              <div className="mt-8 flex items-center justify-center gap-3">
                <a
                  href="/auth/signup"
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-brand-600 hover:shadow-lg hover:shadow-brand-500/20"
                >
                  Get Started Free
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href="/pricing"
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-semibold text-text-secondary transition-colors hover:bg-surface-tertiary dark:border-dark-border dark:text-dark-text-secondary dark:hover:bg-dark-surface-tertiary"
                >
                  View Pricing
                </a>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-b border-border/50 dark:border-dark-border/50">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {[
              { label: 'AI Tools', value: '8' },
              { label: 'Free Tools', value: '6' },
              { label: 'Premium Tools', value: '2' },
              { label: 'AI Models', value: 'GPT-4o' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-bold text-text-primary dark:text-dark-text-primary">{stat.value}</p>
                <p className="text-xs text-text-tertiary dark:text-dark-text-tertiary">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tools Grid */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary">
            All Tools
          </h2>
          <p className="mt-1 text-sm text-text-secondary dark:text-dark-text-secondary">
            Choose a tool to get started
          </p>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-xl bg-surface-tertiary dark:bg-dark-surface-tertiary" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {displayTools.map((tool: any) => (
              <ToolCard
                key={tool.slug}
                name={tool.name}
                icon={tool.icon}
                description={tool.description}
                slug={tool.slug}
                isPremium={tool.is_premium}
                userPlan={profile?.plan_type}
              />
            ))}
          </div>
        )}
      </section>

      {/* Features section */}
      <section className="border-t border-border/50 py-16 dark:border-dark-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary">
              Why Zentar Intelligence?
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Brain, title: 'Specialized AI', desc: 'Each tool has its own expert system prompt tuned for the task.' },
              { icon: Wand2, title: 'One-Click Generation', desc: 'Simple forms, powerful output. No prompt engineering required.' },
              { icon: Zap, title: 'Fast & Efficient', desc: 'Streaming responses with real-time output display.' },
              { icon: Shield, title: 'Your History Saved', desc: 'All generations are saved for easy reference later.' },
              { icon: Palette, title: 'Consistent Design', desc: 'Same beautiful interface across all 8 tools.' },
              { icon: Globe, title: 'Always Growing', desc: 'New tools added regularly through the admin panel.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-xl border border-border bg-surface-secondary p-5 dark:border-dark-border dark:bg-dark-surface-secondary">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500/10 ring-1 ring-brand-500/20">
                  <Icon className="h-5 w-5 text-brand-500" />
                </div>
                <h3 className="mb-1 font-semibold text-text-primary dark:text-dark-text-primary">{title}</h3>
                <p className="text-sm text-text-secondary dark:text-dark-text-secondary">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 dark:border-dark-border/50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="flex items-center gap-2 text-sm text-text-tertiary dark:text-dark-text-tertiary">
              <Sparkles className="h-4 w-4 text-brand-500" />
              Zentar Intelligence — AI Tools Hub
            </p>
            <p className="text-xs text-text-tertiary/60 dark:text-dark-text-tertiary/60">
              &copy; {new Date().getFullYear()} Zentar Intelligence. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </AppLayout>
  );
}
