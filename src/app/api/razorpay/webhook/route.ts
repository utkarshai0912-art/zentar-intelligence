import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }

    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(body);
    const supabase = await createClient();

    // Handle payment captured
    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      const orderId = payment.order_id;
      const paymentId = payment.id;
      const notes = payment.notes || {};
      const userId = notes.userId;
      const planId = notes.planId;

      // Update transaction
      await supabase
        .from('transactions')
        .update({
          status: 'captured',
          razorpay_payment_id: paymentId,
        })
        .eq('razorpay_order_id', orderId);

      // Update user plan if we have userId
      if (userId && planId) {
        const creditsMap: Record<string, number> = {
          pro: 300,
          business: 9999,
        };

        await supabase
          .from('users')
          .update({
            plan_type: planId,
            subscription_status: 'active',
            credits_remaining: creditsMap[planId] || 300,
            subscription_renewal_date: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000
            ).toISOString(),
          })
          .eq('user_id', userId);
      }
    }

    // Handle payment failed
    if (event.event === 'payment.failed') {
      const payment = event.payload.payment.entity;
      await supabase
        .from('transactions')
        .update({ status: 'failed' })
        .eq('razorpay_order_id', payment.order_id);
    }

    // Handle subscription expired/cancelled
    if (event.event === 'subscription.cancelled' || event.event === 'subscription.expired') {
      const subscription = event.payload.subscription.entity;
      const notes = subscription.notes || {};
      const userId = notes.userId;

      if (userId) {
        await supabase
          .from('users')
          .update({
            plan_type: 'free',
            subscription_status: 'inactive',
            credits_remaining: 30,
          })
          .eq('user_id', userId);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
