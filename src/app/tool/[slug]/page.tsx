'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { ToolForm } from '@/components/tools/ToolForm';
import { OutputPanel } from '@/components/tools/OutputPanel';
import { HistoryList } from '@/components/tools/HistoryList';
import { useAuth } from '@/lib/auth-context';
import { getToolBySlug, getUserGenerations, addGeneration, deleteGeneration } from '@/lib/firebase/firestore';
import type { Tool, Generation } from '@/lib/types';
import { toast } from 'sonner';
import { Sparkles, ChevronLeft, Lock, ArrowUpCircle } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const DEFAULT_TOOLS: Record<string, Omit<Tool, 'id' | 'created_at' | 'updated_at' | 'is_active'>> = {
  'thumbnail-analyser': {
    name: 'AI Thumbnail Analyser', slug: 'thumbnail-analyser', icon: '🎯',
    description: 'Upload a thumbnail image and get a CTR-potential score with specific fixes.',
    system_instructions: `You are an expert YouTube thumbnail analyst. Analyze the uploaded thumbnail image and provided title/niche. Return:
1. **CTR Score** (0-100) with a visual indicator
2. **What's Working** — 3-5 specific strengths
3. **What's Weak** — 3-5 specific weaknesses
4. **Specific Fixes** — actionable improvements the creator can make

Be brutally honest but constructive. Use specific design terminology (color theory, composition, hierarchy, contrast, face visibility, text readability).`,
    input_type: 'image_upload', output_type: 'markdown', is_premium: false,
  },
  'thumbnail-maker': {
    name: 'AI Thumbnail Maker', slug: 'thumbnail-maker', icon: '🎨',
    description: 'Describe your video and get a thumbnail design brief.',
    system_instructions: `You are a professional thumbnail designer for YouTube. Based on the video description provided:

1. **Thumbnail Design Brief** — composition, color scheme, focal point, text overlay suggestions
2. **Image Generation Prompt** — a detailed prompt the user can copy into Midjourney/DALL-E/Leonardo to generate the thumbnail

Be specific about layout, lighting, emotions, and composition. Include font recommendations for text overlays.`,
    input_type: 'long_text', output_type: 'markdown', is_premium: false,
  },
  'logo-prompter': {
    name: 'AI Logo Prompter', slug: 'logo-prompter', icon: '🪄',
    description: 'Turn your brand into logo concept directions and prompts.',
    system_instructions: `You are a brand identity designer. Based on the brand description:

1. **Logo Concept Directions** — 3 distinct logo concepts (e.g., minimalist, illustrative, typographic)
2. **Image-Gen Prompts** — for each concept, a detailed prompt ready for Midjourney/DALL-E

Consider industry, brand personality, color psychology, and scalability.`,
    input_type: 'long_text', output_type: 'markdown', is_premium: false,
  },
  'message-writer': {
    name: 'AI Message Writer', slug: 'message-writer', icon: '✉️',
    description: 'Craft polished outreach messages with tone variants.',
    system_instructions: `You are a professional copywriter specializing in client outreach. Based on the brief provided:

Write the outreach message in 3 tone variants:
1. **Professional & Polished** — formal, credible
2. **Warm & Friendly** — conversational, approachable
3. **Direct & Results-Driven** — short, punchy, value-focused

Each variant should be complete and ready to send. Keep messages under 200 words.`,
    input_type: 'long_text', output_type: 'markdown', is_premium: false,
  },
  'web-prompter': {
    name: 'AI Web Prompter', slug: 'web-prompter', icon: '🌐',
    description: 'Get a structured website build prompt from your business description.',
    system_instructions: `You are a senior web strategist and UX architect. Based on the business description:

1. **Site Structure** — recommended sections and pages with rationale
2. **Copy Direction** — tone, voice, key messaging for each section
3. **Layout Notes** — layout patterns, component hierarchy, visual emphasis
4. **Build Prompt** — a complete structured prompt the user can give to a web developer or AI web builder

Prioritize conversion and user experience. Be specific about calls-to-action.`,
    input_type: 'long_text', output_type: 'markdown', is_premium: true,
  },
  'objection-handler': {
    name: 'AI Objection Handler', slug: 'objection-handler', icon: '🤝',
    description: 'Turn objections into persuasive responses.',
    system_instructions: `You are a sales negotiation expert. For each client objection:

1. **Acknowledge & Validate** — show you understand their concern
2. **Reframe** — present a new perspective
3. **Response** — a complete professional reply they can send or use

Cover the emotional subtext behind the objection. Keep responses practical and ready-to-use.`,
    input_type: 'long_text', output_type: 'markdown', is_premium: false,
  },
  'ugc-ads-prompter': {
    name: 'AI UGC / Ads Prompter', slug: 'ugc-ads-prompter', icon: '📱',
    description: 'Generate UGC-style ad scripts from your product details.',
    system_instructions: `You are a UGC (User Generated Content) ad strategist. Based on the product description:

1. **Hook Concepts** — 3 attention-grabbing hooks for 15-60 second ads
2. **Full Scripts** — 2 complete UGC ad scripts with visual directions, voiceover, and text overlay cues
3. **Best Platform Notes** — which platform each script suits (TikTok, Instagram Reels, YouTube Shorts)

Make scripts feel authentic, not overly produced. Include "this feels like a real person" authenticity cues.`,
    input_type: 'long_text', output_type: 'markdown', is_premium: true,
  },
  'script-writer': {
    name: 'AI Script Writer', slug: 'script-writer', icon: '🎬',
    description: 'Turn a topic into a full video script.',
    system_instructions: `You are a professional video script writer for YouTube. Based on the topic/outline:

1. **Hook** (0-30s) — attention-grabbing opening
2. **Body** — structured main content with timestamps, visual cues, and key points
3. **CTA** — natural call to action

Include visual/editing suggestions in [brackets]. Optimize for retention — keep pacing tight. Aim for 5-10 minute video length unless specified otherwise.`,
    input_type: 'long_text', output_type: 'markdown', is_premium: false,
  },
};

