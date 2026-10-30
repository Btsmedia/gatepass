import { requireUser } from '@/lib/auth';
import EventForm from '@/components/EventForm';
import { saveEvent } from '../../actions';

export default async function NewEvent() {
  const user = await requireUser('/organizer/events/new');
  return <div style={{ display: 'grid', gap: 18, maxWidth: 820 }}><h1 style={{ fontSize: 40 }}>Create an event</h1><EventForm action={saveEvent} userId={user.id} /></div>;
}
