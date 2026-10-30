import Link from 'next/link';
import { requireUser, getOrganizer } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { fmtDay, naira } from '@/lib/money';

export const dynamic = 'force-dynamic';

export default async function Organizer() {
  const user = await requireUser('/organizer');
  const org = await getOrganizer(user.id);
  const db = supabaseAdmin();
  const { data: events } = org ? await db.from('events').select('id, title, starts_at, status, ticket_types(quantity, sold)').eq('organizer_id', org.id).order('starts_at', { ascending: false }) : { data: [] as any[] };
  const ids = (events || []).map((e: any) => e.id);
  const { data: orders } = ids.length ? await db.from('orders').select('event_id, subtotal_kobo, created_at').in('event_id', ids).eq('status', 'paid') : { data: [] as any[] };
  const sales = (orders || []).reduce((a: number, o: any) => a + o.subtotal_kobo, 0);
  const sold = (events || []).reduce((a: number, e: any) => a + e.ticket_types.reduce((b: number, t: any) => b + t.sold, 0), 0);
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 12, flexWrap: 'wrap' }}>
        <div><p className="eyebrow">Organizer</p><h1 style={{ fontSize: 40 }}>{org?.display_name || 'Your events'}</h1></div>
        <div style={{ display: 'flex', gap: 8 }}><Link className="btn ghost" href="/organizer/payouts">Payouts</Link><Link className="btn primary" href="/organizer/events/new">Create event</Link></div>
      </div>
      {org && !org.paystack_subaccount_code && <div className="notice">Add your bank account under <Link href="/organizer/payouts">Payouts</Link> before you sell paid tickets, so sales are paid to you automatically.</div>}
      <div className="stats">
        <div className="stat"><span className="eyebrow">Ticket sales</span><b>{naira(sales)}</b><span className="muted">Paid to your bank by Paystack</span></div>
        <div className="stat"><span className="eyebrow">Tickets sold</span><b>{sold}</b></div>
        <div className="stat"><span className="eyebrow">Orders</span><b>{orders?.length || 0}</b></div>
      </div>
      <div className="panel tablewrap">
        {events?.length ? <table><thead><tr><th>Event</th><th>Date</th><th>Status</th><th className="r">Sold</th></tr></thead><tbody>
          {events.map((e: any) => <tr key={e.id}><td><Link href={`/organizer/events/${e.id}`}><b>{e.title}</b></Link></td><td>{fmtDay(e.starts_at)}</td><td><span className={'pill ' + (e.status === 'published' ? 'live' : 'draft')}>{e.status === 'published' ? 'Live' : e.status}</span></td><td className="r num">{e.ticket_types.reduce((a: number, t: any) => a + t.sold, 0)}/{e.ticket_types.reduce((a: number, t: any) => a + t.quantity, 0)}</td></tr>)}
        </tbody></table> : <p className="muted">No events yet. <Link href="/organizer/events/new">Create your first event</Link>.</p>}
      </div>
    </div>
  );
}
