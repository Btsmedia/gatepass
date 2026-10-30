import QRCode from 'qrcode';
import { bg } from '@/lib/poster';
import { fmtTime, naira } from '@/lib/money';
import { Ico } from './Icons';

const shortDay = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Africa/Lagos' });
const fromPrice = (ev: any) => { const p = (ev?.ticket_types || []).map((t: any) => t.price_kobo); const m = p.length ? Math.min(...p) : 0; return m > 0 ? `From ${naira(m)}` : 'Free'; };
const title = (ev: any, fallback: string) => ev?.title || fallback;

export function Phone({ children }: { children: React.ReactNode }) {
  return <div className="phone" aria-hidden="true"><div className="scr"><div className="notch" /><div className="sb"><span>9:41</span><span><i /></span></div>{children}</div></div>;
}
const Tabs = () => <div className="tabs"><u /><u /><span className="cta">{Ico.qr}</span><u /><u /></div>;

export function DiscoverScreen({ events }: { events: any[] }) {
  const pick = (i: number) => events[i];
  return (
    <>
      <div className="ph"><span className="av" /><b>Discover</b><span className="ic"><u /><u /></span></div>
      <div className="stories">{[0, 1, 2].map((i) => <div key={i} style={{ background: bg(pick(i), i) }}><em>{title(pick(i), '')}</em></div>)}</div>
      <div className="lab">This week</div>
      <div className="grid2">{[3, 4, 5, 6].map((i) => <div key={i} style={{ background: bg(pick(i), i) }}><em>{title(pick(i), '')}</em></div>)}</div>
      <Tabs />
    </>
  );
}

export function EventScreen({ ev, i }: { ev: any; i: number }) {
  return (
    <>
      <div className="evpic" style={{ background: bg(ev, i) }}>{ev?.promo_url && <video src={ev.promo_url} muted loop playsInline autoPlay preload="metadata" />}</div>
      <div className="evb">
        <span style={{ color: '#7E6CF0', fontWeight: 600 }}>{ev?.category || 'Music'}</span>
        <h5>{title(ev, 'Your event here')}</h5>
        <p>{ev ? `${shortDay(ev.starts_at)} · ${fmtTime(ev.starts_at)}` : 'Sat · 8:00 pm'}</p>
        <p>{ev ? `${ev.venue}${ev.city ? ', ' + ev.city : ''}` : 'Lagos'}</p>
        <div className="evrow"><span>{ev?.ticket_types?.[0]?.name || 'Regular'}</span><span>{ev ? fromPrice(ev) : 'From ₦5,000'}</span></div>
      </div>
      <div className="pill">Get tickets</div>
    </>
  );
}

export async function TicketScreen({ ev, i }: { ev: any; i: number }) {
  const qr = await QRCode.toDataURL('GATEPASS-SAMPLE-TICKET', { width: 200, margin: 1 });
  return (
    <>
      <div className="ph"><b>My tickets</b><span className="ic"><u /></span></div>
      <div className="tk">
        <div className="band" style={{ background: bg(ev, i) }}>{title(ev, 'Your next night out')}</div>
        <div className="fx">
          <div><span>Date</span>{ev ? shortDay(ev.starts_at) : 'Sat 12 Dec'}</div>
          <div><span>Doors</span>{ev ? fmtTime(ev.starts_at) : '8:00 pm'}</div>
          <div><span>Venue</span>{ev?.venue || 'Lagos'}</div>
          <div><span>Ticket</span>{ev?.ticket_types?.[0]?.name || 'Regular'}</div>
        </div>
        <div className="qrz"><div className="qr"><img src={qr} alt="" style={{ width: 98, height: 98 }} /></div><span className="mono" style={{ fontSize: 10 }}>Sample ticket</span></div>
      </div>
    </>
  );
}

export function InviteScreen({ ev, i }: { ev: any; i: number }) {
  return (
    <>
      <div className="evpic" style={{ height: '38%', background: bg(ev, i) }}>{ev?.promo_url && <video src={ev.promo_url} muted loop playsInline autoPlay preload="metadata" />}</div>
      <div className="evb">
        <span style={{ color: '#6A6A70', fontSize: 9.5, fontWeight: 600, letterSpacing: '.1em' }}>YOU’RE INVITED</span>
        <h5>Tolu invited you to {title(ev, 'Saturday night')}</h5>
        <p style={{ borderLeft: '2px solid #7E6CF0', paddingLeft: 8, color: '#3A3A40' }}>“Come through, it’ll be a vibe”</p>
        <div className="evrow"><span>You pay if you accept</span><span>{ev ? fromPrice(ev).replace('From ', '') : '₦10,600'}</span></div>
      </div>
      <div style={{ display: 'flex', gap: 6, margin: 'auto 14px 16px' }}><span className="pill" style={{ margin: 0, flex: 1 }}>Accept</span><span className="pill" style={{ margin: 0, flex: 1, background: '#EDECE7', color: '#111214' }}>Decline</span></div>
    </>
  );
}

export function OrgScreen() {
  const bars = [3, 5, 4, 8, 6, 9, 7, 12, 10, 14, 11, 16, 13, 18];
  return (
    <>
      <div className="ph"><b>Organizer</b><span className="ic"><u /></span></div>
      <div className="seg2"><span>Overview</span><span>Events</span><span>Payouts</span></div>
      <div className="tiles">
        <div><i style={{ background: '#BFB6F8' }} /><b>₦2.4M</b><span>Ticket sales</span></div>
        <div><i style={{ background: '#FFB3A6' }} /><b>186</b><span>Tickets sold</span></div>
        <div><i style={{ background: '#A8D8F0' }} /><b>94</b><span>Orders</span></div>
        <div><i style={{ background: '#FFD98A' }} /><b>72%</b><span>Checked in</span></div>
      </div>
      <div className="minibars">{bars.map((b, i) => <i key={i} style={{ height: `${(b / 18) * 100}%` }} />)}</div>
      <div className="qa"><b style={{ fontSize: 11 }}>Quick actions</b><div><span>Create event</span><span>+</span></div><div><span>Door check-in</span><span>›</span></div><div><span>Payouts</span><span>›</span></div></div>
    </>
  );
}
