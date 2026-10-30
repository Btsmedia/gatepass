'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Ico } from './Icons';

type Ev = { id: string; slug: string; title: string; tagline?: string; category?: string; when: string; venue: string; price: string; soldOut: boolean; bg: string; promo?: string | null };
const DUR = 7000;

// Apple TV-style featured carousel: swipe, arrows, dots with progress, auto-advance, pause.
export default function Featured({ items }: { items: Ev[] }) {
  const track = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hover, setHover] = useState(false);
  const [muted, setMuted] = useState(true);
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const goTo = useCallback((n: number, smooth = true) => {
    const t = track.current; if (!t) return;
    const k = (n + items.length) % items.length; const s = t.children[k] as HTMLElement;
    t.scrollTo({ left: s.offsetLeft - (t.clientWidth - s.clientWidth) / 2, behavior: smooth && !reduced ? 'smooth' : 'auto' });
  }, [items.length, reduced]);

  useEffect(() => {
    const t = track.current; if (!t) return;
    let raf = 0;
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => {
      const mid = t.scrollLeft + t.clientWidth / 2; let best = 0, bd = Infinity;
      Array.from(t.children).forEach((c, k) => { const el = c as HTMLElement; const d = Math.abs(el.offsetLeft + el.clientWidth / 2 - mid); if (d < bd) { bd = d; best = k; } });
      setI(best);
    }); };
    t.addEventListener('scroll', onScroll, { passive: true });
    return () => t.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const t = track.current; if (!t) return;
    Array.from(t.querySelectorAll('video')).forEach((v, k) => { const vid = v as HTMLVideoElement; const slide = vid.closest('[data-k]') as HTMLElement; if (Number(slide.dataset.k) === i) { vid.muted = muted; if (!reduced || !muted) vid.play().catch(() => {}); } else vid.pause(); });
  }, [i, muted, reduced]);

  useEffect(() => {
    if (paused || hover || items.length < 2 || reduced) return;
    const id = setTimeout(() => goTo(i + 1), DUR);
    return () => clearTimeout(id);
  }, [i, paused, hover, items.length, goTo, reduced]);

  if (!items.length) return null;
  return (
    <section className={'tv' + (paused || hover ? ' paused' : '')} style={{ ['--dur' as any]: DUR / 1000 + 's' }} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div className="tv-track" ref={track} aria-roledescription="carousel" aria-label="Featured events">
        {items.map((ev, k) => (
          <div key={ev.id} data-k={k} className={'slide' + (k === i ? ' active' : '')} role="group" aria-roledescription="slide" aria-label={`${k + 1} of ${items.length}: ${ev.title}`} onClick={(e) => { if (k !== i && !(e.target as HTMLElement).closest('a,button')) goTo(k); }}>
            {ev.promo ? <video src={ev.promo} muted playsInline loop preload={k === 0 ? 'auto' : 'metadata'} aria-hidden="true" /> : <div className="still" style={{ background: ev.bg, backgroundSize: 'cover', backgroundPosition: 'center' }} />}
            {ev.promo && <div className="slide-tools"><button type="button" className="glassbtn" aria-label={muted ? 'Turn sound on' : 'Mute'} onClick={() => setMuted(!muted)}>{muted ? <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" /><path d="m17 9 5 6M22 9l-5 6" /></svg> : <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" /><path d="M17 8.5a5 5 0 0 1 0 7M19.5 6a8.5 8.5 0 0 1 0 12" /></svg>}</button></div>}
            <div className="slide-body">
              <div className="slide-kicker"><span>{ev.category || 'Featured'}</span>{ev.soldOut && <span className="live">Sold out</span>}</div>
              <h2>{ev.title}</h2>
              {ev.tagline && <p className="tl">{ev.tagline}</p>}
              <p className="meta3">{ev.when} · {ev.venue}</p>
              <div className="slide-actions"><Link className="btn white" href={`/e/${ev.slug}`}>{ev.soldOut ? 'View event' : `Get tickets · ${ev.price}`}</Link></div>
            </div>
          </div>
        ))}
      </div>
      {items.length > 1 && <>
        <button type="button" className="tv-nav prev" aria-label="Previous event" onClick={() => goTo(i - 1)}>{Ico.left}</button>
        <button type="button" className="tv-nav next" aria-label="Next event" onClick={() => goTo(i + 1)}>{Ico.right}</button>
        <div className="tv-dots">
          {items.map((ev, k) => <button key={ev.id + (k === i ? '-on' : '')} type="button" aria-label={`Show ${ev.title}`} aria-current={k === i} onClick={() => goTo(k)}><i /></button>)}
          <button type="button" className="tv-pause" aria-label={paused ? 'Play carousel' : 'Pause carousel'} onClick={() => setPaused(!paused)}>{paused ? <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5z" /></svg> : <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M6 4h4v16H6zM14 4h4v16h-4z" /></svg>}</button>
        </div>
      </>}
    </section>
  );
}
