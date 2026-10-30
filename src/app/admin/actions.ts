'use server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { refundTransaction } from '@/lib/paystack';

export async function toggleEvent(form: FormData) {
  await requireAdmin();
  const id = String(form.get('id')), field = String(form.get('field'));
  const db = supabaseAdmin();
  const { data: ev } = await db.from('events').select('status, featured').eq('id', id).single();
  if (field === 'featured') await db.from('events').update({ featured: !ev!.featured }).eq('id', id);
  if (field === 'status') await db.from('events').update({ status: ev!.status === 'published' ? 'draft' : 'published' }).eq('id', id);
  revalidatePath('/admin');
}

export async function verifyOrganizer(form: FormData) {
  await requireAdmin();
  const id = String(form.get('id'));
  const db = supabaseAdmin();
  const { data: o } = await db.from('organizers').select('verified').eq('id', id).single();
  await db.from('organizers').update({ verified: !o!.verified }).eq('id', id);
  revalidatePath('/admin');
}

// Sends the money back through Paystack, then voids the tickets and frees the seats.
export async function refundOrder(form: FormData) {
  await requireAdmin();
  const id = String(form.get('id'));
  const db = supabaseAdmin();
  const { data: o } = await db.from('orders').select('*').eq('id', id).single();
  if (!o || o.status !== 'paid') return;
  if (o.paystack_reference && o.total_kobo > 0) await refundTransaction(o.paystack_reference);
  await db.rpc('mark_refunded', { p_order: id });
  revalidatePath('/admin');
}
