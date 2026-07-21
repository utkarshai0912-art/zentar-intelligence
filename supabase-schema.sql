-- =============================================
-- Zentar Intelligence - Complete Database Schema
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Users Profile Table
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL,
  name TEXT,
  email TEXT,
  phone TEXT,
  signup_date TIMESTAMP DEFAULT NOW(),
  plan_type TEXT DEFAULT 'free' CHECK (plan_type IN ('free', 'pro', 'business')),
  subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'inactive', 'past_due', 'cancelled')),
  subscription_renewal_date TIMESTAMP,
  razorpay_customer_id TEXT,
  credits_remaining INTEGER DEFAULT 30,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Tools Table (AI tool configurations)
CREATE TABLE IF NOT EXISTS tools (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT NOT NULL DEFAULT '🤖',
  description TEXT,
  system_instructions TEXT NOT NULL DEFAULT '',
  input_type TEXT DEFAULT 'long_text' CHECK (input_type IN ('short_text', 'long_text', 'image_upload')),
  output_type TEXT DEFAULT 'text' CHECK (output_type IN ('text', 'code', 'markdown')),
  is_premium BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Generations History Table
CREATE TABLE IF NOT EXISTS generations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tool_id TEXT NOT NULL,
  input_data TEXT,
  output_data TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Transactions / Payments Table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount DECIMAL(10,2),
  currency TEXT DEFAULT 'INR',
  plan TEXT,
  status TEXT DEFAULT 'created' CHECK (status IN ('created', 'captured', 'failed', 'refunded')),
  razorpay_payment_id TEXT,
  razorpay_order_id TEXT,
  razorpay_subscription_id TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- Indexes for performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_generations_user_id ON generations(user_id);
CREATE INDEX IF NOT EXISTS idx_generations_tool_id ON generations(tool_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_tools_slug ON tools(slug);

-- =============================================
-- Seed the 8 default tools
-- =============================================
INSERT INTO tools (name, slug, icon, description, system_instructions, input_type, output_type, is_premium) VALUES
(
  'AI Thumbnail Analyser',
  'thumbnail-analyser',
  '🎯',
  'Upload a thumbnail image and get a CTR-potential score with specific fixes.',
  'You are an expert YouTube thumbnail analyst. Analyze the uploaded thumbnail image and provided title/niche. Return:
1. **CTR Score** (0-100) with a visual indicator
2. **What''s Working** — 3-5 specific strengths
3. **What''s Weak** — 3-5 specific weaknesses
4. **Specific Fixes** — actionable improvements the creator can make

Be brutally honest but constructive. Use specific design terminology (color theory, composition, hierarchy, contrast, face visibility, text readability).',
  'image_upload',
  'markdown',
  FALSE
),
(
  'AI Thumbnail Maker',
  'thumbnail-maker',
  '🎨',
  'Describe your video and get a thumbnail design brief with image prompts.',
  'You are a professional thumbnail designer for YouTube. Based on the video description provided:

1. **Thumbnail Design Brief** — composition, color scheme, focal point, text overlay suggestions
2. **Image Generation Prompt** — a detailed prompt the user can copy into Midjourney/DALL-E/Leonardo to generate the thumbnail

Be specific about layout, lighting, emotions, and composition. Include font recommendations for text overlays.',
  'long_text',
  'markdown',
  FALSE
),
(
  'AI Logo Prompter',
  'logo-prompter',
  '🪄',
  'Turn your brand description into logo concepts and image-gen prompts.',
  'You are a brand identity designer. Based on the brand description:

1. **Logo Concept Directions** — 3 distinct logo concepts (e.g., minimalist, illustrative, typographic)
2. **Image-Gen Prompts** — for each concept, a detailed prompt ready for Midjourney/DALL-E

Consider industry, brand personality, color psychology, and scalability.',
  'long_text',
  'markdown',
  FALSE
),
(
  'AI Message Writer',
  'message-writer',
  '✉️',
  'Craft polished outreach messages with multiple tone variants.',
  'You are a professional copywriter specializing in client outreach. Based on the brief provided:

Write the outreach message in 3 tone variants:
1. **Professional & Polished** — formal, credible
2. **Warm & Friendly** — conversational, approachable
3. **Direct & Results-Driven** — short, punchy, value-focused

Each variant should be complete and ready to send. Keep messages under 200 words.',
  'long_text',
  'markdown',
  FALSE
),
(
  'AI Web Prompter',
  'web-prompter',
  '🌐',
  'Get a structured website build prompt from your business description.',
  'You are a senior web strategist and UX architect. Based on the business description:

1. **Site Structure** — recommended sections and pages with rationale
2. **Copy Direction** — tone, voice, key messaging for each section
3. **Layout Notes** — layout patterns, component hierarchy, visual emphasis
4. **Build Prompt** — a complete structured prompt the user can give to a web developer or AI web builder

Prioritize conversion and user experience. Be specific about calls-to-action.',
  'long_text',
  'markdown',
  TRUE
),
(
  'AI Objection Handler',
  'objection-handler',
  '🤝',
  'Turn client objections into professional, persuasive responses.',
  'You are a sales negotiation expert. For each client objection:

1. **Acknowledge & Validate** — show you understand their concern
2. **Reframe** — present a new perspective
3. **Response** — a complete professional reply they can send or use

Cover the emotional subtext behind the objection. Keep responses practical and ready-to-use.',
  'long_text',
  'markdown',
  FALSE
),
(
  'AI UGC / Ads Prompter',
  'ugc-ads-prompter',
  '📱',
  'Generate UGC-style ad scripts from your product details.',
  'You are a UGC (User Generated Content) ad strategist. Based on the product description:

1. **Hook Concepts** — 3 attention-grabbing hooks for 15-60 second ads
2. **Full Scripts** — 2 complete UGC ad scripts with visual directions, voiceover, and text overlay cues
3. **Best Platform Notes** — which platform each script suits (TikTok, Instagram Reels, YouTube Shorts)

Make scripts feel authentic, not overly produced. Include "this feels like a real person" authenticity cues.',
  'long_text',
  'markdown',
  TRUE
),
(
  'AI Script Writer',
  'script-writer',
  '🎬',
  'Turn a topic or outline into a full video script.',
  'You are a professional video script writer for YouTube. Based on the topic/outline:

1. **Hook** (0-30s) — attention-grabbing opening
2. **Body** — structured main content with timestamps, visual cues, and key points
3. **CTA** — natural call to action

Include visual/editing suggestions in [brackets]. Optimize for retention — keep pacing tight. Aim for 5-10 minute video length unless specified otherwise.',
  'long_text',
  'markdown',
  FALSE
)
ON CONFLICT (slug) DO NOTHING;

-- =============================================
-- Enable Row Level Security (optional but recommended)
-- =============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY user_own_data ON users
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY user_own_generations ON generations
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY user_own_transactions ON transactions
  FOR ALL USING (auth.uid() = user_id);

-- Tools table: public read
ALTER TABLE tools ENABLE ROW LEVEL SECURITY;
CREATE POLICY tools_public_read ON tools
  FOR SELECT USING (TRUE);
