import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

const PLANS: Record<string, { credits: number; name: string }> = {
  pro: { credits: 300, name: 'Pro' },
  business: { credits: 9999, name: 'Business' },
};

export async function POST(request: NextRequest) {
  const text = await request.text();
  const signature = request.headers.get('x-razorpay-signature') || '';

  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || '';
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(text)
    .digest('hex');

  if (signature !== expectedSignature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const event = JSON.parse(text);

  if (event.event === 'payment.captured') {
    const payment = event.payload.payment.entity;
    const orderId = payment.order_id;
    const planId = payment.notes?.planId || 'pro';
    const userId = payment.notes?.userId;

    if (userId) {
      const supabase = await createClient();
      const plan = PLANS[planId];

      await supabase
        .from('users')
        .update({
          plan_type: planId,
          credits_remaining: plan?.credits || 300,
          subscription_status: 'active',
        })
        .eq('user_id', userId);

      await supabase.from('transactions').insert({
        user_id: userId,
        razorpay_payment_id: payment.id,
        razorpay_order_id: orderId,
        plan: planId,
        amount: payment.amount,
        currency: payment.currency,
        status: 'captured',
      });
    }
  }

  return NextResponse.json({ received: true });
}
