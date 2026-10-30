import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getUser } from '@/lib/auth';
import { sendInviteEmail } from '@/lib/email';
import { feeFor, priceLabel } from '@/lib/money';

// Creates invites and emails the ones with an email address.
// Phone invites are returned with a WhatsApp link for the inviter to send.
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Sign in to send invites.' }, { status: 401 });
  const { eventId, ticketTypeId, fromName, note, guests } = await req.json();
  if (!fromName || !Array.isArray(guests) || !guests.length || guests.length > 20) return NextResponse.json({ error: 'Add your name and up to 20 guests.' }, { status: 400 });
  const db = supabaseAdmin();
  const { data: ev } = await db.from('events').select('*').eq('id', eventId).eq('status', 'published').maybeSingle();
  const { data: tt } = await db.from('ticket_types').select('*').eq('id', ticketTypeId).eq('event_id', eventId).maybeSingle();
  if (!ev || !tt) return NextResponse.json({ error: 'That ticket isn’t on sale.' }, { status: 404 });
  const rows = guests.map((g: any) => {
    const contact = String(g.contact || '').trim();
    const kind = /^\S+@\S+\.\S+$/.test(contact) ? 'email' : 'phone';
    return { event_id: eventId, ticket_type_id: ticketTypeId, inviter_id: user.id, from_name: String(fromName).slice(0, 60), contact, contact_kind: kind, guest_name: g.name || null, note: note ? String(note).slice(0, 140) : null };
  }).filter((r: any) => r.contact);
  const { data: made, error } = await db.from('invites').insert(rows).select();
  if (error) return NextResponse.json({ error: 'Could not create invites.' }, { status: 500 });
  const price = priceLabel(tt.price_kobo + feeFor(tt.price_kobo));
  const site = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  await Promise.all(made!.filter((i) => i.contact_kind === 'email').map((i) => sendInviteEmail(i.contact, i, ev, price).catch(() => {})));
  return NextResponse.json({
    invites: made!.map((i) => ({ id: i.id, contact: i.contact, kind: i.contact_kind, link: `${site}/invite/${i.id}`,
      whatsapp: i.contact_kind === 'phone' ? `https://wa.me/${i.contact.replace(/\D/g, '').replace(/^0(\d{10})$/, '234$1')}?text=${encodeURIComponent(`${fromName} invited you to ${ev.title}. You only pay if you accept: ${site}/invite/${i.id}`)}` : null })),
  });
}

export async function PATCH(req: Request) {
  const { id, status } = await req.json();
  if (!['accepted', 'declined', 'pending'].includes(status)) return NextResponse.json({ error: 'Bad status' }, { status: 400 });
  const db = supabaseAdmin();
  const { error } = await db.from('invites').update({ status, responded_at: new Date().toISOString() }).eq('id', id).neq('status', 'paid');
  if (error) return NextResponse.json({ error: 'Could not update invite.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
