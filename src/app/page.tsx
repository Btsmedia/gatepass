import Link from 'next/link';
import './landing.css';
import { listUpcoming, fromPrice, soldOut } from '@/lib/events';
import { bg } from '@/lib/poster';
import { fmtDay, fmtTime, naira } from '@/lib/money';
import { Ico } from '@/components/landing/Icons';
import { Phone, DiscoverScreen, EventScreen, TicketScreen, InviteScreen, OrgScreen } from '@/components/landing/Phone';
import Featured from '@/components/landing/Featured';

export const dynamic = 'force-dynamic';

const CATEGORIES = ['Music', 'Tech', 'Business', 'Food & drink', 'Faith', 'Arts', 'Comedy', 'Sports', 'Parties'];
const AUD = [
  { cat: 'Parties', t: 'Party people', d: 'Rooftops, raves and Detty December', ic: Ico.spark },
  { cat: 'Comedy', t: 'Culture lovers', d: 'Comedy, art and live jazz', ic: Ico.mic },
  { cat: 'Tech', t: 'Builders and founders', d: 'Summits, meetups and breakfasts', ic: Ico.chart },
  { cat: 'Faith', t: 'Faith and community', d: 'Praise nights and festivals', ic: Ico.cross },
];
const price = (ev: any) => { const m = fromPrice(ev.ticket_types); return m > 0 ? `From ${naira(m)}` : 'Free'; };
const shortDay = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Africa/Lagos' });
const mon = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { month: 'short', timeZone: 'Africa/Lagos' });
const dnum = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', timeZone: 'Africa/Lagos' });

