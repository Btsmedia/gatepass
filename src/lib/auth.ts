import 'server-only';
import { redirect } from 'next/navigation';
import { supabaseServer } from './supabase/server';
import { supabaseAdmin } from './supabase/admin';
import { isUuid } from './safe';

export async function getUser() {
  const { data } = await (await supabaseServer()).auth.getUser();
  return data.user ?? null;
}

export async function requireUser(next = '/') {
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user!;
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

// Owner or admin: may edit the event, change its status and see buyer details.
export async function canEditEvent(userId: string, eventId: string) {
  if (!isUuid(eventId)) return false;
  const { data } = await supabaseAdmin().from('events').select('id, organizers!inner(owner_id)').eq('id', eventId).maybeSingle();
  if ((data as any)?.organizers?.owner_id === userId) return true;
  return isAdmin(userId);
}

// Owner, admin or door staff: may scan tickets at the door.
export async function canManageEvent(userId: string, eventId: string) {
  if (!isUuid(eventId)) return false;
  if (await canEditEvent(userId, eventId)) return true;
  const { data: staff } = await supabaseAdmin().from('event_staff').select('user_id').eq('event_id', eventId).eq('user_id', userId).maybeSingle();
  return !!staff;
}
