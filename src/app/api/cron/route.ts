import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Optional: frees seats held by abandoned checkouts. Supabase pg_cron does this already (docs/SETUP.md);
// call this from any external scheduler with header Authorization: Bearer CRON_SECRET.
export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return new NextResponse('Unauthorized', { status: 401 });
  const { data } = await supabaseAdmin().rpc('release_expired_orders');
  return NextResponse.json({ released: data });
}