export default async function Home() {
  const up = await listUpcoming().catch(() => [] as any[]);
  const ordered = [...up.filter((e: any) => e.featured), ...up.filter((e: any) => !e.featured && e.promo_url), ...up.filter((e: any) => !e.featured && !e.promo_url)];
  const cities = Array.from(new Set(up.map((e: any) => e.city).filter(Boolean))) as string[];
  const fans = [0, 1, 2, 3].map((k) => ordered[k]);
  const featured = ordered.slice(0, 6).map((ev: any, k: number) => ({
    id: ev.id, slug: ev.slug, title: ev.title, tagline: ev.tagline, category: ev.category,
    when: `${fmtDay(ev.starts_at)} · ${fmtTime(ev.starts_at)}`, venue: `${ev.venue}${ev.city ? ', ' + ev.city : ''}`,
    price: price(ev), soldOut: soldOut(ev.ticket_types), bg: bg(ev, k), promo: ev.promo_url,
  }));
  const cats = CATEGORIES.map((c) => ({ c, list: up.filter((e: any) => e.category === c) })).filter((x) => x.list.length);
  const fA = ordered[0], fB = ordered[1] || ordered[0], fC = ordered[2] || ordered[0];

  return (
    <>
      <section className="skyhero"><div className="wrap">
        <span className="tagpill" style={{ background: 'rgba(255,255,255,.18)', borderColor: 'rgba(255,255,255,.35)', color: '#fff' }}>{cities.length ? 'Live in ' + cities.slice(0, 4).join(' · ') : 'Events across Nigeria'}</span>
        <h1><span className="lt">Find the</span> best nights. Get in <span className="lt">with one tap.</span></h1>
        <p className="lede">Concerts, comedy, conferences and owambe near you. Pay in naira, get your QR ticket in seconds, and bring your people along.</p>
        <form className="bigsearch" action="/events" role="search">{Ico.search}<input name="q" type="search" placeholder="Search events, artists, venues" aria-label="Search events" /><button className="btn primary" type="submit">Find events</button></form>
        <div className="quick">
          <Link className="chip" href="/events?when=weekend">This weekend</Link>
          {cities.slice(0, 4).map((c) => <Link key={c} className="chip" href={`/events?city=${encodeURIComponent(c)}`}>{c}</Link>)}
        </div>
        <div className="stage">
          {(['f1', 'f2'] as const).map((c, k) => <Fan key={c} cls={c} ev={fans[k]} i={k} />)}
          <Phone><DiscoverScreen events={ordered} /></Phone>
          {(['f3', 'f4'] as const).map((c, k) => <Fan key={c} cls={c} ev={fans[k + 2]} i={k + 2} />)}
        </div>
      </div></section>

      {featured.length > 0 && <>
        <section className="lsec cent"><span className="tagpill">Featured</span><h2 className="tt"><span>On Gatepass</span> this month</h2></section>
        <Featured items={featured} />
      </>}

      <section className="lsec">
        <div className="cent"><span className="tagpill">Who it’s for</span><h2 className="tt"><span>Built for every</span> kind of night out</h2></div>
        <div className="aud">{AUD.map((a, k) => { const ev = up.find((e: any) => e.category === a.cat); return (
          <Link key={a.cat} className="audc" href={`/events?category=${encodeURIComponent(a.cat)}`} style={{ background: bg(ev, k + 1) }}>
            {ev?.promo_url && <video src={ev.promo_url} muted loop playsInline autoPlay preload="metadata" aria-hidden="true" />}
            <span className="cap"><i>{a.ic}</i><span><b>{a.t}</b><small>{a.d}</small></span></span>
          </Link>); })}</div>
      </section>

      {up.length > 0 && <section className="lsec">
        <div className="lsec-head"><h2>Coming up</h2><Link className="pillbtn" href="/events">See all {up.length} events {Ico.right}</Link></div>
        <div className="rail">{up.slice(0, 10).map((ev: any, k: number) => (
          <Link key={ev.id} className="mini" href={`/e/${ev.slug}`}>
            <div className="pic" style={{ background: bg(ev, k) }}><div className="datechip"><span>{mon(ev.starts_at)}</span><b>{dnum(ev.starts_at)}</b></div></div>
            <div><h3>{ev.title}</h3><p>{ev.city || ev.venue} · {price(ev)}</p></div>
          </Link>))}</div>
      </section>}

      {cats.length > 0 && <section className="lsec">
        <div className="lsec-head"><h2>Find your thing</h2><p>{up.length} upcoming events in {cities.length} {cities.length === 1 ? 'city' : 'cities'}.</p></div>
        <div className="catgrid">{cats.map((x, k) => (
          <Link key={x.c} className="cattile" href={`/events?category=${encodeURIComponent(x.c)}`}><i style={{ background: bg(x.list[0], k) }} /><span style={{ display: 'block' }}><b>{x.c}</b><span>{x.list.length} {x.list.length === 1 ? 'event' : 'events'}</span></span></Link>))}</div>
      </section>}

      <section className="lsec">
        <div className="cent"><span className="tagpill">How it works</span><h2 className="tt"><span>From one tap</span> to the front door</h2></div>
        <div className="psteps">
          <div className="pstep"><span className="num">01</span><span className="tile">{Ico.search}</span><div><h3>Find your night</h3><p>Browse by date, city or category, or open a link a friend sent you.</p></div></div>
          <div className="pstep"><span className="num">02</span><span className="tile">{Ico.card}</span><div><h3>Pay in naira</h3><p>Card, transfer or USSD. The booking fee shows before you pay, never after.</p></div></div>
          <div className="pstep"><span className="num">03</span><span className="tile">{Ico.qr}</span><div><h3>Show your QR</h3><p>Your ticket arrives by email and in My tickets. Download it, share it, scan it once at the door.</p></div></div>
        </div>
      </section>

      <section className="lsec">
        <div className="cent"><span className="tagpill">Core features</span><h2 className="tt"><span>Features built</span> for nights out</h2></div>
        <div className="frows">
          <div className="frow"><div className="fimg" style={{ background: bg(fC, 3) }}><Phone><TicketScreen ev={fC} i={3} /></Phone></div>
            <div className="ftxt"><h3>A ticket wallet that travels</h3><p>Every ticket you buy lives in My tickets with its own QR code. Save it to your camera roll or send it to the friend who’s using it.</p><ul><li>Download any ticket as an image</li><li>Share by WhatsApp or link</li><li>Each code scans once at the door</li></ul></div></div>
          <div className="frow"><div className="fimg" style={{ background: bg(fB, 1) }}><Phone><InviteScreen ev={fB} i={1} /></Phone></div>
            <div className="ftxt"><h3>Invites where friends pay their own way</h3><p>Send an invite by email or WhatsApp. Your friends see who invited them and what it costs, then accept and pay. No chasing transfers in the group chat.</p><ul><li>Guests only pay after they accept</li><li>Track who’s in from My tickets</li></ul></div></div>
          <div className="frow"><div className="fimg" style={{ background: bg(fA, 4) }}><Phone><EventScreen ev={fA} i={4} /></Phone></div>
            <div className="ftxt"><h3>See the night before you go</h3><p>Organizers add promo clips and galleries from their last edition, so you know the vibe before you buy.</p><ul><li>Promo videos on featured events</li><li>Photos and clips from past editions</li></ul></div></div>
        </div>
      </section>

      <section className="orgsky" id="organizers"><div className="wrap">
        <div className="ot">
          <p className="eyebrow">For organizers</p>
          <h2><span>Your events,</span> selling right now</h2>
          <p>Publish an event page in minutes, sell tickets in naira, check guests in from your phone and watch every sale land live. You keep the full ticket price.</p>
          <div className="orgcta"><Link className="btn white" href="/organizer/events/new">Create your event</Link><Link className="btn glass" href="/organizer">See the dashboard</Link></div>
        </div>
        <div className="pwrap">
          <div className="chipf c1"><i /><span><b>New order</b><small>2 × VIP · just now</small></span></div>
          <div className="chipf c2"><span><b>{up.length ? `${up.length} events live` : 'Payouts to your bank'}</b><small>{up.length ? `across ${cities.length} ${cities.length === 1 ? 'city' : 'cities'}` : 'automatically, via Paystack'}</small></span></div>
          <Phone><OrgScreen /></Phone>
        </div>
      </div></section>
      <section className="orgfeat">
        <div className="feat2">
          <div>{Ico.page}<h3>Event page in minutes</h3><p>Ticket types, free RSVPs, a cover and a promo video. One link for everywhere.</p></div>
          <div>{Ico.bank}<h3>Payouts to your bank</h3><p>Paystack sends your ticket sales to your Nigerian bank account, usually the next business day.</p></div>
          <div>{Ico.scan}<h3>Door check-in</h3><p>Scan QR codes with a phone or type the code. Every ticket works once.</p></div>
          <div>{Ico.chart}<h3>Live dashboard</h3><p>Sales, orders, check-ins and invites for every event, as they happen.</p></div>
          <div>{Ico.play}<h3>Video and gallery</h3><p>Show your promo clip and photos from your last edition on the event page.</p></div>
          <div>{Ico.invite}<h3>Built-in invites</h3><p>Guests invite their friends. Every invite that’s accepted is another ticket sold.</p></div>
        </div>
        <div className="pricing2">
          <div className="pc"><p className="eyebrow" style={{ color: 'inherit', opacity: 0.7 }}>Free events</p><div className="amt">₦0</div><p>RSVP tickets, door check-in and your dashboard at no cost.</p></div>
          <div className="pc hl"><p className="eyebrow" style={{ color: 'inherit', opacity: 0.7 }}>Paid events</p><div className="amt">5% + ₦100</div><p>Per ticket, added as a booking fee at checkout. You receive the full ticket price.</p></div>
        </div>
      </section>

      <section className="lsec">
        <div className="cent"><span className="tagpill">FAQ</span><h2 className="tt"><span>Questions,</span> answered</h2></div>
        <div className="faq" style={{ margin: '0 auto', width: '100%' }}>
          <details><summary>Do I need an account to buy a ticket?</summary><p>No. Enter your name, email and phone at checkout. Your tickets arrive by email, and you can sign in with the same email later to see them all.</p></details>
          <details><summary>How do I pay?</summary><p>By card, bank transfer or USSD through Paystack, all in naira. The booking fee is shown before you pay.</p></details>
          <details><summary>Can I buy for friends?</summary><p>Yes. Buy several tickets and share each one, or send invites so friends pay for their own ticket when they accept.</p></details>
          <details><summary>What if I lose my ticket?</summary><p>Your tickets are in your email and under My tickets. The organizer can also find you on the guest list by name or email.</p></details>
          <details><summary>How do organizers get paid?</summary><p>Add your bank account under Organizer › Payouts. Paystack sends your ticket sales to it automatically, usually the next business day.</p></details>
        </div>
      </section>

      <section className="endcta">
        <h2>Your next night out starts here.</h2>
        <p className="muted" style={{ fontSize: 17, maxWidth: '48ch' }}>Browse what’s on this week, or put your own event in front of people looking for something to do.</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}><Link className="btn primary" href="/events">Browse events</Link><Link className="btn ghost" href="/organizer/events/new">Create an event</Link></div>
      </section>
    </>
  );
}

function Fan({ cls, ev, i }: { cls: string; ev: any; i: number }) {
  const inner = <>{ev?.promo_url && <video src={ev.promo_url} muted loop playsInline autoPlay preload="metadata" aria-hidden="true" />}{ev && <span>{ev.title}<small>{shortDay(ev.starts_at)} · {ev.city || ''}</small></span>}</>;
  return ev ? <Link className={`fan ${cls}`} href={`/e/${ev.slug}`} style={{ background: bg(ev, i) }} aria-label={ev.title}>{inner}</Link>
    : <div className={`fan ${cls}`} style={{ background: bg(undefined, i) }} aria-hidden="true" />;
}
