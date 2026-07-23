'use client';

import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/auth-context';
import { getUserTransactions } from '@/lib/supabase/queries';
import type { Transaction } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { CreditCard, Download, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function BillingPage() {
  const { user, loading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchTransactions = async () => {
      try {
        const data = await getUserTransactions(user.id);
        if (data) setTransactions(data as Transaction[]);
      } catch (err) {
        console.error('Failed to load transactions');
      }
      setLoading(false);
    };
    fetchTransactions();
  }, [user]);

  if (authLoading || loading) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-3xl px-4 py-8">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-surface-tertiary dark:bg-dark-surface-tertiary" />
        </div>
      </AppLayout>
    );
  }

  if (!user) {
    return (
      <AppLayout>
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
          <p className="text-text-secondary dark:text-dark-text-secondary">Please sign in to view billing.</p>
        </div>
      </AppLayout>
    );
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case 'captured': return 'bg-green-500/10 text-green-600 ring-green-500/20';
      case 'created': return 'bg-amber-500/10 text-amber-600 ring-amber-500/20';
      case 'failed': return 'bg-red-500/10 text-red-600 ring-red-500/20';
      case 'refunded': return 'bg-blue-500/10 text-blue-600 ring-blue-500/20';
      default: return 'bg-surface-tertiary text-text-tertiary ring-border';
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/account"
          className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-text-tertiary hover:text-text-primary dark:text-dark-text-tertiary dark:hover:text-dark-text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Account
        </Link>

        <h1 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary">Billing History</h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-dark-text-secondary">
          View your payment history and download receipts
        </p>

        {transactions.length === 0 ? (
          <div className="mt-8 flex flex-col items-center justify-center rounded-xl border border-border bg-surface-secondary py-12 dark:border-dark-border dark:bg-dark-surface-secondary">
            <CreditCard className="mb-3 h-10 w-10 text-text-tertiary dark:text-dark-text-tertiary" />
            <p className="text-sm text-text-tertiary dark:text-dark-text-tertiary">No transactions yet</p>
            <Link
              href="/pricing"
              className="mt-2 text-sm font-medium text-brand-500 hover:text-brand-600"
            >
              Upgrade your plan
            </Link>
          </div>
        ) : (
          <div className="mt-8 overflow-hidden rounded-xl border border-border dark:border-dark-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-secondary dark:border-dark-border dark:bg-dark-surface-secondary">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-tertiary">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-tertiary">Plan</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-tertiary">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-tertiary">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-tertiary">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border dark:divide-dark-border">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="bg-surface transition-colors hover:bg-surface-secondary dark:bg-dark-surface dark:hover:bg-dark-surface-secondary">
                    <td className="px-4 py-3 text-text-primary dark:text-dark-text-primary">{formatDate(tx.created_at)}</td>
                    <td className="px-4 py-3 capitalize text-text-primary dark:text-dark-text-primary">{tx.plan}</td>
                    <td className="px-4 py-3 text-text-primary dark:text-dark-text-primary">₹{tx.amount}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${statusBadge(tx.status)}`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {tx.razorpay_payment_id && (
                        <a
                          href={`https://dashboard.razorpay.com/app/payments/${tx.razorpay_payment_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-brand-500 hover:text-brand-600"
                        >
                          <Download className="h-3 w-3" />
                          Receipt
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
