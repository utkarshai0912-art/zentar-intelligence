import { createClient } from './client';
import type { Tool, Generation, Transaction, UserProfile } from '@/lib/types';

// ─── Tools ───────────────────────────────────────────────────────────────────

export async function getToolBySlug(slug: string): Promise<Tool | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('tools')
    .select('*')
    .eq('slug', slug)
    .single();
  return data as Tool | null;
}

export async function listTools(activeOnly = true) {
  const supabase = createClient();
  let q = supabase.from('tools').select('*').order('created_at', { ascending: true });
  if (activeOnly) q = q.eq('is_active', true);
  const { data } = await q;
  return (data || []) as Tool[];
}

// ─── Generations ─────────────────────────────────────────────────────────────

export async function getUserGenerations(userId: string): Promise<Generation[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('generations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return (data || []) as Generation[];
}

export async function addGeneration(
  userId: string,
  data: { tool_id: string; input_data: string; output_data: string }
): Promise<string | null> {
  const supabase = createClient();
  const { data: inserted, error } = await supabase
    .from('generations')
    .insert({ user_id: userId, ...data })
    .select('id')
    .single();
  return error ? null : inserted.id;
}

export async function deleteGeneration(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from('generations').delete().eq('id', id);
}

// ─── Transactions ────────────────────────────────────────────────────────────

export async function getUserTransactions(userId: string): Promise<Transaction[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return (data || []) as Transaction[];
}

// ─── User Profile ────────────────────────────────────────────────────────────

export async function updateUserProfile(
  userId: string,
  data: { name?: string; phone?: string }
) {
  const supabase = createClient();
  await supabase.from('users').update(data).eq('user_id', userId);
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('user_id', userId)
    .single();
  return data as UserProfile | null;
}
