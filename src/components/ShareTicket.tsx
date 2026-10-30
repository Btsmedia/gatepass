'use client';
export default function ShareTicket({ code, title, when, venue }: { code: string; title: string; when: string; venue: string }) {
  const url = typeof window !== 'undefined' ? window.location.href : '';
  const text = `Here’s a ticket for ${title} — ${when} at ${venue}. Ticket ${code}: ${url}`;
  async function share() {
    if (navigator.share) { try { await navigator.share({ title, text, url }); return; } catch { /* cancelled */ } }
    await navigator.clipboard?.writeText(text).catch(() => {});
    alert('Ticket link copied');
  }
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <a className="btn primary" href={`/api/tickets/${code}/png`} download={`${code}.png`}>Download ticket</a>
      <button className="btn ghost" onClick={share}>Share</button>
      <a className="btn ghost" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener">WhatsApp</a>
    </div>
  );
}
