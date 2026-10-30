import { NextResponse } from 'next/server';
import { getUser, canManageEvent } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Sign in' }, { status: 401 });
  const { code, eventId } = await req.json();
  if (!(await canManageEvent(user.id, eventId))) return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  const { data, error } = await supabaseAdmin().rpc('check_in', { p_code: String(code || '').trim().toUpperCase(), p_event: eventId, p_user: user.id });
  if (error) return NextResponse.json({ error: 'Check-in failed' }, { status: 500 });
  return NextResponse.json(data);
}
