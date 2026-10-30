import Link from 'next/link';
import EventCard from '@/components/EventCard';
import { listUpcoming } from '@/lib/events';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const events = await listUpcoming().catch(() => []);
  const featured = events.filter((e: any) => e.featured);
  const list = (featured.length ? [...featured, ...events.filter((e: any) => !e.featured)] : events).slice(0, 9);
  const cities = Array.from(new Set(events.map((e: any) => e.city).filter(Boolean))) as string[];
  return (
    <>
      <section className="hero">
        <div className="wrap">
          <h1><span>Find the</span> best nights. Get in <span>with one tap.</span></h1>
          <p>Concerts, comedy, conferences and owambe near you. Pay in naira, get your QR ticket in seconds.</p>
          <form className="search" action="/events"><input name="q" placeholder="Search events, artists, venues" aria-label="Search events" /><button className="btn primary">Find events</button></form>
          {cities.length > 0 && <div className="chips" style={{ justifyContent: 'center', marginTop: 14 }}>{cities.slice(0, 5).map((c) => <Link key={c} className="chip" style={{ color: '#fff', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.5)' }} href={`/events?city=${encodeURIComponent(c)}`}>{c}</Link>)}</div>}
        </div>
      </section>
      <div className="section-head"><h2>Coming up</h2><Link className="btn small" href="/events">See all {events.length} events</Link></div>
      {list.length ? <div className="grid">{list.map((ev: any) => <EventCard key={ev.id} ev={ev} />)}</div>
        : <div className="panel"><h3>No events yet</h3><p className="muted">Organizers can publish the first one from the Organizer page.</p></div>}
      <section className="panel" style={{ marginTop: 40, display: 'grid', gap: 12 }}>
        <p className="eyebrow">For organizers</p>
        <h2 style={{ fontSize: 32 }}>Sell out your next event.</h2>
        <p className="muted" style={{ maxWidth: '52ch' }}>Publish an event page in minutes, sell tickets in naira, check guests in from your phone and get paid to your bank. Free events cost nothing; paid tickets carry a booking fee for the buyer.</p>
        <div><Link className="btn primary" href="/organizer/events/new">Create your event</Link></div>
      </section>
    </>
  );
}
