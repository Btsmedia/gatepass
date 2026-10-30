import Link from 'next/link';
import EventCard from '@/components/EventCard';
import { listUpcoming } from '@/lib/events';

export const dynamic = 'force-dynamic';
const CATEGORIES = ['Music', 'Tech', 'Business', 'Food & drink', 'Faith', 'Arts', 'Comedy', 'Sports', 'Parties'];

function range(when?: string) {
  const now = new Date(); const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (when === 'week') return { to: new Date(start.getTime() + 7 * 864e5).toISOString() };
  if (when === 'weekend') { const d = start.getDay(); const fri = new Date(start.getTime() + ((5 - d + 7) % 7) * 864e5); if (d === 6) fri.setTime(start.getTime() - 864e5); if (d === 0) fri.setTime(start.getTime() - 2 * 864e5); return { from: fri.toISOString(), to: new Date(fri.getTime() + 3 * 864e5).toISOString() }; }
  return {};
}

export default async function Discover(props: { searchParams: Promise<Record<string, string | undefined>> }) {
  const searchParams = await props.searchParams;
  const { q, city, category, when } = searchParams;
  const events = await listUpcoming({ q, city, category, ...range(when) }).catch(() => []);
  const link = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams(Object.entries({ q, city, category, when, ...patch }).filter(([, v]) => v) as [string, string][]);
    return '/events' + (p.toString() ? '?' + p : '');
  };
  return (
    <>
      <div className="section-head" style={{ marginTop: 0 }}><h1 style={{ fontSize: 40 }}>Discover</h1><span className="muted num">{events.length} events</span></div>
      <form action="/events" className="search" style={{ margin: '0 0 16px', maxWidth: 640 }}>
        <input name="q" defaultValue={q} placeholder="Search events, venues, cities" aria-label="Search" />
        {city && <input type="hidden" name="city" value={city} />}
        <button className="btn primary">Search</button>
      </form>
      <div className="chips" style={{ marginBottom: 10 }}>
        {[['', 'Any time'], ['week', 'Next 7 days'], ['weekend', 'This weekend']].map(([k, l]) => <Link key={k} className={'chip' + ((when || '') === k ? ' on' : '')} href={link({ when: k || undefined })}>{l}</Link>)}
      </div>
      <div className="chips" style={{ marginBottom: 20 }}>
        <Link className={'chip' + (!category ? ' on' : '')} href={link({ category: undefined })}>All</Link>
        {CATEGORIES.map((c) => <Link key={c} className={'chip' + (category === c ? ' on' : '')} href={link({ category: c })}>{c}</Link>)}
      </div>
      {events.length ? <div className="grid">{events.map((ev: any) => <EventCard key={ev.id} ev={ev} />)}</div>
        : <div className="panel"><h3>Nothing matches</h3><p className="muted">Try another date or category. <Link href="/events">Clear filters</Link></p></div>}
    </>
  );
}
