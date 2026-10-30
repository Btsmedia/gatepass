import 'server-only';
import { supabaseAdmin } from './supabase/admin';

export type EventRow = any;

export async function listUpcoming(filters: { q?: string; city?: string; category?: string; from?: string; to?: string } = {}) {
  let q = supabaseAdmin().from('events')
    .select('id, slug, title, tagline, category, starts_at, venue, city, cover_url, promo_url, featured, ticket_types(name, price_kobo, quantity, sold)')
    .eq('status', 'published')
    .gte('starts_at', filters.from || new Date(Date.now() - 8 * 3600e3).toISOString())
    .order('starts_at', { ascending: true })
    .limit(200);
  if (filters.to) q = q.lt('starts_at', filters.to);
  if (filters.city) q = q.ilike('city', filters.city);
  if (filters.category) q = q.eq('category', filters.category);
  if (filters.q) q = q.or(`title.ilike.%${filters.q.replace(/[%,()]/g, '')}%,venue.ilike.%${filters.q.replace(/[%,()]/g, '')}%,city.ilike.%${filters.q.replace(/[%,()]/g, '')}%`);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export const fromPrice = (types: { price_kobo: number }[] = []) => {
  const min = types.length ? Math.min(...types.map((t) => t.price_kobo)) : 0;
  return min;
};
export const soldOut = (types: { quantity: number; sold: number }[] = []) => types.length > 0 && types.every((t) => t.sold >= t.quantity);
