'use client';
import { useRouter } from 'next/navigation';

export default function InviteActions({ id, mode }: { id: string; mode: 'respond' | 'reopen' }) {
  const router = useRouter();
  const set = async (status: string) => {
    await fetch('/api/invites', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
    router.push(`/invite/${id}${status === 'accepted' ? '?accept=1' : ''}`); router.refresh();
  };
  if (mode === 'reopen') return <button className="btn primary" onClick={() => set('accepted')}>Accept after all</button>;
  return <div style={{ display: 'flex', gap: 8 }}><button className="btn primary" onClick={() => set('accepted')}>Accept invite</button><button className="btn ghost" onClick={() => set('declined')}>Decline</button></div>;
}
