'use client';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

const CATEGORIES = ['Music', 'Tech', 'Business', 'Food & drink', 'Faith', 'Arts', 'Comedy', 'Sports', 'Parties'];
type Row = Record<string, any>;

function Rows({ label, rows, setRows, fields, blank }: { label: string; rows: Row[]; setRows: (r: Row[]) => void; fields: [string, string, string?][]; blank: Row }) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h2 style={{ fontSize: 18 }}>{label}</h2><button type="button" className="btn small" onClick={() => setRows([...rows, { ...blank }])}>Add</button></div>
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: `repeat(${fields.length}, minmax(0,1fr)) 40px`, gap: 8 }}>
          {fields.map(([k, ph, type]) => <input key={k} type={type || 'text'} placeholder={ph} aria-label={ph} value={r[k] ?? ''} onChange={(e) => { const n = [...rows]; n[i] = { ...r, [k]: type === 'number' ? Number(e.target.value) : e.target.value }; setRows(n); }} />)}
          <button type="button" className="btn small ghost" aria-label="Remove" onClick={() => setRows(rows.filter((_, j) => j !== i))}>×</button>
        </div>
      ))}
    </div>
  );
}

export default function EventForm({ action, ev, userId }: { action: (f: FormData) => Promise<void>; ev?: any; userId: string }) {
  const start = ev ? new Date(ev.starts_at) : null;
  const lagos = start ? new Date(start.getTime() + 3600e3) : null; // shown in Lagos time
  const [types, setTypes] = useState<Row[]>(ev?.ticket_types?.map((t: any) => ({ id: t.id, name: t.name, price: t.price_kobo / 100, quantity: t.quantity })) || [{ name: 'Regular', price: 5000, quantity: 200 }]);
  const [acts, setActs] = useState<Row[]>(ev?.activities || []);
  const [exp, setExp] = useState<Row[]>(ev?.expect || []);
  const [guests, setGuests] = useState<Row[]>(ev?.guests || []);
  const [cover, setCover] = useState<string>(ev?.cover_url || '');
  const [promo, setPromo] = useState<string>(ev?.promo_url || '');
  const [gallery, setGallery] = useState<{ url: string; kind: string }[]>(ev?.gallery || []);
  const [msg, setMsg] = useState('');

  async function upload(files: FileList | null, onDone: (u: { url: string; kind: string }) => void) {
    if (!files) return;
    const sb = supabaseBrowser();
    for (const f of Array.from(files)) {
      if (f.size > 50 * 1024 * 1024) { setMsg(`${f.name} is over 50 MB.`); continue; }
      setMsg(`Uploading ${f.name}…`);
      const path = `${userId}/${Date.now()}-${f.name.replace(/[^\w.-]/g, '_')}`;
      const { error } = await sb.storage.from('media').upload(path, f, { contentType: f.type });
      if (error) { setMsg(error.message); continue; }
      onDone({ url: sb.storage.from('media').getPublicUrl(path).data.publicUrl, kind: f.type.startsWith('video') ? 'video' : 'image' });
      setMsg('Uploaded. Save the event to publish it.');
    }
  }

  return (
    <form action={action} className="stack">
      {ev && <input type="hidden" name="id" value={ev.id} />}
      <input type="hidden" name="ticket_types" value={JSON.stringify(types)} />
      <input type="hidden" name="activities" value={JSON.stringify(acts.filter((a) => a.title))} />
      <input type="hidden" name="expect" value={JSON.stringify(exp.filter((x) => x.label))} />
      <input type="hidden" name="guests" value={JSON.stringify(guests.filter((g) => g.name))} />
      <input type="hidden" name="cover_url" value={cover} />
      <input type="hidden" name="promo_url" value={promo} />
      <input type="hidden" name="gallery" value={JSON.stringify(gallery)} />
      <div className="panel stack">
        <div className="field"><label htmlFor="title">Event name</label><input id="title" name="title" required defaultValue={ev?.title} /></div>
        <div className="field"><label htmlFor="tagline">One-line pitch</label><input id="tagline" name="tagline" defaultValue={ev?.tagline} /></div>
        <div className="row2">
          <div className="field"><label htmlFor="category">Category</label><select id="category" name="category" defaultValue={ev?.category || ''}><option value="">Choose</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
          <div className="field"><label htmlFor="host">Organizer name</label><input id="host" name="host" placeholder="Your brand" /></div>
        </div>
        <div className="row2">
          <div className="field"><label htmlFor="date">Date</label><input id="date" name="date" type="date" required defaultValue={lagos?.toISOString().slice(0, 10)} /></div>
          <div className="field"><label htmlFor="time">Doors open (Lagos time)</label><input id="time" name="time" type="time" defaultValue={lagos?.toISOString().slice(11, 16) || '19:00'} /></div>
        </div>
        <div className="field"><label htmlFor="venue">Venue</label><input id="venue" name="venue" required defaultValue={ev?.venue} /></div>
        <div className="row2">
          <div className="field"><label htmlFor="address">Address</label><input id="address" name="address" defaultValue={ev?.address} /></div>
          <div className="field"><label htmlFor="city">City</label><input id="city" name="city" defaultValue={ev?.city || 'Lagos'} /></div>
        </div>
        <div className="field"><label htmlFor="description">About the event</label><textarea id="description" name="description" defaultValue={ev?.description} /></div>
      </div>
      <div className="panel"><Rows label="Tickets (price in naira)" rows={types} setRows={setTypes} fields={[['name', 'Ticket name'], ['price', 'Price ₦', 'number'], ['quantity', 'Quantity', 'number']]} blank={{ name: '', price: 0, quantity: 100 }} /></div>
      <div className="panel stack">
        <Rows label="Activities" rows={acts} setRows={setActs} fields={[['time', 'Time', 'time'], ['title', 'Activity'], ['note', 'Note']]} blank={{ time: '', title: '', note: '' }} />
        <Rows label="What to expect" rows={exp} setRows={setExp} fields={[['label', 'Dress code'], ['value', 'All white']]} blank={{ label: '', value: '' }} />
        <Rows label="Special guests" rows={guests} setRows={setGuests} fields={[['name', 'Name'], ['role', 'Role']]} blank={{ name: '', role: '' }} />
        <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontWeight: 400 }}><input type="checkbox" name="show_going" defaultChecked={ev ? ev.show_going : true} style={{ width: 'auto' }} /> Show who’s going (first name and initial)</label>
      </div>
      <div className="panel stack">
        <h2 style={{ fontSize: 18 }}>Media</h2>
        <div className="field"><label>Cover image</label>{cover && <img src={cover} alt="" style={{ maxHeight: 160, borderRadius: 14 }} />}<input type="file" accept="image/*" onChange={(e) => upload(e.target.files, (u) => setCover(u.url))} /></div>
        <div className="field"><label>Promo video</label>{promo && <video src={promo} muted controls style={{ maxHeight: 160, borderRadius: 14 }} />}<input type="file" accept="video/mp4,video/webm" onChange={(e) => upload(e.target.files, (u) => setPromo(u.url))} /></div>
        <div className="field"><label htmlFor="past_title">Last edition gallery title</label><input id="past_title" name="past_title" defaultValue={ev?.past_title} placeholder="Last year’s edition" /></div>
        <div className="field"><label>Gallery photos and clips</label><input type="file" multiple accept="image/*,video/mp4,video/webm" onChange={(e) => upload(e.target.files, (u) => setGallery((g) => [...g, u]))} /><span className="muted">{gallery.length} items</span></div>
        {msg && <p className="muted" role="status">{msg}</p>}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn primary" name="intent" value="publish">Save and publish</button>
        <button className="btn ghost" name="intent" value="draft">Save as draft</button>
      </div>
    </form>
  );
}
