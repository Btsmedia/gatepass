import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { fmtDay, fmtTime, FEE_FLAT_KOBO, FEE_PERCENT, feeFor, priceLabel } from '@/lib/money';
import BuyBox from '@/components/BuyBox';
import InviteActions from '@/components/InviteActions';

export const dynamic = 'force-dynamic';

export default async function InvitePage({ params, searchParams }: { params: { id: string }; searchParams: { accept?: string } }) {
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) notFound();
  const db = supabaseAdmin();
  const { data: inv } = await db.from('invites').select('*, events(*), ticket_types(*)').eq('id', params.id).maybeSingle();
  if (!inv) notFound();
  const ev = (inv as any).events, tt = (inv as any).ticket_types;
  const total = tt.price_kobo + feeFor(tt.price_kobo);
  const accepted = inv.status === 'accepted' || searchParams.accept === '1';
  return (
    <div className="layout" style={{ marginTop: 0 }}>
      <div style={{ display: 'grid', gap: 14 }}>
        <p className="eyebrow">You’re invited</p>
        <h1 style={{ fontSize: 40 }}>{inv.from_name} invited {inv.guest_name ? inv.guest_name.split(' ')[0] : 'you'} to {ev.title}</h1>
        {inv.note && <blockquote style={{ margin: 0, padding: '12px 16px', borderLeft: '3px solid var(--lav-strong)', background: 'var(--surface)', borderRadius: '0 14px 14px 0' }}>“{inv.note}”</blockquote>}
        <p>{fmtDay(ev.starts_at)} · {fmtTime(ev.starts_at)} · {ev.venue}{ev.city ? `, ${ev.city}` : ''}</p>
        <Link href={`/e/${ev.slug}`}>See event details</Link>
      </div>
      {inv.status === 'paid' ? <div className="panel"><h2>You’re going</h2><p className="muted">Your ticket was emailed to you.</p></div>
        : inv.status === 'declined' ? <div className="panel"><h2>You declined this invite</h2><InviteActions id={inv.id} mode="reopen" /></div>
        : accepted ? <BuyBox eventId={ev.id} types={[tt]} feePercent={FEE_PERCENT} feeFlatKobo={FEE_FLAT_KOBO} invite={{ id: inv.id, typeId: tt.id, name: inv.guest_name || '', email: inv.contact_kind === 'email' ? inv.contact : '', phone: inv.contact_kind === 'phone' ? inv.contact : '' }} />
        : <div className="panel" style={{ display: 'grid', gap: 12 }}>
            <div className="summary" style={{ borderTop: 0, paddingTop: 0 }}><div><span>1 × {tt.name}</span><span>{priceLabel(tt.price_kobo)}</span></div><div style={{ fontWeight: 700 }}><span>You pay if you accept</span><span>{priceLabel(total)}</span></div></div>
            <p className="muted">Nothing is charged until you accept. {inv.from_name} isn’t charged for your ticket.</p>
            <InviteActions id={inv.id} mode="respond" />
          </div>}
    </div>
  );
}