const USAGE_LIMITS: Record<string, number> = {
  free: 30,
  pro: 300,
  business: 9999,
};

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'zentar-intelligence';

export default function ToolPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { user, profile, loading: authLoading, getIdToken } = useAuth();

  const [tool, setTool] = useState<Tool | null>(null);
  const [localTool, setLocalTool] = useState<typeof DEFAULT_TOOLS[string] | null>(null);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [currentOutput, setCurrentOutput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loadingTool, setLoadingTool] = useState(true);

  // Load tool config
  useEffect(() => {
    const fetchTool = async () => {
      try {
        const data = await getToolBySlug(slug);
        if (data) {
          setTool(data as Tool);
        } else if (DEFAULT_TOOLS[slug]) {
          setLocalTool(DEFAULT_TOOLS[slug]);
        } else {
          router.push('/');
          return;
        }
      } catch (err) {
        if (DEFAULT_TOOLS[slug]) {
          setLocalTool(DEFAULT_TOOLS[slug]);
        } else {
          router.push('/');
          return;
        }
      }
      setLoadingTool(false);
    };
    fetchTool();
  }, [slug, router]);

  // Load history
  const fetchHistory = useCallback(async () => {
    if (!user) return;
    setHistoryLoading(true);
    try {
      // Use slug as the tool identifier for generations
      const data = await getUserGenerations(user.uid, slug);
      if (data) setGenerations(data as Generation[]);
    } catch (err) {
      console.error('Failed to load history');
    }
    setHistoryLoading(false);
  }, [user, slug]);

  useEffect(() => {
    if (user && (tool || localTool)) fetchHistory();
  }, [user, tool, localTool, fetchHistory]);

  const toolData = tool || (localTool ? { ...localTool, id: slug, is_active: true, created_at: '', updated_at: '' } : null);

  const handleGenerate = async (input: string, file?: File | null) => {
    if (!user) {
      toast.error('Please sign in to generate');
      router.push('/auth/login');
      return;
    }

    if (!toolData) return;

    // Check usage limits
    const plan = (profile?.plan_type || 'free') as keyof typeof USAGE_LIMITS;
    const limit = USAGE_LIMITS[plan] || 30;
    if (profile && profile.credits_remaining <= 0) {
      toast.error('You\'ve used all your generations. Upgrade your plan!');
      router.push('/pricing');
      return;
    }

    // Check premium access
    if (toolData.is_premium && plan === 'free') {
      toast.error('This is a premium tool. Upgrade to access it.');
      router.push('/pricing');
      return;
    }

    setGenerating(true);
    setCurrentOutput('');

    try {
      const token = await getIdToken();

      const res = await fetch(`https://us-central1-${PROJECT_ID}.cloudfunctions.net/generateAI`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          toolSlug: slug,
          input,
          image: file ? await fileToBase64(file) : null,
          systemInstructions: toolData.system_instructions,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Generation failed');
      }

      const data = await res.json();
      setCurrentOutput(data.output);

      // Save generation to Firestore
      try {
        if (user) {
          await addGeneration(user.uid, {
            tool_id: slug,
            input_data: input || '(image uploaded)',
            output_data: data.output,
          });
        }
      } catch (err) {
        console.error('Failed to save generation:', err);
      }

      // Refresh history
      fetchHistory();

      // Decrement credits locally (server handles actual deduction)
      if (profile) {
        profile.credits_remaining = Math.max(0, profile.credits_remaining - 1);
      }

    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteGeneration = async (genId: string) => {
    if (!user) return;
    try {
      await deleteGeneration(user.uid, genId);
      setGenerations((prev) => prev.filter((g) => g.id !== genId));
      toast.success('Generation deleted');
    } catch (err) {
      toast.error('Failed to delete generation');
    }
  };

  const handleSelectGeneration = (gen: Generation) => {
    setCurrentOutput(gen.output_data);
  };

  if (loadingTool || authLoading) {
    return (
      <AppLayout showSidebar>
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-surface-tertiary dark:bg-dark-surface-tertiary" />
          <div className="mt-8 grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="h-64 animate-pulse rounded-xl bg-surface-tertiary dark:bg-dark-surface-tertiary" />
            </div>
            <div className="h-64 animate-pulse rounded-xl bg-surface-tertiary dark:bg-dark-surface-tertiary" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!toolData) {
    return null;
  }

  const isLocked = toolData.is_premium && profile?.plan_type === 'free';

  return (
    <AppLayout showSidebar>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Back + title */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link
              href="/"
              className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-text-tertiary transition-colors hover:text-text-primary dark:text-dark-text-tertiary dark:hover:text-dark-text-primary"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Back to tools
            </Link>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{toolData.icon}</span>
              <div>
                <h1 className="text-xl font-bold text-text-primary dark:text-dark-text-primary">
                  {toolData.name}
                </h1>
                <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
                  {toolData.description}
                </p>
              </div>
              {toolData.is_premium && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 px-3 py-1 text-xs font-semibold text-amber-600 ring-1 ring-amber-500/20 dark:text-amber-400">
                  <Sparkles className="h-3 w-3" />
                  Premium
                </span>
              )}
            </div>
          </div>

          {/* Credits display */}
          {user && profile && (
            <div className="hidden items-center gap-2 rounded-lg border border-border bg-surface-secondary px-3 py-2 sm:flex dark:border-dark-border dark:bg-dark-surface-secondary">
              <ArrowUpCircle className="h-4 w-4 text-brand-500" />
              <span className="text-xs font-medium text-text-secondary dark:text-dark-text-secondary">
                {profile.credits_remaining} / {USAGE_LIMITS[profile.plan_type as keyof typeof USAGE_LIMITS] || 30} credits
              </span>
            </div>
          )}
        </div>

        {/* Locked overlay */}
        {isLocked && (
          <div className="mb-6 rounded-xl border border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-orange-500/5 p-4 dark:border-amber-500/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Premium Tool</p>
                  <p className="text-xs text-amber-600/70 dark:text-amber-400/70">Upgrade to Pro or Business to use this tool</p>
                </div>
              </div>
              <Link
                href="/pricing"
                className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600"
              >
                Upgrade
              </Link>
            </div>
          </div>
        )}

        {/* Main content */}
        <div className={cn('grid gap-8 lg:grid-cols-3', isLocked && 'pointer-events-none opacity-50')}>
          {/* Form + Output */}
          <div className="space-y-6 lg:col-span-2">
            {!isLocked && (
              <div className="rounded-xl border border-border bg-surface p-5 dark:border-dark-border dark:bg-dark-surface">
                <ToolForm
                  tool={toolData as any}
                  onSubmit={handleGenerate}
                  loading={generating}
                />
              </div>
            )}
            <OutputPanel
              content={currentOutput}
              loading={generating}
              toolName={toolData.name}
            />
          </div>

          {/* History sidebar */}
          <div className="order-first lg:order-last">
            <div className="rounded-xl border border-border bg-surface dark:border-dark-border dark:bg-dark-surface">
              <div className="border-b border-border px-4 py-3 dark:border-dark-border">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary dark:text-dark-text-tertiary">
                  History
                </h2>
              </div>
              <div className="p-3">
                {user ? (
                  <HistoryList
                    generations={generations}
                    onSelect={handleSelectGeneration}
                    onDelete={handleDeleteGeneration}
                    loading={historyLoading}
                    toolName={toolData.name}
                  />
                ) : (
                  <div className="py-6 text-center">
                    <p className="text-xs text-text-tertiary dark:text-dark-text-tertiary">
                      Sign in to see your history
                    </p>
                    <Link
                      href="/auth/login"
                      className="mt-2 inline-block text-xs font-medium text-brand-500 hover:text-brand-600"
                    >
                      Sign in
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

// Helper to convert file to base64 string
function fileToBase64(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}
