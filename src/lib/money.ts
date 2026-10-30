export const FEE_PERCENT = Number(process.env.FEE_PERCENT ?? 5);
export const FEE_FLAT_KOBO = Math.round(Number(process.env.FEE_FLAT_NAIRA ?? 100) * 100);

export const naira = (kobo: number) => '₦' + Math.round((kobo || 0) / 100).toLocaleString('en-NG');
export const priceLabel = (kobo: number) => (kobo > 0 ? naira(kobo) : 'Free');
export const feeFor = (priceKobo: number) => (priceKobo > 0 ? Math.round((priceKobo * FEE_PERCENT) / 100) + FEE_FLAT_KOBO : 0);

export const fmtDay = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos' });
export const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Africa/Lagos' });

export function slugify(s: string) {
  return s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}
