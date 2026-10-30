import { NextResponse } from 'next/server';
import { validSignature } from '@/lib/paystack';
import { fulfilByReference } from '@/lib/fulfil';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Paystack calls this after each payment. Set the URL in Paystack:
// Settings > API Keys & Webhooks > Webhook URL = https://YOUR-DOMAIN/api/paystack/webhook
export async function POST(req: Request) {
  const raw = await req.text();
  if (!validSignature(raw, req.headers.get('x-paystack-signature'))) return new NextResponse('Invalid signature', { status: 401 });
  const evt = JSON.parse(raw);
  if (evt.event === 'charge.success') await fulfilByReference(evt.data.reference);
  if (evt.event === 'refund.processed') {
    const ref = evt.data?.transaction_reference;
    if (ref) { const db = supabaseAdmin(); const { data: o } = await db.from('orders').select('id, status').eq('paystack_reference', ref).maybeSingle(); if (o?.status === 'paid') await db.rpc('mark_refunded', { p_order: o.id }); }
  }
  return NextResponse.json({ received: true });
}
