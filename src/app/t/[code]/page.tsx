import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { fmtDay, fmtTime, priceLabel } from '@/lib/money';
import ShareTicket from '@/components/ShareTicket';

export const dynamic = 'force-dynamic';

// Anyone with the ticket link can show it at the door, like a PDF ticket.
export default async function TicketPage({ params }: { params: { code: string } }) {
  const code = params.code.toUpperCase();
  const { data: t } = await supabaseAdmin().from('tickets').select('*, ticket_types(name, price_kobo), events(title, slug, starts_at, venue, city)').eq('code', code).maybeSingle();
  if (!t) notFound();
  const ev = (t as any).events, tt = (t as any).ticket_types;
  const qr = await QRCode.toDataURL(t.code, { width: 360, margin: 1 });
  const status = t.status === 'void' ? <span className="pill void">Refunded</span> : t.status === 'used' ? <span className="pill used">Checked in</span> : <span className="pill live">Valid</span>;
  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 820 }}>
      <div className="ticket">
        <div className="m">
          <p className="eyebrow">{tt?.name} · {priceLabel(tt?.price_kobo || 0)}</p>
          <h1 style={{ fontSize: 30 }}>{ev?.title}</h1>
          <dl className="facts" style={{ margin: 0 }}>
            <div><dt>Date</dt><dd>{fmtDay(ev.starts_at)}</dd></div>
            <div><dt>Doors</dt><dd>{fmtTime(ev.starts_at)}</dd></div>
            <div><dt>Venue</dt><dd>{ev.venue}{ev.city ? `, ${ev.city}` : ''}</dd></div>
            <div><dt>Holder</dt><dd>{t.holder_name}</dd></div>
          </dl>
        </div>
        <div className="q"><img src={qr} alt={`QR code for ticket ${t.code}`} /><span className="mono">{t.code}</span>{status}</div>
      </div>
      <ShareTicket code={t.code} title={ev.title} when={`${fmtDay(ev.starts_at)}, ${fmtTime(ev.starts_at)}`} venue={ev.venue} />
    </div>
  );
}
