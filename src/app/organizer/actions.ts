'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireUser, getOrganizer, canEditEvent } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { slugify } from '@/lib/money';
import { resolveAccount, createSubaccount } from '@/lib/paystack';
import { clean, isUuid, safeMediaUrl } from '@/lib/safe';
import { allow } from '@/lib/ratelimit';

const json = (v: FormDataEntryValue | null, fallback: any) => {
  const s = String(v || '');
  if (s.length > 50_000) return fallback;
  try { const x = JSON.parse(s); return Array.isArray(x) ? x : fallback; } catch { return fallback; }
};

// Keeps only the fields each list should have, with length caps, so nothing unexpected is stored.
const lists = (form: FormData) => ({
  activities: json(form.get('activities'), []).slice(0, 30).map((a: any) => ({ time: clean(a?.time, 10), title: clean(a?.title, 80), note: clean(a?.note, 160) })).filter((a: any) => a.title),
  expect: json(form.get('expect'), []).slice(0, 20).map((x: any) => ({ label: clean(x?.label, 40), value: clean(x?.value, 160) })).filter((x: any) => x.label),
  guests: json(form.get('guests'), []).slice(0, 30).map((g: any) => ({ name: clean(g?.name, 60), role: clean(g?.role, 80) })).filter((g: any) => g.name),
  gallery: json(form.get('gallery'), []).slice(0, 12)
    .map((m: any) => ({ url: safeMediaUrl(m?.url), kind: m?.kind === 'video' ? 'video' : 'image' }))
    .filter((m: any) => m.url),
});

export async function saveEvent(form: FormData) {
  const user = await requireUser('/organizer');
  const db = supabaseAdmin();
  const id = String(form.get('id') || '');
  if (id && !(await canEditEvent(user.id, id))) throw new Error('Not allowed');
  if (!id && !(await allow(`event-create:${user.id}`, 20, 86400))) throw new Error('You’ve created a lot of events today. Try again tomorrow.');

  let org = await getOrganizer(user.id);
  if (!org && !id) {
    const { data } = await db.from('organizers').insert({ owner_id: user.id, display_name: clean(form.get('host'), 80) || String(user.email) }).select().single();
    org = data;
  }

  const date = String(form.get('date') || ''), time = String(form.get('time') || '19:00');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) throw new Error('Add a valid date and time.');
  const starts = new Date(`${date}T${time}:00+01:00`); // Africa/Lagos is UTC+1
  if (isNaN(starts.getTime())) throw new Error('Add a valid date and time.');
  const title = clean(form.get('title'), 120);
  const venue = clean(form.get('venue'), 120);
  if (!title || !venue) throw new Error('Add a name, date and venue.');

  const row = {
    title,
    tagline: clean(form.get('tagline'), 160) || null,
    category: clean(form.get('category'), 40) || null,
    description: clean(form.get('description'), 5000).replace(/ {2,}/g, ' '),
    starts_at: starts.toISOString(),
    venue, address: clean(form.get('address'), 200) || null, city: clean(form.get('city'), 60) || null,
    cover_url: safeMediaUrl(form.get('cover_url')), promo_url: safeMediaUrl(form.get('promo_url')),
    ...lists(form),
    show_going: form.get('show_going') === 'on', past_title: clean(form.get('past_title'), 120) || null,
    status: form.get('intent') === 'publish' ? 'published' : 'draft', updated_at: new Date().toISOString(),
  };
  // Description keeps its line breaks.
  row.description = String(form.get('description') || '').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').trim().slice(0, 5000);

  let eventId = id;
  if (id) {
    // The owner stays the same on edit, even when an admin makes the change.
    const { error } = await db.from('events').update(row).eq('id', id);
    if (error) throw new Error('Could not save the event.');
  } else {
    const slug = `${slugify(title) || 'event'}-${crypto.randomUUID().slice(0, 6)}`;
    const { data, error } = await db.from('events').insert({ ...row, organizer_id: org!.id, slug }).select('id').single();
    if (error) throw new Error('Could not save the event.');
    eventId = data.id;
  }

  const types = json(form.get('ticket_types'), []).slice(0, 20) as { id?: string; name: string; price: number; quantity: number }[];
  const { data: existing } = await db.from('ticket_types').select('id, sold').eq('event_id', eventId);
  for (const [i, t] of types.entries()) {
    const name = clean(t?.name, 60);
    const price = Number(t?.price || 0), qty = Number(t?.quantity);
    if (!name || !Number.isFinite(qty) || qty <= 0 || qty > 100000 || !Number.isFinite(price) || price < 0 || price > 10_000_000) continue;
    const r = { event_id: eventId, name, price_kobo: Math.round(price * 100), quantity: Math.round(qty), sort: i };
    const match = t.id && isUuid(t.id) ? existing?.find((e) => e.id === t.id) : null;
    if (match) await db.from('ticket_types').update({ ...r, quantity: Math.max(r.quantity, match.sold) }).eq('id', match.id).eq('event_id', eventId);
    else if (!t.id) await db.from('ticket_types').insert(r);
  }
  revalidatePath('/organizer');
  redirect(`/organizer/events/${eventId}`);
}

export async function setStatus(form: FormData) {
  const user = await requireUser('/organizer');
  const id = String(form.get('id') || ''), status = String(form.get('status') || '');
  if (!['draft', 'published', 'cancelled'].includes(status)) throw new Error('Bad status');
  if (!(await canEditEvent(user.id, id))) throw new Error('Not allowed');
  await supabaseAdmin().from('events').update({ status }).eq('id', id);
  revalidatePath(`/organizer/events/${id}`);
}

export async function saveBank(form: FormData) {
  const user = await requireUser('/organizer/payouts');
  const db = supabaseAdmin();
  const org = await getOrganizer(user.id);
  if (!org) redirect('/organizer/events/new');
  if (!(await allow(`bank:${user.id}`, 5, 3600))) redirect('/organizer/payouts?error=' + encodeURIComponent('Too many attempts. Try again in an hour.'));
  const bankCode = String(form.get('bank_code') || ''), number = String(form.get('account_number') || '').replace(/\D/g, ''), bankName = clean(form.get('bank_name'), 80);
  if (!/^[0-9A-Za-z-]{2,12}$/.test(bankCode)) redirect('/organizer/payouts?error=' + encodeURIComponent('Choose your bank.'));
  if (number.length !== 10) redirect('/organizer/payouts?error=' + encodeURIComponent('Account numbers are 10 digits.'));
  let failed = false;
  try {
    const acct = await resolveAccount(number, bankCode);
    const sub = await createSubaccount({ businessName: org!.display_name, bankCode, accountNumber: number });
    await db.from('organizers').update({ bank_code: bankCode, bank_name: bankName, account_last4: number.slice(-4), account_name: acct.account_name, paystack_subaccount_code: sub.subaccount_code }).eq('id', org!.id);
  } catch (e: any) {
    console.error('saveBank', e?.message);
    failed = true;
  }
  redirect(failed ? '/organizer/payouts?error=' + encodeURIComponent('We couldn’t verify that account. Check the bank and number.') : '/organizer/payouts?saved=1');
}
