import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Optional: frees seats held by abandoned checkouts. Supabase pg_cron does this already (docs/SETUP.md);
// call this from an external scheduler with header Authorization: Bearer CRON_SECRET.
// Closed unless CRON_SECRET is set to a long random value.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET || '';
  const got = req.headers.get('authorization') || '';
  const want = `Bearer ${secret}`;
  const ok = secret.length >= 16 && got.length === want.length && crypto.timingSafeEqual(Buffer.from(got), Buffer.from(want));
  if (!ok) return new NextResponse('Unauthorized', { status: 401 });
  const { data } = await supabaseAdmin().rpc('release_expired_orders');
  return NextResponse.json({ released: data });
}
