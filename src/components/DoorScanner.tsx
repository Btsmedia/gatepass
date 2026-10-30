'use client';
import { useEffect, useRef, useState } from 'react';

const REASONS: Record<string, string> = { not_found: 'No ticket has this code.', wrong_event: 'This ticket is for another event.', used: 'Already checked in.', refunded: 'This ticket was refunded.' };

export default function DoorScanner({ eventId }: { eventId: string }) {
  const [res, setRes] = useState<any>(null);
  const [cam, setCam] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const busy = useRef(false);

  async function check(code: string) {
    if (busy.current || !code) return; busy.current = true;
    const r = await fetch('/api/checkin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, eventId }) }).then((x) => x.json()).catch(() => ({ ok: false, reason: 'network' }));
    setRes({ ...r, code }); navigator.vibrate?.(r.ok ? 80 : [60, 60, 60]);
    setTimeout(() => { busy.current = false; }, 1500);
  }

  useEffect(() => {
    if (!cam) return;
    let stream: MediaStream, stop = false;
    const BD = (window as any).BarcodeDetector;
    if (!BD) { setCam(false); alert('Camera scanning needs Chrome on Android, or type the code.'); return; }
    const det = new BD({ formats: ['qr_code'] });
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then(async (s) => {
      stream = s; if (video.current) { video.current.srcObject = s; await video.current.play(); }
      const loop = async () => { if (stop || !video.current) return; try { const c = await det.detect(video.current); if (c[0]) await check(c[0].rawValue); } catch {} requestAnimationFrame(loop); };
      loop();
    }).catch(() => setCam(false));
    return () => { stop = true; stream?.getTracks().forEach((t) => t.stop()); };
  }, [cam]);

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className={'result ' + (res ? (res.ok ? 'ok' : 'bad') : '')} aria-live="polite">
        {res ? <><h2>{res.ok ? 'Admit' : 'Stop'}</h2><p>{res.ok ? `${res.holder} · ${res.type}` : REASONS[res.reason] || 'Try again.'}</p><span className="mono muted">{res.code}</span></> : <><h2>Ready</h2><p className="muted">Scan a QR code or type the ticket code.</p></>}
      </div>
      {cam && <video ref={video} playsInline muted style={{ width: '100%', borderRadius: 20, background: '#000' }} />}
      <form style={{ display: 'flex', gap: 8 }} onSubmit={(e) => { e.preventDefault(); const f = e.currentTarget; check(String(new FormData(f).get('code') || '')); f.reset(); }}>
        <input name="code" placeholder="GP…" autoCapitalize="characters" aria-label="Ticket code" className="mono" />
        <button className="btn primary">Check in</button>
      </form>
      <button className="btn ghost" onClick={() => setCam(!cam)}>{cam ? 'Stop camera' : 'Scan with camera'}</button>
    </div>
  );
}
