import { NextResponse } from 'next/server';
import { getUser, canManageEvent } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { isUuid } from '@/lib/safe';
import { allow } from '@/lib/ratelimit';

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Sign in' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const eventId = body?.eventId, code = String(body?.code || '').trim().toUpperCase();
  if (!isUuid(eventId) || !/^GP[A-Z0-9]{8}$/.test(code)) return NextResponse.json({ ok: false, reason: 'not_found' });
  if (!(await canManageEvent(user.id, eventId))) return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  // A busy door scans maybe one ticket a second; this blocks code guessing.
  if (!(await allow(`checkin:${user.id}`, 600, 600))) return NextResponse.json({ error: 'Too many scans. Wait a minute.' }, { status: 429 });
  const { data, error } = await supabaseAdmin().rpc('check_in', { p_code: code, p_event: eventId, p_user: user.id });
  if (error) return NextResponse.json({ error: 'Check-in failed' }, { status: 500 });
  return NextResponse.json(data);
}
