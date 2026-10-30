import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getUser } from '@/lib/auth';
import { initializeTransaction } from '@/lib/paystack';
import { FEE_FLAT_KOBO, FEE_PERCENT } from '@/lib/money';
import { issue } from '@/lib/fulfil';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  const { eventId, items, name, email, phone, inviteId } = body as { eventId: string; items: { ticket_type_id: string; quantity: number }[]; name: string; email: string; phone?: string; inviteId?: string };
  if (!eventId || !Array.isArray(items) || !items.length) return NextResponse.json({ error: 'Choose at least one ticket.' }, { status: 400 });
  if (!name?.trim()) return NextResponse.json({ error: 'Enter the name for the tickets.' }, { status: 400 });
  if (!/^\S+@\S+\.\S+$/.test(email || '')) return NextResponse.json({ error: 'Enter a valid email so we can send your tickets.' }, { status: 400 });
  const db = supabaseAdmin();
  const user = await getUser();
  await db.rpc('release_expired_orders'); // free seats from abandoned checkouts before reserving
  const { data: order, error } = await db.rpc('create_pending_order', {
    p_event: eventId, p_items: items, p_name: name.trim(), p_email: email.trim(), p_phone: phone?.trim() || null,
    p_user: user?.id ?? null, p_fee_percent: FEE_PERCENT, p_fee_flat_kobo: FEE_FLAT_KOBO, p_invite: inviteId || null,
  });
  if (error) {
    const m = error.message || '';
    const msg = m.startsWith('sold_out:') ? `${m.split(':')[1]} just sold out.` : m.startsWith('too_many:') ? `Too many ${m.split(':')[1]} tickets in one order.` : m.includes('event_unavailable') ? 'This event is no longer on sale.' : 'Could not start checkout. Try again.';
    return NextResponse.json({ error: msg }, { status: 409 });
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  if (order.total_kobo === 0) {
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
    // give the seats back straight away
    await db.from('orders').update({ expires_at: new Date(Date.now() - 60000).toISOString() }).eq('id', order.id);
    await db.rpc('release_expired_orders');
    return NextResponse.json({ error: 'Payment could not start: ' + e.message }, { status: 502 });
  }
}
