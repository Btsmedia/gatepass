import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { fmtDay, fmtTime, FEE_FLAT_KOBO, FEE_PERCENT } from '@/lib/money';
import BuyBox from '@/components/BuyBox';
import AboutTabs from '@/components/AboutTabs';
import InviteForm from '@/components/InviteForm';

export const dynamic = 'force-dynamic';

async function load(slug: string) {
  const { data } = await supabaseAdmin().from('events').select('*, ticket_types(*)').eq('slug', slug).eq('status', 'published').maybeSingle();
  return data;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const ev = await load(params.slug);
  return ev ? { title: `${ev.title} · Gatepass`, description: ev.tagline || undefined, openGraph: { images: ev.cover_url ? [ev.cover_url] : [] } } : {};
}

const shortName = (n: string) => { const p = n.trim().split(/\s+/); return p.length > 1 ? `${p[0]} ${p[p.length - 1][0]}.` : p[0]; };

export default async function EventPage({ params }: { params: { slug: string } }) {
  const ev = await load(params.slug);
  if (!ev) notFound();
  const types = [...(ev.ticket_types || [])].sort((a: any, b: any) => a.sort - b.sort);
  let going = null as null | { count: number; names: string[] };
  if (ev.show_going) {
    const { data: t } = await supabaseAdmin().from('tickets').select('holder_name').eq('event_id', ev.id).neq('status', 'void').limit(500);
    const names = Array.from(new Set((t || []).map((x: any) => shortName(x.holder_name)))).slice(0, 4);
    going = { count: t?.length || 0, names };
  }
  return (
    <article>
      <div className="banner" style={{ backgroundImage: ev.cover_url ? `url(${ev.cover_url})` : 'linear-gradient(160deg,#4C77AD,#BFB6F8)' }}>
        {ev.promo_url && <video src={ev.promo_url} muted autoPlay loop playsInline aria-hidden="true" />}
        <div><p className="eyebrow" style={{ color: 'rgba(255,255,255,.85)' }}>{fmtDay(ev.starts_at)}</p><h1>{ev.title}</h1>{ev.tagline && <p>{ev.tagline}</p>}</div>
      </div>
      <div className="layout">
        <div>
          <dl className="facts">
            <div><dt>When</dt><dd>{fmtDay(ev.starts_at)}<br /><span className="muted">Doors {fmtTime(ev.starts_at)}</span></dd></div>
            <div><dt>Where</dt><dd>{ev.venue}{ev.address && <><br /><span className="muted">{ev.address}{ev.city ? `, ${ev.city}` : ''}</span></>}</dd></div>
          </dl>
          {String(ev.description || '').split(/\n\s*\n/).filter(Boolean).map((p: string, i: number) => <p key={i} style={{ marginBottom: 12, maxWidth: '62ch' }}>{p}</p>)}
          <AboutTabs activities={ev.activities || []} expect={ev.expect || []} guests={ev.guests || []} going={going} doors={fmtTime(ev.starts_at)} />
          {(ev.gallery || []).length > 0 && <section style={{ marginTop: 32 }}>
            <h2 style={{ fontSize: 26 }}>{ev.past_title || 'From the last edition'}</h2>
            <div className="gal">{(ev.gallery as { url: string; kind: string }[]).slice(0, 5).map((m, i) => m.kind === 'video' ? <video key={i} src={m.url} muted playsInline controls preload="metadata" /> : <img key={i} src={m.url} alt="" loading="lazy" />)}</div>
          </section>}
        </div>
        <div style={{ display: 'grid', gap: 12 }}>
          <BuyBox eventId={ev.id} types={types} feePercent={FEE_PERCENT} feeFlatKobo={FEE_FLAT_KOBO} />
          <InviteForm eventId={ev.id} types={types.map((t: any) => ({ id: t.id, name: t.name }))} />
        </div>
      </div>
    </article>
  );
}
