import { NextResponse } from 'next/server';
import { validSignature } from '@/lib/paystack';
import { fulfilByReference } from '@/lib/fulfil';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Paystack calls this after each payment. Set the URL in Paystack:
// Settings > API Keys & Webhooks > Webhook URL = https://YOUR-DOMAIN/api/paystack/webhook
// Every event is re-checked against Paystack's API before anything changes, so a forged body can't issue tickets.
export async function POST(req: Request) {
  if (!process.env.PAYSTACK_SECRET_KEY) return new NextResponse('Not configured', { status: 503 });
  const raw = await req.text();
  if (raw.length > 100_000 || !validSignature(raw, req.headers.get('x-paystack-signature'))) return new NextResponse('Invalid signature', { status: 401 });
  let evt: any;
  try { evt = JSON.parse(raw); } catch { return new NextResponse('Bad body', { status: 400 }); }
  const ref = evt?.event === 'charge.success' ? evt.data?.reference : evt?.data?.transaction_reference;
  if (typeof ref !== 'string' || !/^GP-[0-9A-F]{16}$/.test(ref)) return NextResponse.json({ received: true });
  if (evt.event === 'charge.success') await fulfilByReference(ref);
  if (evt.event === 'refund.processed') {
    const db = supabaseAdmin();
    const { data: o } = await db.from('orders').select('id, status').eq('paystack_reference', ref).maybeSingle();
    if (o?.status === 'paid') await db.rpc('mark_refunded', { p_order: o.id });
  }
  return NextResponse.json({ received: true });
}
