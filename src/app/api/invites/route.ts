import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getUser } from '@/lib/auth';
import { sendInviteEmail } from '@/lib/email';
import { feeFor, priceLabel } from '@/lib/money';
import { clean, isEmail, isUuid } from '@/lib/safe';
import { allow } from '@/lib/ratelimit';

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

// Creates invites and emails the ones with an email address.
// Phone invites are returned with a WhatsApp link for the inviter to send.
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return bad('Sign in to send invites.', 401);
  const body = await req.json().catch(() => null);
  if (!body) return bad('Bad request');
  const { eventId, ticketTypeId, guests } = body;
  const fromName = clean(body.fromName, 60), note = clean(body.note, 140) || null;
  if (!fromName || !Array.isArray(guests) || !guests.length || guests.length > 20) return bad('Add your name and up to 20 guests.');
  if (!isUuid(eventId) || !isUuid(ticketTypeId)) return bad('That ticket isn’t on sale.', 404);

  const rows = guests.map((g: any) => {
    const contact = clean(g?.contact, 254);
    const email = isEmail(contact.toLowerCase());
    const phone = contact.replace(/[^\d+]/g, '');
    return { contact: email ? contact.toLowerCase() : phone, kind: email ? 'email' : 'phone', ok: email || /^\+?\d{10,15}$/.test(phone), name: clean(g?.name, 60) || null };
  }).filter((r: any) => r.contact);
  if (!rows.length || rows.some((r: any) => !r.ok)) return bad('Each guest needs a valid email or phone number.');

  // Invites send email from Gatepass, so they are capped to stop the form being used for spam.
  if (!(await allow(`invites:${user.id}`, 60, 86400))) return bad('You’ve sent a lot of invites today. Try again tomorrow.', 429);

  const db = supabaseAdmin();
  const { data: ev } = await db.from('events').select('*').eq('id', eventId).eq('status', 'published').maybeSingle();
  const { data: tt } = await db.from('ticket_types').select('*').eq('id', ticketTypeId).eq('event_id', eventId).maybeSingle();
  if (!ev || !tt || new Date(ev.starts_at).getTime() < Date.now() - 8 * 3600e3) return bad('That ticket isn’t on sale.', 404);

  const { data: made, error } = await db.from('invites').insert(rows.map((r: any) => ({
    event_id: eventId, ticket_type_id: ticketTypeId, inviter_id: user.id, from_name: fromName,
    contact: r.contact, contact_kind: r.kind, guest_name: r.name, note,
  }))).select();
  if (error || !made) return bad('Could not create invites.', 500);
  const price = priceLabel(tt.price_kobo + feeFor(tt.price_kobo));
  const site = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  await Promise.all(made.filter((i) => i.contact_kind === 'email').map((i) => sendInviteEmail(i.contact, i, ev, price).catch(() => {})));
  return NextResponse.json({
    invites: made.map((i) => ({ id: i.id, contact: i.contact, kind: i.contact_kind, link: `${site}/invite/${i.id}`,
      whatsapp: i.contact_kind === 'phone' ? `https://wa.me/${i.contact.replace(/\D/g, '').replace(/^0(\d{10})$/, '234$1')}?text=${encodeURIComponent(`${fromName} invited you to ${ev.title}. You only pay if you accept: ${site}/invite/${i.id}`)}` : null })),
  });
}

// The invite link itself is the guest's key: whoever has it can accept or decline.
export async function PATCH(req: Request) {
  const body = await req.json().catch(() => null);
  const id = body?.id, status = body?.status;
  if (!isUuid(id) || !['accepted', 'declined', 'pending'].includes(status)) return bad('Bad request');
  const { error } = await supabaseAdmin().from('invites').update({ status, responded_at: new Date().toISOString() }).eq('id', id).neq('status', 'paid');
  if (error) return bad('Could not update invite.', 500);
  return NextResponse.json({ ok: true });
}
