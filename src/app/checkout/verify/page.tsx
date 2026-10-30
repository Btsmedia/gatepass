import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { fulfilByReference } from '@/lib/fulfil';

export const dynamic = 'force-dynamic';

export default async function Verify({ searchParams }: { searchParams: { reference?: string; order?: string } }) {
  const db = supabaseAdmin();
  let orderId = searchParams.order;
  let failed = '';
  if (searchParams.reference) {
    const r = await fulfilByReference(searchParams.reference).catch((e) => ({ ok: false, reason: e.message } as any));
    if (r.ok) orderId = r.order.id; else failed = r.reason === 'not_paid' ? 'Your payment didn’t go through. No money was taken.' : 'We couldn’t confirm your payment yet. If you were charged, your tickets will arrive by email shortly.';
  }
  const { data: tickets } = orderId ? await db.from('tickets').select('code, holder_name, ticket_types(name), events(title)').eq('order_id', orderId) : { data: null };
  if (failed || !tickets?.length) return (
    <div className="panel" style={{ maxWidth: 560 }}><h1 style={{ fontSize: 32 }}>Payment not confirmed</h1><p className="muted" style={{ marginTop: 8 }}>{failed || 'We couldn’t find that order.'}</p><p style={{ marginTop: 16 }}><Link className="btn" href="/events">Back to events</Link></p></div>
  );
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <p className="eyebrow">Order confirmed</p>
      <h1 style={{ fontSize: 44 }}>You’re in, {String(tickets[0].holder_name).split(' ')[0]}.</h1>
      <p className="muted">{tickets.length} {tickets.length === 1 ? 'ticket' : 'tickets'} for {(tickets[0] as any).events?.title}. We’ve emailed them to you too.</p>
      <div style={{ display: 'grid', gap: 8 }}>{tickets.map((t: any) => <Link key={t.code} className="btn ghost" style={{ justifyContent: 'space-between' }} href={`/t/${t.code}`}><span>{t.ticket_types?.name}</span><span className="mono">{t.code}</span></Link>)}</div>
    </div>
  );
}
