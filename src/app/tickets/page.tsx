import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { fmtDay } from '@/lib/money';

export const dynamic = 'force-dynamic';

export default async function MyTickets() {
  const user = await requireUser('/tickets');
  const db = supabaseAdmin();
  // Tickets bought while signed in, or with the same email before signing up.
  const { data: orders } = await db.from('orders').select('id').eq('status', 'paid').or(`user_id.eq.${user.id},buyer_email.eq.${(user.email || '').toLowerCase()}`);
  const ids = (orders || []).map((o) => o.id);
  const { data: tickets } = ids.length ? await db.from('tickets').select('code, status, ticket_types(name), events(title, starts_at, venue)').in('order_id', ids) : { data: [] as any[] };
  const { data: invites } = await db.from('invites').select('id, guest_name, contact, status, events(title)').eq('inviter_id', user.id).order('created_at', { ascending: false });
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <h1 style={{ fontSize: 40 }}>My tickets</h1>
      {tickets?.length ? <div style={{ display: 'grid', gap: 10 }}>{tickets.map((t: any) => (
        <Link key={t.code} className="panel" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, textDecoration: 'none', flexWrap: 'wrap' }} href={`/t/${t.code}`}>
          <span><b>{t.events?.title}</b><br /><span className="muted">{fmtDay(t.events?.starts_at)} · {t.events?.venue} · {t.ticket_types?.name}</span></span>
          <span className="mono">{t.code}</span>
        </Link>))}</div> : <div className="panel"><p className="muted">No tickets yet. <Link href="/events">Find an event</Link>.</p></div>}
      {!!invites?.length && <><h2 style={{ fontSize: 26, marginTop: 12 }}>Invites you sent</h2>
        <div className="panel tablewrap"><table><tbody>{invites.map((i: any) => <tr key={i.id}><td>{i.guest_name || i.contact}</td><td>{i.events?.title}</td><td className="r"><span className={'pill ' + (i.status === 'paid' ? 'live' : i.status === 'declined' ? 'used' : 'draft')}>{i.status}</span></td></tr>)}</tbody></table></div></>}
    </div>
  );
}
