import { notFound, redirect } from 'next/navigation';
import { requireUser, canManageEvent } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import DoorScanner from '@/components/DoorScanner';

export const dynamic = 'force-dynamic';

export default async function Door(props: { params: Promise<{ eventId: string }> }) {
  const params = await props.params;
  const user = await requireUser(`/door/${params.eventId}`);
  if (!(await canManageEvent(user.id, params.eventId))) redirect('/');
  const { data: ev } = await supabaseAdmin().from('events').select('id, title').eq('id', params.eventId).maybeSingle();
  if (!ev) notFound();
  return <div style={{ display: 'grid', gap: 16, maxWidth: 640 }}><p className="eyebrow">Door check-in</p><h1 style={{ fontSize: 34 }}>{ev.title}</h1><DoorScanner eventId={ev.id} /></div>;
}
