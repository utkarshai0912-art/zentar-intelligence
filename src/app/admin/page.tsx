'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';
import type { Tool } from '@/lib/types';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, X, Sparkles, Shield, Save, RefreshCw } from 'lucide-react';

export default function AdminPage() {
  const { user } = useAuth();
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', icon: '', description: '', system_instructions: '',
    input_type: 'long_text' as const, output_type: 'text' as const, is_premium: false, is_active: true,
  });

  const PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123';

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    if (password === PASSWORD) {
      setAuthenticated(true);
      localStorage.setItem('zentar-admin-auth', 'true');
    } else {
      toast.error('Invalid password');
    }
    setAuthLoading(false);
  };

  const fetchTools = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('tools')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setTools(data as Tool[]);
    } catch {
      toast.error('Failed to load tools');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const cached = localStorage.getItem('zentar-admin-auth');
    if (cached === 'true') setAuthenticated(true);
  }, []);

  useEffect(() => {
    if (authenticated) fetchTools();
  }, [authenticated, fetchTools]);

  const resetForm = () => {
    setForm({ name: '', icon: '', description: '', system_instructions: '', input_type: 'long_text', output_type: 'text', is_premium: false, is_active: true });
    setEditingTool(null);
    setShowForm(false);
  };

  const handleEdit = (tool: Tool) => {
    setEditingTool(tool);
    setForm({
      name: tool.name, icon: tool.icon, description: tool.description,
      system_instructions: tool.system_instructions, input_type: tool.input_type,
      output_type: tool.output_type, is_premium: tool.is_premium, is_active: tool.is_active,
    });
    setShowForm(true);
  };

  const callAdminApi = async (action: string, toolData?: any, id?: string) => {
    const res = await fetch('/api/admin/tools', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PASSWORD}`,
      },
      body: JSON.stringify({ action, toolData, id }),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  };

  const slugify = (text: string) =>
    text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const toolData = {
      name: form.name,
      slug: slugify(form.name),
      icon: form.icon,
      description: form.description,
      system_instructions: form.system_instructions,
      input_type: form.input_type,
      output_type: form.output_type,
      is_premium: form.is_premium,
      is_active: form.is_active,
    };

    try {
      if (editingTool) {
        await callAdminApi('update', toolData, editingTool.id);
        toast.success('Tool updated');
      } else {
        await callAdminApi('create', toolData);
        toast.success('Tool created');
      }
      resetForm();
      fetchTools();
    } catch {
      toast.error('Failed to save tool');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this tool? This cannot be undone.')) return;
    try {
      await callAdminApi('delete', undefined, id);
      toast.success('Tool deleted');
      fetchTools();
    } catch {
      toast.error('Failed to delete tool');
    }
  };

  if (!authenticated) {
    return (
      <AppLayout>
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
          <div className="w-full max-w-sm">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10 ring-1 ring-brand-500/20">
                <Shield className="h-6 w-6 text-brand-500" />
              </div>
              <h1 className="text-xl font-bold text-text-primary dark:text-dark-text-primary">Admin Access</h1>
              <p className="mt-1 text-sm text-text-secondary dark:text-dark-text-secondary">Enter admin password to continue</p>
            </div>
            <form onSubmit={handleAuth} className="space-y-4">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Admin password"
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-primary placeholder-text-tertiary transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-dark-border dark:bg-dark-surface dark:text-dark-text-primary dark:placeholder-dark-text-tertiary"
              />
              <button
                type="submit"
                disabled={authLoading}
                className="w-full rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
              >
                {authLoading ? 'Checking...' : 'Enter'}
              </button>
            </form>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary">Admin Panel</h1>
            <p className="text-sm text-text-secondary dark:text-dark-text-secondary">Manage your AI tools</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchTools}
              className="flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-tertiary dark:border-dark-border dark:text-dark-text-secondary dark:hover:bg-dark-surface-tertiary"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
            >
              <Plus className="h-4 w-4" />
              Add Tool
            </button>
          </div>
        </div>

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-surface p-6 dark:border-dark-border dark:bg-dark-surface">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary">
                  {editingTool ? 'Edit Tool' : 'Add New Tool'}
                </h2>
                <button onClick={resetForm} className="p-1 text-text-tertiary hover:text-text-primary dark:text-dark-text-tertiary dark:hover:text-dark-text-primary">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Name</label>
                    <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
                      className="w-full rounded-xl border border-border bg-surface-secondary px-4 py-2.5 text-sm dark:border-dark-border dark:bg-dark-surface-secondary" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Icon (emoji)</label>
                    <input type="text" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} required
                      className="w-full rounded-xl border border-border bg-surface-secondary px-4 py-2.5 text-sm dark:border-dark-border dark:bg-dark-surface-secondary" />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Description</label>
                  <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required
                    className="w-full rounded-xl border border-border bg-surface-secondary px-4 py-2.5 text-sm dark:border-dark-border dark:bg-dark-surface-secondary" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">System Instructions</label>
                  <textarea value={form.system_instructions} onChange={(e) => setForm({ ...form, system_instructions: e.target.value })} required rows={8}
                    className="w-full rounded-xl border border-border bg-surface-secondary px-4 py-2.5 text-sm font-mono dark:border-dark-border dark:bg-dark-surface-secondary" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Input Type</label>
                    <select value={form.input_type} onChange={(e) => setForm({ ...form, input_type: e.target.value as any })}
                      className="w-full rounded-xl border border-border bg-surface-secondary px-4 py-2.5 text-sm dark:border-dark-border dark:bg-dark-surface-secondary">
                      <option value="short_text">Short Text</option>
                      <option value="long_text">Long Text</option>
                      <option value="image_upload">Image Upload</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Output Type</label>
                    <select value={form.output_type} onChange={(e) => setForm({ ...form, output_type: e.target.value as any })}
                      className="w-full rounded-xl border border-border bg-surface-secondary px-4 py-2.5 text-sm dark:border-dark-border dark:bg-dark-surface-secondary">
                      <option value="text">Text</option>
                      <option value="markdown">Markdown</option>
                      <option value="code">Code</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.is_premium} onChange={(e) => setForm({ ...form, is_premium: e.target.checked })}
                      className="rounded border-border text-brand-500 focus:ring-brand-500" />
                    <span className="text-sm font-medium">Premium</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                      className="rounded border-border text-brand-500 focus:ring-brand-500" />
                    <span className="text-sm font-medium">Active</span>
                  </label>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50">
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving...' : editingTool ? 'Update Tool' : 'Create Tool'}
                  </button>
                  <button type="button" onClick={resetForm}
                    className="rounded-xl border border-border px-6 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-tertiary dark:border-dark-border dark:text-dark-text-secondary dark:hover:bg-dark-surface-tertiary">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-surface-tertiary dark:bg-dark-surface-tertiary" />
            ))}
          </div>
        ) : tools.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface-secondary py-16 dark:border-dark-border dark:bg-dark-surface-secondary">
            <Sparkles className="mb-3 h-10 w-10 text-text-tertiary dark:text-dark-text-tertiary" />
            <p className="text-sm text-text-tertiary dark:text-dark-text-tertiary">No tools found</p>
            <button onClick={() => setShowForm(true)} className="mt-2 text-sm font-medium text-brand-500 hover:text-brand-600">Add your first tool</button>
          </div>
        ) : (
          <div className="space-y-2">
            {tools.map((tool) => (
              <div key={tool.id} className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4 transition-colors hover:bg-surface-secondary dark:border-dark-border dark:bg-dark-surface dark:hover:bg-dark-surface-secondary">
                <span className="text-2xl">{tool.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-text-primary dark:text-dark-text-primary">{tool.name}</h3>
                    {tool.is_premium && <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 ring-1 ring-amber-500/20">Premium</span>}
                    {!tool.is_active && <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-600 ring-1 ring-red-500/20">Inactive</span>}
                  </div>
                  <p className="text-xs text-text-tertiary dark:text-dark-text-tertiary truncate">{tool.description}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleEdit(tool)} className="flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-surface-tertiary hover:text-brand-500 dark:text-dark-text-tertiary dark:hover:bg-dark-surface-tertiary">
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(tool.id)} className="flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-red-500/10 hover:text-red-500 dark:text-dark-text-tertiary dark:hover:bg-red-500/10">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
