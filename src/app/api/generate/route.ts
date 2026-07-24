import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';

const PROVIDER = (process.env.AI_API_PROVIDER || 'openai').trim();
const MODEL = (process.env.AI_MODEL || 'gpt-4o-mini').trim();
const BASE_URL = (process.env.AI_API_BASE_URL || '').trim() || undefined;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { toolSlug, input, image } = await request.json();

  if (!toolSlug || !input) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Fetch tool system instructions from Supabase
  const { data: tool } = await supabase
    .from('tools')
    .select('*')
    .eq('slug', toolSlug)
    .single();

  const systemInstructions = tool?.system_instructions || 'You are a helpful AI assistant.';

  // Check usage limits
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!profile || profile.credits_remaining <= 0) {
    return NextResponse.json({ error: 'No credits remaining' }, { status: 403 });
  }

  // Check premium access
  if (tool?.is_premium && profile.plan_type === 'free') {
    return NextResponse.json({ error: 'Premium tool requires upgrade' }, { status: 403 });
  }

  try {
    const apiKey = process.env.AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI API key not configured' }, { status: 500 });
    }

    let output = '';

    if (image) {
      // Vision request
      if (PROVIDER === 'openai') {
        const openai = new OpenAI({ apiKey, baseURL: BASE_URL, timeout: 20000 });
        const res = await openai.chat.completions.create({
          model: MODEL,
          messages: [
            { role: 'system', content: systemInstructions },
            {
              role: 'user',
              content: [
                { type: 'text', text: input },
                { type: 'image_url', image_url: { url: image } },
              ],
            },
          ],
        });
        output = res.choices[0]?.message?.content || '';
      } else {
        // Anthropic for vision
        const { default: Anthropic } = await import('@anthropic-ai/sdk');
        const anthropic = new Anthropic({ apiKey });
        const res = await anthropic.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 4096,
          system: systemInstructions,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: input },
                { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image.split(',')[1] || image } },
              ],
            },
          ],
        });
        output = res.content[0]?.type === 'text' ? res.content[0].text : '';
      }
    } else {
      // Text-only request
      if (PROVIDER === 'openai') {
        const openai = new OpenAI({ apiKey, baseURL: BASE_URL, timeout: 20000 });
        const res = await openai.chat.completions.create({
          model: MODEL,
          messages: [
            { role: 'system', content: systemInstructions },
            { role: 'user', content: input },
          ],
        });
        output = res.choices[0]?.message?.content || '';
      } else {
        const { default: Anthropic } = await import('@anthropic-ai/sdk');
        const anthropic = new Anthropic({ apiKey });
        const res = await anthropic.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 4096,
          system: systemInstructions,
          messages: [{ role: 'user', content: input }],
        });
        output = res.content[0]?.type === 'text' ? res.content[0].text : '';
      }
    }

    // Deduct credit
    await supabase
      .from('users')
      .update({ credits_remaining: profile.credits_remaining - 1 })
      .eq('user_id', user.id);

    return NextResponse.json({ output });
  } catch (err: any) {
    console.error('AI generation error:', err);
    return NextResponse.json({ error: err.message || 'Generation failed' }, { status: 500 });
  }
}
