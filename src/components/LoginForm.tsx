'use client';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function LoginForm({ next }: { next: string }) {
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr(''); setBusy(true);
    const email = String(new FormData(e.currentTarget).get('email') || '').trim();
    const { error } = await supabaseBrowser().auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` } });
    setBusy(false);
    if (error) setErr(error.status === 429 ? 'Too many sign-in emails. Wait a minute and try again.' : 'Could not send the link. Check the email and try again.'); else setSent(true);
  }
  return sent ? <p>Check your email for a sign-in link. You can close this tab.</p> : (
    <form className="stack" onSubmit={submit}>
      <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" required maxLength={254} autoComplete="email" /></div>
      {err && <p className="err" role="alert">{err}</p>}
      <button className="btn primary wide" disabled={busy}>{busy ? 'Sending…' : 'Email me a sign-in link'}</button>
      <p className="muted" style={{ fontSize: 13 }}>No password needed. Use the email you bought tickets with to see them.</p>
    </form>
  );
}
