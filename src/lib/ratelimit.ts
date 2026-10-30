import 'server-only';
import { headers } from 'next/headers';
import { supabaseAdmin } from './supabase/admin';

// The visitor's IP as Vercel reports it.
export async function clientIp(req?: Request) {
  const h = req ? req.headers : await headers();
  return (h.get('x-real-ip') || h.get('x-forwarded-for')?.split(',')[0] || 'unknown').trim();
}

// True when the caller is still under the limit. Counts are kept in Postgres so they hold across serverless instances.
// If the limiter itself fails, the request is allowed (the other checks still apply).
export async function allow(key: string, max: number, windowSeconds: number) {
  const { data, error } = await supabaseAdmin().rpc('hit_rate_limit', { p_key: key, p_max: max, p_window_seconds: windowSeconds });
  if (error) { console.error('rate limit check failed', error.message); return true; }
  return data === true;
}
