import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const input = formData.get('input') as string || '';
    const toolSlug = formData.get('tool_slug') as string;
    const systemInstructions = formData.get('system_instructions') as string;
    const imageFile = formData.get('image') as File | null;

    if (!toolSlug || !systemInstructions) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check user credits
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const creditsRemaining = profile.credits_remaining ?? 0;
    if (creditsRemaining <= 0) {
      // Check if they have a plan with unlimited
      if (profile.plan_type !== 'business') {
        return NextResponse.json({ error: 'No credits remaining. Upgrade your plan.' }, { status: 403 });
      }
    }

    // Check if premium tool is accessible
    const { data: toolData } = await supabase
      .from('tools')
      .select('is_premium')
      .eq('slug', toolSlug)
      .single();

    const isPremiumTool = toolData?.is_premium ?? false;
    if (isPremiumTool && profile.plan_type === 'free') {
      return NextResponse.json({ error: 'This is a premium tool. Upgrade to access.' }, { status: 403 });
    }

    // Build the user message
    let userMessage = input;
    if (imageFile) {
      // Convert image to base64
      const bytes = await imageFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64 = buffer.toString('base64');
      const mimeType = imageFile.type;
      userMessage = `[Image attached: data:${mimeType};base64,${base64}]\n\nAdditional context: ${input || 'No additional context provided.'}`;
    }

    if (!userMessage.trim()) {
      return NextResponse.json({ error: 'Input is required' }, { status: 400 });
    }

    // Call AI API
    const provider = process.env.AI_API_PROVIDER || 'openai';
    let output = '';

    try {
      if (provider === 'openai') {
        const { default: OpenAI } = await import('openai');
        const openai = new OpenAI({
          apiKey: process.env.AI_API_KEY,
        });

        const messages: any[] = [
          { role: 'system', content: systemInstructions },
          { role: 'user', content: userMessage },
        ];

        // Handle image for OpenAI vision
        if (imageFile) {
          const bytes = await imageFile.arrayBuffer();
          const buffer = Buffer.from(bytes);
          const base64 = buffer.toString('base64');
          const mimeType = imageFile.type;

          messages[1] = {
            role: 'user',
            content: [
              { type: 'text', text: input || 'Analyze this thumbnail image.' },
              {
                type: 'image_url',
                image_url: { url: `data:${mimeType};base64,${base64}` },
              },
            ],
          };
        }

        const completion = await openai.chat.completions.create({
          model: process.env.AI_MODEL || 'gpt-4o-mini',
          messages,
          max_tokens: 4096,
        });

        output = completion.choices[0]?.message?.content || 'No response generated.';
      } else if (provider === 'anthropic') {
        const Anthropic = (await import('@anthropic-ai/sdk')).default;
        const anthropic = new Anthropic({
          apiKey: process.env.AI_API_KEY,
        });

        const messages: any[] = [];
        if (imageFile) {
          const bytes = await imageFile.arrayBuffer();
          const buffer = Buffer.from(bytes);
          const base64 = buffer.toString('base64');
          const mimeType = imageFile.type;

          messages.push({
            role: 'user',
            content: [
              { type: 'text', text: input || 'Analyze this thumbnail image.' },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType,
                  data: base64,
                },
              },
            ],
          });
        } else {
          messages.push({ role: 'user', content: input });
        }

        const msg = await anthropic.messages.create({
          model: process.env.AI_MODEL || 'claude-3-haiku-20240307',
          system: systemInstructions,
          messages,
          max_tokens: 4096,
        });

        output = msg.content.map((block: any) => block.text || '').join('\n');
      } else {
        // Fallback to mock for development
        output = `**AI Response for "${toolSlug}"**\n\nThis is a simulated response. Connect a real AI provider (OpenAI or Anthropic) in your .env.local file to get actual AI-generated content.\n\n**Your input was:**\n${input || '(image uploaded)'}`;
      }
    } catch (aiError: any) {
      console.error('AI API error:', aiError);
      // Fallback response on API failure
      output = `**AI Generation (Fallback)**\n\nUnable to reach the AI provider. Please check your API key configuration.\n\n**Error:** ${aiError.message || 'Unknown error'}\n\n**Your input was:**\n${input || '(image uploaded)'}`;
    }

    // Save generation to history
    const { error: insertError } = await supabase.from('generations').insert({
      user_id: user.id,
      tool_id: toolSlug,
      input_data: input || '(image uploaded)',
      output_data: output,
    });

    if (insertError) {
      console.error('Failed to save generation:', insertError);
    }

    // Decrement credits
    if (profile.plan_type !== 'business') {
      await supabase
        .from('users')
        .update({ credits_remaining: Math.max(0, creditsRemaining - 1) })
        .eq('user_id', user.id);
    }

    return NextResponse.json({ output });

  } catch (error: any) {
    console.error('Generate API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
