import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { planId } = await request.json();

    const planPrices: Record<string, { amount: number; description: string }> = {
      pro: { amount: 49900, description: 'Pro Plan - Monthly' },
      business: { amount: 149900, description: 'Business Plan - Monthly' },
    };

    const plan = planPrices[planId];
    if (!plan) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // Initialize Razorpay
    const Razorpay = (await import('razorpay')).default;
    const razorpay = new Razorpay({
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    // Create order
    const order = await razorpay.orders.create({
      amount: plan.amount,
      currency: 'INR',
      receipt: `receipt_${user.id}_${Date.now()}`,
      notes: {
        userId: user.id,
        planId,
      },
    });

    // Save transaction as pending
    await supabase.from('transactions').insert({
      user_id: user.id,
      amount: plan.amount / 100,
      currency: 'INR',
      plan: planId,
      status: 'created',
      razorpay_order_id: order.id,
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error: any) {
    console.error('Razorpay order error:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
