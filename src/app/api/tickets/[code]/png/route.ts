import QRCode from 'qrcode';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Downloadable QR image for a ticket.
export async function GET(_: Request, { params }: { params: { code: string } }) {
  const code = params.code.toUpperCase();
  const { data } = await supabaseAdmin().from('tickets').select('code').eq('code', code).maybeSingle();
  if (!data) return new Response('Not found', { status: 404 });
  const png = await QRCode.toBuffer(code, { width: 800, margin: 3 });
  return new Response(png, { headers: { 'Content-Type': 'image/png', 'Content-Disposition': `attachment; filename="${code}.png"` } });
}
