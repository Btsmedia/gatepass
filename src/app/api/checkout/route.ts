import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getUser } from '@/lib/auth';
import { initializeTransaction } from '@/lib/paystack';
import { FEE_FLAT_KOBO, FEE_PERCENT } from '@/lib/money';
import { issue } from '@/lib/fulfil';
import { clean, isEmail, isUuid } from '@/lib/safe';
import { allow, clientIp } from '@/lib/ratelimit';

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return bad('Bad request');
  const { eventId, items, inviteId } = body as { eventId: unknown; items: unknown; inviteId?: unknown };
  const name = clean(body.name, 80), email = clean(body.email, 254).toLowerCase(), phone = clean(body.phone, 20).replace(/[^\d+ ]/g, '') || null;

  if (!isUuid(eventId) || !Array.isArray(items) || !items.length || items.length > 10) return bad('Choose at least one ticket.');
  const lines = items.map((i: any) => ({ ticket_type_id: i?.ticket_type_id, quantity: Math.floor(Number(i?.quantity)) }));
  if (lines.some((l) => !isUuid(l.ticket_type_id) || !Number.isFinite(l.quantity) || l.quantity < 0 || l.quantity > 50)) return bad('Choose at least one ticket.');
  if (!name) return bad('Enter the name for the tickets.');
  if (!isEmail(email)) return bad('Enter a valid email so we can send your tickets.');

  // Stops one person holding every seat with fake checkouts.
  const ip = await clientIp(req);
  if (!(await allow(`checkout:ip:${ip}`, 10, 600)) || !(await allow(`checkout:email:${email}`, 5, 600)))
    return bad('Too many checkouts started. Wait a few minutes and try again.', 429);

  const db = supabaseAdmin();
  const user = await getUser();

  // An invite can only be paid by its own checkout: same event and ticket, still open.
  let invite: string | null = null;
  if (inviteId != null && inviteId !== '') {
    if (!isUuid(inviteId)) return bad('That invite isn’t valid.');
    const { data: inv } = await db.from('invites').select('id, event_id, ticket_type_id, status').eq('id', inviteId).maybeSingle();
    if (!inv || inv.event_id !== eventId || inv.status === 'paid' || inv.status === 'declined' || lines.some((l) => l.quantity > 0 && l.ticket_type_id !== inv.ticket_type_id))
      return bad('That invite can’t be used for this order.');
    invite = inv.id;
  }

  await db.rpc('release_expired_orders'); // free seats from abandoned checkouts before reserving
  const { data: order, error } = await db.rpc('create_pending_order', {
    p_event: eventId, p_items: lines, p_name: name, p_email: email, p_phone: phone,
    p_user: user?.id ?? null, p_fee_percent: FEE_PERCENT, p_fee_flat_kobo: FEE_FLAT_KOBO, p_invite: invite,
  });
  if (error) {
    const m = error.message || '';
    const msg = m.startsWith('sold_out:') ? `${m.split(':')[1]} just sold out.` : m.startsWith('too_many:') ? `Too many ${m.split(':')[1]} tickets in one order.` : m.includes('event_unavailable') ? 'This event is no longer on sale.' : 'Could not start checkout. Try again.';
    return bad(msg, 409);
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  if (order.total_kobo === 0) {
    // Free tickets: fewer per email, since there is no payment to slow abuse down.
    if (!(await allow(`free:${eventId}:${email}`, 2, 86400))) {
      await db.from('orders').update({ expires_at: new Date(Date.now() - 60000).toISOString() }).eq('id', order.id);
      await db.rpc('release_expired_orders');
      return bad('You already have free tickets for this event.', 429);
    }
    await issue(order.id, null);
    return NextResponse.json({ url: `${site}/checkout/verify?order=${order.id}` });
  }
  const { data: ev } = await db.from('events').select('title, organizers(paystack_subaccount_code)').eq('id', eventId).single();
  const reference = 'GP-' + crypto.randomBytes(8).toString('hex').toUpperCase();
  await db.from('orders').update({ paystack_reference: reference }).eq('id', order.id);
  try {
    const tx = await initializeTransaction({
      email: order.buyer_email, amountKobo: order.total_kobo, reference,
      callbackUrl: `${site}/checkout/verify?reference=${reference}`,
      subaccount: (ev as any)?.organizers?.paystack_subaccount_code || null,
      platformShareKobo: order.fee_kobo,
      metadata: { order_id: order.id, event: (ev as any)?.title },
    });
    return NextResponse.json({ url: tx.authorization_url });
  } catch (e: any) {
    console.error('paystack init', e?.message);
    // give the seats back straight away
    await db.from('orders').update({ expires_at: new Date(Date.now() - 60000).toISOString() }).eq('id', order.id);
    await db.rpc('release_expired_orders');
    return bad('Payment could not start. Try again in a moment.', 502);
  }
}
