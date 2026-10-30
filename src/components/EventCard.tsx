import Link from 'next/link';
import { fmtDay, fmtTime, naira } from '@/lib/money';
import { fromPrice, soldOut } from '@/lib/events';

export default function EventCard({ ev }: { ev: any }) {
  const min = fromPrice(ev.ticket_types);
  return (
    <Link className="card" href={`/e/${ev.slug}`}>
      <div className="pic" style={{ backgroundImage: ev.cover_url ? `url(${ev.cover_url})` : 'linear-gradient(160deg,#BFB6F8,#93B3D8)' }} />
      <div className="b">
        {ev.category && <span className="eyebrow">{ev.category}</span>}
        <h3>{ev.title}</h3>
        <p className="muted">{fmtDay(ev.starts_at)} · {fmtTime(ev.starts_at)}</p>
        <p className="muted">{ev.venue}{ev.city ? `, ${ev.city}` : ''}</p>
        <p style={{ fontWeight: 600, marginTop: 6 }}>{soldOut(ev.ticket_types) ? 'Sold out' : min > 0 ? `From ${naira(min)}` : 'Free'}</p>
      </div>
    </Link>
  );
}
