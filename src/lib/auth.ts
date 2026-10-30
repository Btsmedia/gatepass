import 'server-only';
import { redirect } from 'next/navigation';
import { supabaseServer } from './supabase/server';
import { supabaseAdmin } from './supabase/admin';

export async function getUser() {
  const { data } = await supabaseServer().auth.getUser();
  return data.user ?? null;
}

export async function requireUser(next = '/') {
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export async function isAdmin(userId: string) {
  const { data } = await supabaseAdmin().from('profiles').select('is_admin').eq('id', userId).maybeSingle();
  return !!data?.is_admin;
}

export async function requireAdmin() {
  const user = await requireUser('/admin');
  if (!(await isAdmin(user.id))) redirect('/');
  return user;
}

export async function getOrganizer(userId: string) {
  const { data } = await supabaseAdmin().from('organizers').select('*').eq('owner_id', userId).maybeSingle();
  return data;
}

// The organizer who owns an event, or an admin, may manage it.
export async function canManageEvent(userId: string, eventId: string) {
  const db = supabaseAdmin();
  const { data } = await db.from('events').select('id, organizers!inner(owner_id)').eq('id', eventId).maybeSingle();
  const owner = (data as any)?.organizers?.owner_id;
  if (owner === userId) return true;
  if (await isAdmin(userId)) return true;
  const { data: staff } = await db.from('event_staff').select('user_id').eq('event_id', eventId).eq('user_id', userId).maybeSingle();
  return !!staff;
}
