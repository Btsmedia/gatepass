// Small input-safety helpers shared by server and client code.

// Only same-site paths like "/tickets". Blocks "//evil.com", "/\evil.com" and full URLs (open redirects).
export function safeNext(next: string | null | undefined, fallback = '/tickets') {
  const n = String(next || '');
  return /^\/(?![/\\])[^\s]*$/.test(n) ? n : fallback;
}

export const isUuid = (v: unknown): v is string =>
  typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

// Trims, strips control characters and caps length.
export function clean(v: unknown, max: number) {
  return String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
}

// Media links must be https and free of characters that could break out of a CSS url() or an attribute.
export function safeMediaUrl(v: unknown): string | null {
  const s = String(v ?? '').trim();
  if (!s || s.length > 1000) return null;
  try {
    const u = new URL(s);
    if (u.protocol !== 'https:') return null;
    if (/["'()\\\s<>]/.test(s)) return null;
    return u.toString();
  } catch { return null; }
}

// CSS background value for a cover image, or the fallback when the link isn't safe.
export const cssUrl = (v: unknown, fallback: string) => {
  const u = safeMediaUrl(v);
  return u ? `url("${u}")` : fallback;
};

export const isEmail = (v: string) => v.length <= 254 && /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]{2,}$/.test(v);
