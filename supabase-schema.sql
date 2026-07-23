-- Zentar Intelligence — Supabase PostgreSQL Schema
-- Run this in the Supabase SQL Editor to set up your database.

-- ─── Users ──────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL,
  name TEXT DEFAULT '',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  signup_date TIMESTAMPTZ DEFAULT NOW(),
  plan_type TEXT DEFAULT 'free' CHECK (plan_type IN ('free', 'pro', 'business')),
  subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'inactive', 'past_due', 'cancelled')),
  subscription_renewal_date TIMESTAMPTZ,
  razorpay_customer_id TEXT DEFAULT '',
  credits_remaining INT DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create user profile on signup via trigger
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (user_id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ─── Tools ──────────────────────────────────────────────────────────────────
CREATE TABLE tools (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT DEFAULT '',
  description TEXT DEFAULT '',
  system_instructions TEXT DEFAULT '',
  input_type TEXT DEFAULT 'long_text' CHECK (input_type IN ('short_text', 'long_text', 'image_upload')),
  output_type TEXT DEFAULT 'text' CHECK (output_type IN ('text', 'code', 'markdown')),
  is_premium BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Generations ────────────────────────────────────────────────────────────
CREATE TABLE generations (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  tool_id TEXT NOT NULL,
  input_data TEXT DEFAULT '',
  output_data TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Transactions ───────────────────────────────────────────────────────────
CREATE TABLE transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  amount INT NOT NULL,
  currency TEXT DEFAULT 'INR',
  plan TEXT NOT NULL,
  status TEXT DEFAULT 'created' CHECK (status IN ('created', 'captured', 'failed', 'refunded')),
  razorpay_payment_id TEXT DEFAULT '',
  razorpay_order_id TEXT DEFAULT '',
  razorpay_subscription_id TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Seed tools ─────────────────────────────────────────────────────────────
INSERT INTO tools (name, slug, icon, description, system_instructions, input_type, output_type, is_premium) VALUES

('AI Thumbnail Analyser', 'thumbnail-analyser', '🎯',
'Upload a thumbnail image and get a CTR-potential score with specific fixes.',
'You are an expert YouTube thumbnail analyst. Analyze the uploaded thumbnail image and provided title/niche. Return:
1. **CTR Score** (0-100) with a visual indicator
2. **What''s Working** — 3-5 specific strengths
3. **What''s Weak** — 3-5 specific weaknesses
4. **Specific Fixes** — actionable improvements the creator can make

Be brutally honest but constructive. Use specific design terminology (color theory, composition, hierarchy, contrast, face visibility, text readability).',
'image_upload', 'markdown', false),

('AI Thumbnail Maker', 'thumbnail-maker', '🖼️',
'Describe the thumbnail you want, and get a detailed creative brief.',
'You are an expert thumbnail designer. Based on the user''s video topic/style/niche, produce a detailed creative brief:
1. **Concept** — the big idea
2. **Color Palette** — specific hex codes and why they work
3. **Composition** — layout, focal points, face placement
4. **Typography** — font style, size, placement
5. **Text Copy** — 3-5 options for the thumbnail overlay

Be highly specific. Use real design principles.',
'long_text', 'markdown', false),

('AI Logo Prompter', 'logo-prompter', '✨',
'Describe your brand and get a ready-to-use AI image generation prompt for your logo.',
'You are an expert logo designer and AI prompt engineer. Given a brand description:
1. Distill the brand essence (personality, industry, vibe)
2. Produce 3 distinct logo prompt variants optimized for Midjourney/DALL-E
3. Explain the design rationale for each

Structure prompts with: subject, style, lighting, color palette, composition, technical parameters.',
'long_text', 'markdown', false),

('AI Message Writer', 'message-writer', '✍️',
'Turn raw thoughts into a polished, platform-optimized message or comment.',
'You are an expert copywriter and communication strategist. Given raw thoughts/talking points:
1. Rewrite into a polished message matching the user''s specified platform/tone
2. Keep it concise and punchy
3. Add hashtags or formatting as appropriate

Output: clean, ready-to-paste text. No preamble.',
'long_text', 'text', false),

('AI Web Prompter', 'web-prompter', '🌐',
'Generate viral-worthy content ideas and captions for your niche.',
'You are a viral content strategist. Given a topic/niche:
1. Generate 5 high-potential content ideas with hooks
2. Write 3 complete caption variants for each
3. Include SEO keywords and hashtag strategy

Focus on shareability, controversy (where appropriate), and trend-jacking opportunities.',
'long_text', 'markdown', true),

('AI Objection Handler', 'objection-handler', '🛡️',
'Turn any objection into a persuasive, professional response for sales or outreach.',
'You are a master closer and objection handler. Given a prospect''s objection:
1. Acknowledge and validate the concern
2. Reframe the objection as a reason to proceed
3. Provide 3 response options (empathetic, direct, value-focused)
4. Include follow-up questions to keep the conversation moving

Tone: confident but not pushy, helpful but not desperate.',
'long_text', 'markdown', false),

('AI UGC / Ads Prompter', 'ugc-ads-prompter', '📱',
'Get a complete UGC video script or ad concept tailored to your product.',
'You are a top-performing UGC creator and direct-response copywriter. Given a product/service:
1. Hook (first 3 seconds) — 5 options
2. Full 30-60 second script with timing cues
3. Visual direction for each scene
4. CTA strategy
5. 3 thumb-stopping title options

Focus on patterns that drive conversions: pattern interrupts, social proof, scarcity, specific benefits.',
'long_text', 'markdown', true),

('AI Script Writer', 'script-writer', '📝',
'Turn a topic or idea into a complete video script with structure and pacing.',
'You are a professional video scriptwriter for YouTube/short-form content. Given a topic:
1. **Hook** — first 15-30 seconds, high-impact opening
2. **Body** — structured narrative with pacing notes
3. **Visual Cues** — b-roll, text overlays, transitions
4. **CTA** — organic call to action
5. **Estimated Duration**

Write in a conversational, retention-optimized style. Include timestamps for each section.',
'long_text', 'markdown', false)

ON CONFLICT (slug) DO NOTHING;

-- ─── Row Level Security ─────────────────────────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Users: can read/update own profile
CREATE POLICY "users_select_own" ON users FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (auth.uid() = user_id);

-- Tools: everyone can read active tools
CREATE POLICY "tools_select_active" ON tools FOR SELECT USING (is_active = true OR auth.role() = 'service_role');

-- Generations: users can CRUD own
CREATE POLICY "generations_select_own" ON generations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "generations_insert_own" ON generations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "generations_delete_own" ON generations FOR DELETE USING (auth.uid() = user_id);

-- Transactions: users can read own
CREATE POLICY "transactions_select_own" ON transactions FOR SELECT USING (auth.uid() = user_id);
