import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { fmtDay, naira } from '@/lib/money';
import { toggleEvent, verifyOrganizer, refundOrder } from './actions';

export const dynamic = 'force-dynamic';

const paystackFee = (k: number) => (k <= 0 ? 0 : Math.min(200000, Math.round(k * 0.015) + (k >= 250000 ? 10000 : 0)));

export default async function Admin({ searchParams }: { searchParams: { tab?: string } }) {
  await requireAdmin();
  const tab = searchParams.tab || 'overview';
  const db = supabaseAdmin();
  const [{ data: orders }, { data: events }, { data: orgs }, { count: ticketCount }, { data: invites }] = await Promise.all([
    db.from('orders').select('id, event_id, buyer_name, buyer_email, total_kobo, subtotal_kobo, fee_kobo, status, paystack_reference, created_at').in('status', ['paid', 'refunded']).order('created_at', { ascending: false }).limit(1000),
    db.from('events').select('id, slug, title, starts_at, city, status, featured, organizer_id, ticket_types(quantity, sold)').order('starts_at', { ascending: true }),
    db.from('organizers').select('*'),
    db.from('tickets').select('id', { count: 'exact', head: true }).neq('status', 'void'),
    db.from('invites').select('status'),
  ]);
  const paid = (orders || []).filter((o) => o.status === 'paid');
  const gmv = paid.reduce((a, o) => a + o.subtotal_kobo, 0), fees = paid.reduce((a, o) => a + o.fee_kobo, 0), psk = paid.reduce((a, o) => a + paystackFee(o.total_kobo), 0);
  const orgName = (id: string) => orgs?.find((o) => o.id === id)?.display_name || '—';
  const evTitle = (id: string) => events?.find((e) => e.id === id)?.title || '';
  const tabs = [['overview', 'Overview'], ['events', 'Events'], ['orders', 'Orders'], ['organizers', 'Organizers']];
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div><p className="eyebrow">Platform</p><h1 style={{ fontSize: 40 }}>Admin</h1></div>
      <nav className="chips" aria-label="Admin">{tabs.map(([k, l]) => <Link key={k} className={'chip' + (tab === k ? ' on' : '')} href={`/admin?tab=${k}`}>{l}</Link>)}</nav>
      {tab === 'overview' && <div className="stats">
        <div className="stat"><span className="eyebrow">Gross ticket sales</span><b>{naira(gmv)}</b><span className="muted">{paid.length} paid orders</span></div>
        <div className="stat"><span className="eyebrow">Booking fees</span><b>{naira(fees)}</b></div>
        <div className="stat"><span className="eyebrow">Net revenue (est.)</span><b>{naira(fees - psk)}</b><span className="muted">After ~{naira(psk)} Paystack fees</span></div>
        <div className="stat"><span className="eyebrow">Tickets issued</span><b>{ticketCount || 0}</b></div>
        <div className="stat"><span className="eyebrow">Events live</span><b>{(events || []).filter((e) => e.status === 'published' && new Date(e.starts_at) > new Date()).length}</b><span className="muted">{orgs?.length || 0} organizers</span></div>
        <div className="stat"><span className="eyebrow">Invites</span><b>{(invites || []).filter((i) => i.status === 'paid').length}/{invites?.length || 0}</b><span className="muted">Accepted and paid</span></div>
        <div className="stat"><span className="eyebrow">Refunds</span><b>{(orders || []).filter((o) => o.status === 'refunded').length}</b></div>
      </div>}
      {tab === 'events' && <div className="panel tablewrap"><table><thead><tr><th>Event</th><th>Organizer</th><th>Date</th><th>Status</th><th className="r">Sold</th><th className="r">Actions</th></tr></thead><tbody>
        {(events || []).map((e: any) => <tr key={e.id}>
          <td><Link href={`/e/${e.slug}`}><b>{e.title}</b></Link>{e.featured && <span className="muted"> · Featured</span>}</td><td>{orgName(e.organizer_id)}</td><td>{fmtDay(e.starts_at)}</td>
          <td><span className={'pill ' + (e.status === 'published' ? 'live' : 'draft')}>{e.status}</span></td>
          <td className="r">{e.ticket_types.reduce((a: number, t: any) => a + t.sold, 0)}/{e.ticket_types.reduce((a: number, t: any) => a + t.quantity, 0)}</td>
          <td className="r" style={{ whiteSpace: 'nowrap' }}>
            <form action={toggleEvent} style={{ display: 'inline' }}><input type="hidden" name="id" value={e.id} /><input type="hidden" name="field" value="featured" /><button className="btn small ghost">{e.featured ? 'Unfeature' : 'Feature'}</button></form>{' '}
            <form action={toggleEvent} style={{ display: 'inline' }}><input type="hidden" name="id" value={e.id} /><input type="hidden" name="field" value="status" /><button className="btn small ghost">{e.status === 'published' ? 'Unpublish' : 'Publish'}</button></form>
          </td></tr>)}</tbody></table></div>}
      {tab === 'orders' && <div className="panel tablewrap"><table><thead><tr><th>Buyer</th><th>Event</th><th className="r">Total</th><th>Status</th><th className="r"></th></tr></thead><tbody>
        {(orders || []).slice(0, 200).map((o) => <tr key={o.id}>
          <td><b>{o.buyer_name}</b><br /><span className="muted">{o.buyer_email} · <span className="mono">{o.paystack_reference || 'free'}</span></span></td><td>{evTitle(o.event_id)}</td><td className="r">{naira(o.total_kobo)}</td>
          <td><span className={'pill ' + (o.status === 'refunded' ? 'used' : 'live')}>{o.status}</span></td>
          <td className="r">{o.status === 'paid' && o.total_kobo > 0 && <form action={refundOrder}><input type="hidden" name="id" value={o.id} /><button className="btn small ghost">Refund {naira(o.total_kobo)}</button></form>}</td></tr>)}</tbody></table>
        <p className="muted" style={{ marginTop: 10, fontSize: 13 }}>Refunds go back through Paystack to the buyer’s card or account and void their tickets.</p></div>}
      {tab === 'organizers' && <div className="panel tablewrap"><table><thead><tr><th>Organizer</th><th>Payouts to</th><th className="r">Sales</th><th>Verified</th><th className="r"></th></tr></thead><tbody>
        {(orgs || []).map((o) => { const ids = new Set((events || []).filter((e) => e.organizer_id === o.id).map((e) => e.id)); const s = paid.filter((x) => ids.has(x.event_id)).reduce((a, x) => a + x.subtotal_kobo, 0); return <tr key={o.id}>
          <td><b>{o.display_name}</b></td><td>{o.paystack_subaccount_code ? `${o.bank_name} ••${o.account_last4}` : <span className="muted">Not set</span>}</td><td className="r">{naira(s)}</td>
          <td>{o.verified ? <span className="pill live">Verified</span> : <span className="pill draft">Unverified</span>}</td>
          <td className="r"><form action={verifyOrganizer}><input type="hidden" name="id" value={o.id} /><button className="btn small ghost">{o.verified ? 'Unverify' : 'Verify'}</button></form></td></tr>; })}</tbody></table></div>}
    </div>
  );
}
