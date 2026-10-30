import { cssUrl } from './safe';

// Gradient posters used when an event has no cover image (same set as the prototype).
export const POSTERS = [
  'radial-gradient(120% 90% at 12% 10%, #2DD4A3 0%, transparent 55%), radial-gradient(90% 80% at 90% 90%, #1565C0 0%, transparent 60%), #0B2A3A',
  'radial-gradient(100% 80% at 80% 15%, #FFB347 0%, transparent 55%), radial-gradient(90% 90% at 10% 95%, #D7263D 0%, transparent 60%), #3B0A1E',
  'radial-gradient(55% 55% at 72% 35%, #FFE066 0 32%, transparent 33%), linear-gradient(160deg, #FF7A1A, #C2185B)',
  'repeating-linear-gradient(135deg, #0D7A55 0 18px, #0A5E42 18px 36px)',
  'radial-gradient(2px 2px at 20% 30%, #FFFFFF 50%, transparent 51%), radial-gradient(1.5px 1.5px at 70% 20%, #FFFFFF 50%, transparent 51%), radial-gradient(2px 2px at 85% 62%, #FFFFFF 50%, transparent 51%), linear-gradient(180deg, #120E2E, #4A2380)',
  'repeating-radial-gradient(circle at 30% 40%, #1E3A8A 0 10px, #3557C4 10px 14px, #1E3A8A 14px 26px)',
];
export const bg = (ev: { cover_url?: string | null } | undefined, i: number) =>
  cssUrl(ev?.cover_url, POSTERS[i % POSTERS.length]);
