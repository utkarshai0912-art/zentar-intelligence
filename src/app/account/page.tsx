'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/auth-context';
import { updateUserProfile } from '@/lib/supabase/queries';
import { Sparkles, Mail, User, Phone, Calendar, CreditCard, Save } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function AccountPage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setPhone(profile.phone || '');
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await updateUserProfile(user.id, { name, phone });
      toast.success('Profile updated');
      refreshProfile();
    } catch (err) {
      toast.error('Failed to update profile');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-3xl px-4 py-8">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-surface-tertiary dark:bg-dark-surface-tertiary" />
          <div className="mt-8 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-surface-tertiary dark:bg-dark-surface-tertiary" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!user) {
    return (
      <AppLayout>
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
          <div className="text-center">
            <p className="text-text-secondary dark:text-dark-text-secondary">Please sign in to view your account.</p>
            <Link href="/auth/login" className="mt-2 inline-block text-brand-500 hover:text-brand-600">Sign in</Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  const planBadge = (plan: string) => {
    if (plan === 'pro') return 'bg-brand-500/10 text-brand-600 ring-brand-500/20';
    if (plan === 'business') return 'bg-purple-500/10 text-purple-600 ring-purple-500/20';
    return 'bg-surface-tertiary text-text-tertiary ring-border dark:bg-dark-surface-tertiary dark:text-dark-text-tertiary dark:ring-dark-border';
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary">Account Settings</h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-dark-text-secondary">Manage your profile and plan</p>

        {/* Profile Card */}
        <div className="mt-8 rounded-xl border border-border bg-surface dark:border-dark-border dark:bg-dark-surface">
          <div className="border-b border-border px-6 py-4 dark:border-dark-border">
            <h2 className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">Profile</h2>
          </div>
          <form onSubmit={handleSave} className="p-6 space-y-5">
            <div className="flex items-center gap-4 pb-5 border-b border-border dark:border-dark-border">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-500/10 ring-2 ring-brand-500/20">
                <span className="text-xl font-bold text-brand-500">
                  {(profile?.name || 'U').charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-semibold text-text-primary dark:text-dark-text-primary">{profile?.name || 'User'}</p>
                <p className="text-sm text-text-secondary dark:text-dark-text-secondary">{profile?.email}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-text-primary dark:text-dark-text-primary">
                  <User className="h-4 w-4 text-text-tertiary" />
                  Full name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface-secondary px-4 py-2.5 text-sm text-text-primary transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-dark-border dark:bg-dark-surface-secondary dark:text-dark-text-primary"
                />
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-text-primary dark:text-dark-text-primary">
                  <Phone className="h-4 w-4 text-text-tertiary" />
                  Phone (optional)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full rounded-xl border border-border bg-surface-secondary px-4 py-2.5 text-sm text-text-primary transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-dark-border dark:bg-dark-surface-secondary dark:text-dark-text-primary"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-brand-600 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Plan Info */}
        <div className="mt-6 rounded-xl border border-border bg-surface dark:border-dark-border dark:bg-dark-surface">
          <div className="border-b border-border px-6 py-4 dark:border-dark-border">
            <h2 className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">Current Plan</h2>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-text-primary capitalize dark:text-dark-text-primary">
                    {profile?.plan_type || 'Free'}
                  </h3>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${planBadge(profile?.plan_type || 'free')}`}>
                    <Sparkles className="h-3 w-3" />
                    {profile?.plan_type || 'free'}
                  </span>
                </div>
                <p className="mt-1 text-sm text-text-secondary dark:text-dark-text-secondary">
                  {profile?.credits_remaining ?? 0} credits remaining
                </p>
              </div>
              <Link
                href="/pricing"
                className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
              >
                {profile?.plan_type === 'free' ? 'Upgrade' : 'Manage'}
              </Link>
            </div>

            <div className="mt-4 flex flex-wrap gap-4">
              <div className="flex items-center gap-2 text-xs text-text-tertiary dark:text-dark-text-tertiary">
                <Calendar className="h-3.5 w-3.5" />
                Joined {profile?.signup_date ? new Date(profile.signup_date).toLocaleDateString() : 'N/A'}
              </div>
              <div className="flex items-center gap-2 text-xs text-text-tertiary dark:text-dark-text-tertiary">
                <Mail className="h-3.5 w-3.5" />
                {profile?.email}
              </div>
              {profile?.subscription_status && (
                <div className="flex items-center gap-2 text-xs text-text-tertiary dark:text-dark-text-tertiary">
                  <CreditCard className="h-3.5 w-3.5" />
                  {profile.subscription_status}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation links */}
        <div className="mt-6">
          <Link
            href="/billing"
            className="inline-flex items-center gap-2 text-sm font-medium text-brand-500 hover:text-brand-600"
          >
            View Billing History &rarr;
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
