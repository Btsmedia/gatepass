'use client';
import { useState } from 'react';

type T = { id: string; name: string; price_kobo: number; quantity: number; sold: number; max_per_order: number };
const naira = (k: number) => '₦' + Math.round(k / 100).toLocaleString('en-NG');

export default function BuyBox({ eventId, types, feePercent, feeFlatKobo, invite }: { eventId: string; types: T[]; feePercent: number; feeFlatKobo: number; invite?: { id: string; typeId: string; name?: string; email?: string; phone?: string } }) {
  const [qty, setQty] = useState<Record<string, number>>(invite ? { [invite.typeId]: 1 } : {});
  const [step, setStep] = useState<'pick' | 'details'>(invite ? 'details' : 'pick');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const fee = (p: number) => (p > 0 ? Math.round((p * feePercent) / 100) + feeFlatKobo : 0);
  const lines = types.filter((t) => qty[t.id] > 0);
  const sub = lines.reduce((a, t) => a + qty[t.id] * t.price_kobo, 0);
  const fees = lines.reduce((a, t) => a + qty[t.id] * fee(t.price_kobo), 0);
  const count = lines.reduce((a, t) => a + qty[t.id], 0);

  async function pay(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr(''); setBusy(true);
    const f = new FormData(e.currentTarget);
    const res = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      eventId, inviteId: invite?.id, name: f.get('name'), email: f.get('email'), phone: f.get('phone'),
      items: lines.map((t) => ({ ticket_type_id: t.id, quantity: qty[t.id] })),
    }) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.url) { setErr(json.error || 'Something went wrong. Try again.'); setBusy(false); return; }
    window.location.href = json.url;
  }

  return (
    <aside className="panel buy" style={{ display: 'grid', gap: 14 }}>
      <h2 style={{ fontSize: 20 }}>{invite ? 'Your invite' : 'Tickets'}</h2>
      {step === 'pick' && types.map((t) => {
        const left = t.quantity - t.sold, q = qty[t.id] || 0, max = Math.min(left, t.max_per_order);
        return (
          <div className="ttype" key={t.id}>
            <div><b>{t.name}</b><div className="muted" style={{ fontSize: 13 }}>{t.price_kobo ? `${naira(t.price_kobo)} + ${naira(fee(t.price_kobo))} fee` : 'Free'} · {left > 0 ? (left <= 20 ? `${left} left` : 'Available') : 'Sold out'}</div></div>
            <div className="stepper">
              <button type="button" aria-label={`Remove one ${t.name}`} disabled={q <= 0} onClick={() => setQty({ ...qty, [t.id]: q - 1 })}>−</button>
              <output className="num">{q}</output>
              <button type="button" aria-label={`Add one ${t.name}`} disabled={q >= max} onClick={() => setQty({ ...qty, [t.id]: q + 1 })}>+</button>
            </div>
          </div>
        );
      })}
      {count > 0 && <div className="summary">
        {lines.map((t) => <div key={t.id}><span>{qty[t.id]} × {t.name}</span><span>{t.price_kobo ? naira(qty[t.id] * t.price_kobo) : 'Free'}</span></div>)}
        {fees > 0 && <div className="muted"><span>Booking fee</span><span>{naira(fees)}</span></div>}
        <div style={{ fontWeight: 700 }}><span>Total</span><span>{sub + fees ? naira(sub + fees) : 'Free'}</span></div>
      </div>}
      {step === 'pick' ? <button className="btn primary wide" disabled={!count} onClick={() => setStep('details')}>{count ? 'Continue' : 'Select tickets'}</button> : (
        <form className="stack" onSubmit={pay}>
          <div className="field"><label htmlFor="name">Full name</label><input id="name" name="name" autoComplete="name" required defaultValue={invite?.name} /></div>
          <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" required defaultValue={invite?.email} /></div>
          <div className="field"><label htmlFor="phone">Phone (WhatsApp)</label><input id="phone" name="phone" type="tel" autoComplete="tel" defaultValue={invite?.phone} /></div>
          {err && <p className="err" role="alert">{err}</p>}
          <button className="btn primary wide" disabled={busy}>{busy ? 'Starting payment…' : sub + fees ? `Pay ${naira(sub + fees)}` : 'Get free tickets'}</button>
          {!invite && <button type="button" className="btn ghost wide" onClick={() => setStep('pick')}>Change tickets</button>}
          <p className="muted" style={{ fontSize: 13, textAlign: 'center' }}>Card, bank transfer or USSD via Paystack.</p>
        </form>
      )}
    </aside>
  );
}
