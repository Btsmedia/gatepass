import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser, isAdmin } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function signOut() {
  'use server';
  await supabaseServer().auth.signOut();
  redirect('/');
}

export default async function Account() {
  const user = await requireUser('/account');
  const admin = await isAdmin(user.id);
  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 560 }}>
      <p className="eyebrow">Account</p>
      <h1 style={{ fontSize: 36 }}>{user.email}</h1>
      <div className="panel" style={{ display: 'grid', gap: 4, padding: 8 }}>
        <Link className="btn ghost" style={{ justifyContent: 'space-between' }} href="/tickets">My tickets <span aria-hidden="true">›</span></Link>
        <Link className="btn ghost" style={{ justifyContent: 'space-between' }} href="/organizer">Organizer dashboard <span aria-hidden="true">›</span></Link>
        <Link className="btn ghost" style={{ justifyContent: 'space-between' }} href="/organizer/payouts">Payouts <span aria-hidden="true">›</span></Link>
        {admin && <Link className="btn ghost" style={{ justifyContent: 'space-between' }} href="/admin">Admin <span aria-hidden="true">›</span></Link>}
      </div>
      <form action={signOut}><button className="btn">Sign out</button></form>
    </div>
  );
}
