import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireUser, canManageEvent } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { fmtDay, naira, priceLabel } from '@/lib/money';
import EventForm from '@/components/EventForm';
import { saveEvent, setStatus } from '../../actions';

export const dynamic = 'force-dynamic';

export default async function ManageEvent({ params, searchParams }: { params: { id: string }; searchParams: { edit?: string } }) {
  const user = await requireUser(`/organizer/events/${params.id}`);
  if (!(await canManageEvent(user.id, params.id))) redirect('/organizer');
  const db = supabaseAdmin();
  const { data: ev } = await db.from('events').select('*, ticket_types(*)').eq('id', params.id).maybeSingle();
  if (!ev) notFound();
  if (searchParams.edit) return <div style={{ display: 'grid', gap: 18, maxWidth: 820 }}><h1 style={{ fontSize: 36 }}>Edit {ev.title}</h1><EventForm action={saveEvent} ev={ev} userId={user.id} /></div>;
  const { data: tickets } = await db.from('tickets').select('code, holder_name, status, checked_in_at, ticket_types(name), orders(buyer_email)').eq('event_id', ev.id).order('created_at', { ascending: false }).limit(1000);
  const { data: orders } = await db.from('orders').select('subtotal_kobo').eq('event_id', ev.id).eq('status', 'paid');
  const { data: invites } = await db.from('invites').select('status').eq('event_id', ev.id);
  const valid = (tickets || []).filter((t: any) => t.status !== 'void');
  const used = valid.filter((t: any) => t.status === 'used').length;
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 12, flexWrap: 'wrap' }}>
        <div><p className="eyebrow">{fmtDay(ev.starts_at)} · {ev.venue}</p><h1 style={{ fontSize: 36 }}>{ev.title}</h1></div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link className="btn ghost" href={`/e/${ev.slug}`}>View page</Link>
          <Link className="btn ghost" href={`?edit=1`}>Edit</Link>
          <form action={setStatus}><input type="hidden" name="id" value={ev.id} /><input type="hidden" name="status" value={ev.status === 'published' ? 'draft' : 'published'} /><button className="btn ghost">{ev.status === 'published' ? 'Unpublish' : 'Publish'}</button></form>
          <Link className="btn primary" href={`/door/${ev.id}`}>Door check-in</Link>
        </div>
      </div>
      <div className="stats">
        <div className="stat"><span className="eyebrow">Ticket sales</span><b>{naira((orders || []).reduce((a: number, o: any) => a + o.subtotal_kobo, 0))}</b></div>
        <div className="stat"><span className="eyebrow">Sold</span><b>{valid.length}/{ev.ticket_types.reduce((a: number, t: any) => a + t.quantity, 0)}</b></div>
        <div className="stat"><span className="eyebrow">Checked in</span><b>{used}/{valid.length}</b></div>
        <div className="stat"><span className="eyebrow">Invites</span><b>{(invites || []).filter((i: any) => i.status === 'paid').length}/{invites?.length || 0}</b><span className="muted">Accepted and paid</span></div>
      </div>
      <div className="panel tablewrap"><h2 style={{ fontSize: 20, marginBottom: 10 }}>Ticket types</h2><table><thead><tr><th>Type</th><th className="r">Price</th><th className="r">Sold</th><th className="r">Left</th></tr></thead><tbody>
        {ev.ticket_types.map((t: any) => <tr key={t.id}><td>{t.name}</td><td className="r">{priceLabel(t.price_kobo)}</td><td className="r">{t.sold}</td><td className="r">{t.quantity - t.sold}</td></tr>)}</tbody></table></div>
      <div className="panel tablewrap"><h2 style={{ fontSize: 20, marginBottom: 10 }}>Guest list · {valid.length}</h2>
        {tickets?.length ? <table><thead><tr><th>Guest</th><th>Ticket</th><th>Code</th><th>Status</th></tr></thead><tbody>
          {tickets.map((t: any) => <tr key={t.code}><td><b>{t.holder_name}</b><br /><span className="muted">{t.orders?.buyer_email}</span></td><td>{t.ticket_types?.name}</td><td className="mono">{t.code}</td><td><span className={'pill ' + (t.status === 'void' ? 'void' : t.status === 'used' ? 'used' : 'live')}>{t.status === 'void' ? 'Refunded' : t.status === 'used' ? 'Checked in' : 'Valid'}</span></td></tr>)}
        </tbody></table> : <p className="muted">No tickets yet.</p>}</div>
    </div>
  );
}
