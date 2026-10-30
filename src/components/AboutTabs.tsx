'use client';
import { useState } from 'react';

type Props = { activities: { time?: string; title: string; note?: string }[]; expect: { label: string; value?: string }[]; guests: { name: string; role?: string }[]; going: { count: number; names: string[] } | null; doors: string };

export default function AboutTabs({ activities, expect, guests, going, doors }: Props) {
  const [tab, setTab] = useState<'activities' | 'expect' | 'guests'>('activities');
  const tabs: [typeof tab, string][] = [['activities', 'Activities'], ['expect', 'What to expect'], ['guests', 'Guest list']];
  const base = [{ label: 'Doors open', value: doors }, { label: 'Entry', value: 'QR ticket, scanned once at the door' }];
  const all = [...expect, ...base.filter((b) => !expect.some((x) => x.label.toLowerCase() === b.label.toLowerCase()))];
  return (
    <section>
      <div className="tabs" role="tablist" aria-label="Event details">
        {tabs.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>)}
      </div>
      <div className="tabpanel" role="tabpanel">
        {tab === 'activities' && (activities.length ? <ol className="agenda">{activities.map((a, i) => <li key={i}><b className="num">{a.time}</b><span><b>{a.title}</b>{a.note && <><br /><span className="muted">{a.note}</span></>}</span></li>)}</ol> : <p className="muted">The organizer hasn’t shared a schedule yet. Doors open at {doors}.</p>)}
        {tab === 'expect' && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>{all.map((x, i) => <div key={i} style={{ background: 'var(--card)', borderRadius: 16, padding: '12px 14px' }}><span className="muted" style={{ fontSize: 12.5 }}>{x.label}</span><br /><b style={{ fontWeight: 500 }}>{x.value}</b></div>)}</div>}
        {tab === 'guests' && <div style={{ display: 'grid', gap: 14 }}>
          {guests.length > 0 && <div><h3 style={{ fontSize: 16, marginBottom: 10 }}>Special guests</h3><div style={{ display: 'grid', gap: 8 }}>{guests.map((g, i) => <div key={i}><b style={{ fontWeight: 500 }}>{g.name}</b> <span className="muted">· {g.role}</span></div>)}</div></div>}
          {going && <div><h3 style={{ fontSize: 16, marginBottom: 10 }}>Who’s going</h3>{going.count ? <p><b>{going.count} {going.count === 1 ? 'ticket' : 'tickets'}</b> so far · {going.names.join(', ')}{going.count > going.names.length ? ' and more' : ''}</p> : <p className="muted">Be the first to get a ticket.</p>}</div>}
          {!guests.length && !going && <p className="muted">The organizer keeps the guest list private.</p>}
        </div>}
      </div>
    </section>
  );
}
