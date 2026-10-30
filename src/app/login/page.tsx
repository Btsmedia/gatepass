'use client';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function Login({ searchParams }: { searchParams: { next?: string } }) {
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr('');
    const email = String(new FormData(e.currentTarget).get('email') || '');
    const next = searchParams.next && searchParams.next.startsWith('/') ? searchParams.next : '/tickets';
    const { error } = await supabaseBrowser().auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` } });
    if (error) setErr(error.message); else setSent(true);
  }
  return (
    <div className="panel" style={{ maxWidth: 460, margin: '40px auto', display: 'grid', gap: 14 }}>
      <h1 style={{ fontSize: 30 }}>Sign in</h1>
      {sent ? <p>Check your email for a sign-in link. You can close this tab.</p> : (
        <form className="stack" onSubmit={submit}>
          <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" required autoComplete="email" /></div>
          {err && <p className="err">{err}</p>}
          <button className="btn primary wide">Email me a sign-in link</button>
          <p className="muted" style={{ fontSize: 13 }}>No password needed. Use the email you bought tickets with to see them.</p>
        </form>
      )}
    </div>
  );
}
