'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireUser, getOrganizer, canManageEvent } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { slugify } from '@/lib/money';
import { resolveAccount, createSubaccount } from '@/lib/paystack';

const json = (v: FormDataEntryValue | null, fallback: any) => { try { return JSON.parse(String(v || '')); } catch { return fallback; } };

export async function saveEvent(form: FormData) {
  const user = await requireUser('/organizer');
  const db = supabaseAdmin();
  let org = await getOrganizer(user.id);
  if (!org) {
    const { data } = await db.from('organizers').insert({ owner_id: user.id, display_name: String(form.get('host') || user.email) }).select().single();
    org = data;
  }
  const id = String(form.get('id') || '');
  if (id && !(await canManageEvent(user.id, id))) throw new Error('Not allowed');
  const date = String(form.get('date')), time = String(form.get('time') || '19:00');
  const startsAt = new Date(`${date}T${time}:00+01:00`).toISOString(); // Africa/Lagos is UTC+1
  const title = String(form.get('title') || '').trim();
  const row = {
    organizer_id: org!.id, title,
    tagline: String(form.get('tagline') || '') || null,
    category: String(form.get('category') || '') || null,
    description: String(form.get('description') || ''),
    starts_at: startsAt,
    venue: String(form.get('venue') || ''), address: String(form.get('address') || '') || null, city: String(form.get('city') || '') || null,
    cover_url: String(form.get('cover_url') || '') || null, promo_url: String(form.get('promo_url') || '') || null,
    activities: json(form.get('activities'), []), expect: json(form.get('expect'), []), guests: json(form.get('guests'), []),
    show_going: form.get('show_going') === 'on', past_title: String(form.get('past_title') || '') || null, gallery: json(form.get('gallery'), []),
    status: form.get('intent') === 'publish' ? 'published' : 'draft', updated_at: new Date().toISOString(),
  };
  if (!title || !date || !row.venue) throw new Error('Add a name, date and venue.');
  let eventId = id;
  if (id) { await db.from('events').update(row).eq('id', id); }
  else {
    const slug = `${slugify(title)}-${Math.random().toString(36).slice(2, 6)}`;
    const { data, error } = await db.from('events').insert({ ...row, slug }).select('id').single();
    if (error) throw error; eventId = data.id;
  }
  const types = json(form.get('ticket_types'), []) as { id?: string; name: string; price: number; quantity: number }[];
  for (const [i, t] of types.entries()) {
    if (!t.name || !(t.quantity > 0)) continue;
    const r = { event_id: eventId, name: t.name, price_kobo: Math.round(Number(t.price || 0) * 100), quantity: Math.round(t.quantity), sort: i };
    if (t.id) await db.from('ticket_types').update(r).eq('id', t.id).eq('event_id', eventId);
    else await db.from('ticket_types').insert(r);
  }
  revalidatePath('/organizer');
  redirect(`/organizer/events/${eventId}`);
}

export async function setStatus(form: FormData) {
  const user = await requireUser('/organizer');
  const id = String(form.get('id'));
  if (!(await canManageEvent(user.id, id))) throw new Error('Not allowed');
  await supabaseAdmin().from('events').update({ status: String(form.get('status')) }).eq('id', id);
  revalidatePath(`/organizer/events/${id}`);
}

export async function saveBank(form: FormData) {
  const user = await requireUser('/organizer/payouts');
  const db = supabaseAdmin();
  const org = await getOrganizer(user.id);
  if (!org) redirect('/organizer/events/new');
  const bankCode = String(form.get('bank_code')), number = String(form.get('account_number')).replace(/\D/g, ''), bankName = String(form.get('bank_name') || '');
  if (number.length !== 10) redirect('/organizer/payouts?error=Account+numbers+are+10+digits');
  try {
    const acct = await resolveAccount(number, bankCode);
    const sub = await createSubaccount({ businessName: org!.display_name, bankCode, accountNumber: number });
    await db.from('organizers').update({ bank_code: bankCode, bank_name: bankName, account_last4: number.slice(-4), account_name: acct.account_name, paystack_subaccount_code: sub.subaccount_code }).eq('id', org!.id);
  } catch (e: any) {
    redirect('/organizer/payouts?error=' + encodeURIComponent(e.message || 'Could not verify that account'));
  }
  redirect('/organizer/payouts?saved=1');
}
