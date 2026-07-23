import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

const PLANS: Record<string, { credits: number; name: string }> = {
  pro: { credits: 300, name: 'Pro' },
  business: { credits: 9999, name: 'Business' },
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const {
    razorpay_payment_id,
    razorpay_order_id,
    razorpay_signature,
    planId,
  } = await request.json();

  // Verify signature
  const secret = process.env.RAZORPAY_KEY_SECRET || '';
  const generatedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (generatedSignature !== razorpay_signature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const plan = PLANS[planId];
  if (!plan) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  // Update user plan and credits
  await supabase
    .from('users')
    .update({
      plan_type: planId,
      credits_remaining: plan.credits,
      subscription_status: 'active',
    })
    .eq('user_id', user.id);

  // Record transaction
  await supabase.from('transactions').insert({
    user_id: user.id,
    razorpay_payment_id,
    razorpay_order_id,
    plan: planId,
    amount: PLANS[planId].credits === 9999 ? 149900 : 49900,
    currency: 'INR',
    status: 'captured',
  });

  return NextResponse.json({ success: true });
}
