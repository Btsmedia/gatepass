'use client';
import { useState } from 'react';

export default function InviteForm({ eventId, types }: { eventId: string; types: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([{ contact: '', name: '' }]);
  const [out, setOut] = useState<any[] | null>(null);
  const [err, setErr] = useState('');
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr('');
    const f = new FormData(e.currentTarget);
    const r = await fetch('/api/invites', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId, ticketTypeId: f.get('type'), fromName: f.get('from'), note: f.get('note'), guests: rows.filter((x) => x.contact) }) });
    const j = await r.json(); if (!r.ok) { setErr(j.error); return; } setOut(j.invites);
  }
  if (!open) return <button className="btn ghost wide" onClick={() => setOpen(true)}>Invite friends — they pay when they accept</button>;
  if (out) return <div className="panel stack"><h3>Invites ready</h3>{out.map((i) => <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}><span>{i.contact}</span>{i.whatsapp ? <a className="btn small" href={i.whatsapp} target="_blank" rel="noopener">Send on WhatsApp</a> : <span className="muted">Emailed</span>}</div>)}</div>;
  return (
    <form className="panel stack" onSubmit={submit}>
      <h3>Invite people</h3>
      <div className="row2"><div className="field"><label htmlFor="from">Your name</label><input id="from" name="from" required /></div>
        <div className="field"><label htmlFor="type">Ticket</label><select id="type" name="type">{types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div></div>
      {rows.map((r, i) => <div key={i} className="row2"><input placeholder="Phone or email" aria-label="Phone or email" value={r.contact} onChange={(e) => { const n = [...rows]; n[i] = { ...r, contact: e.target.value }; setRows(n); }} /><input placeholder="Name (optional)" aria-label="Name" value={r.name} onChange={(e) => { const n = [...rows]; n[i] = { ...r, name: e.target.value }; setRows(n); }} /></div>)}
      <button type="button" className="btn small ghost" onClick={() => setRows([...rows, { contact: '', name: '' }])}>+ Add another</button>
      <div className="field"><label htmlFor="note">Message (optional)</label><input id="note" name="note" maxLength={140} /></div>
      {err && <p className="err">{err}</p>}
      <button className="btn primary">Create invites</button>
      <p className="muted" style={{ fontSize: 13 }}>Sign in first. Email invites are sent for you; phone invites open WhatsApp.</p>
    </form>
  );
}
