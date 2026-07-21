'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/auth-context';
import { PLANS } from '@/lib/types';
import { Sparkles, Check, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function PricingPage() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  const handleUpgrade = async (planId: string) => {
    if (!user) {
      toast.error('Please sign in first');
      return;
    }

    if (planId === 'free') {
      toast('You are already on the Free plan');
      return;
    }

    setLoading(planId);

    try {
      const res = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create order');
      }

      const data = await res.json();

      // Open Razorpay Checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: data.amount,
        currency: data.currency,
        name: 'Zentar Intelligence',
        description: `${planId.charAt(0).toUpperCase() + planId.slice(1)} Plan`,
        order_id: data.orderId,
        prefill: {
          name: profile?.name || '',
          email: user.email || '',
          contact: profile?.phone || '',
        },
        handler: async function (response: any) {
          // Verify payment
          const verifyRes = await fetch('/api/razorpay/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              planId,
            }),
          });

          if (verifyRes.ok) {
            toast.success('Payment successful! Your plan has been upgraded.');
            window.location.reload();
          } else {
            toast.error('Payment verification failed. Please contact support.');
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(null);
            toast.error('Payment cancelled');
          },
        },
      };

      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setLoading(null);
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-500/10 px-4 py-1.5 text-xs font-medium text-brand-500 ring-1 ring-brand-500/20">
            <Sparkles className="h-3.5 w-3.5" />
            Simple Pricing
          </div>
          <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary">
            Choose your plan
          </h1>
          <p className="mt-3 text-lg text-text-secondary dark:text-dark-text-secondary">
            Start free, upgrade when you need more
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const isCurrentPlan = profile?.plan_type === plan.slug;
            const isPopular = plan.is_popular;

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl border bg-surface p-6 dark:bg-dark-surface ${
                  isPopular
                    ? 'border-brand-500 shadow-lg shadow-brand-500/10'
                    : 'border-border dark:border-dark-border'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold text-white">
                      <Sparkles className="h-3 w-3" />
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary">
                    {plan.name}
                  </h3>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-text-primary dark:text-dark-text-primary">
                      ₹{plan.price}
                    </span>
                    <span className="text-sm text-text-tertiary dark:text-dark-text-tertiary">
                      /{plan.period === 'monthly' ? 'mo' : 'yr'}
                    </span>
                  </div>
                </div>

                <ul className="mb-8 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm text-text-secondary dark:text-dark-text-secondary">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {isCurrentPlan ? (
                  <div className="w-full rounded-xl border border-border bg-surface-secondary px-4 py-3 text-center text-sm font-medium text-text-secondary dark:border-dark-border dark:bg-dark-surface-secondary dark:text-dark-text-secondary">
                    Current Plan
                  </div>
                ) : plan.slug === 'free' ? (
                  <Link
                    href={user ? '/' : '/auth/signup'}
                    className="block w-full rounded-xl border border-border px-4 py-3 text-center text-sm font-semibold text-text-secondary transition-colors hover:bg-surface-tertiary dark:border-dark-border dark:text-dark-text-secondary dark:hover:bg-dark-surface-tertiary"
                  >
                    {user ? 'Your Current Plan' : 'Get Started Free'}
                  </Link>
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan.slug)}
                    disabled={loading === plan.slug}
                    className={`w-full rounded-xl px-4 py-3 text-sm font-semibold text-white transition-all ${
                      isPopular
                        ? 'bg-brand-500 hover:bg-brand-600 hover:shadow-lg hover:shadow-brand-500/20'
                        : 'bg-text-primary hover:bg-text-secondary dark:bg-dark-text-primary dark:hover:bg-dark-text-secondary'
                    } disabled:opacity-50`}
                  >
                    {loading === plan.slug ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </span>
                    ) : (
                      `Upgrade to ${plan.name}`
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Razorpay script */}
        <script src="https://checkout.razorpay.com/v1/checkout.js" />
      </div>
    </AppLayout>
  );
}
