'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase/client';

type Mode = 'signin' | 'signup';

const GOOGLE_ON = process.env.NEXT_PUBLIC_GOOGLE_SIGNIN === 'on';

const Check = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m3.5 8.5 3 3 6-7" /></svg>;
const Logo = () => (
  <svg viewBox="0 0 30 22" aria-hidden="true">
    <mask id="au-notch"><rect width="30" height="22" rx="5" fill="#fff" /><circle cx="23" cy="0" r="4" fill="#000" /><circle cx="23" cy="22" r="4" fill="#000" /></mask>
    <rect width="30" height="22" rx="5" fill="#FFFFFF" mask="url(#au-notch)" />
  </svg>
);
const Google = () => (
  <svg viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

export default function LoginForm({ next, initialMode = 'signin', expired = false }: { next: string; initialMode?: Mode; expired?: boolean }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(expired ? 'That sign-in link has expired or was already used. Send a new one.' : '');
  const [wait, setWait] = useState(0);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!wait) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const callback = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const address = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(address)) { setErr('Enter a valid email address.'); emailRef.current?.focus(); return; }
    if (mode === 'signup' && !name.trim()) { setErr('Add your name so organizers know who’s coming.'); return; }
    setErr(''); setBusy(true);
    const { error } = await supabaseBrowser().auth.signInWithOtp({
      email: address,
      options: { emailRedirectTo: callback(), data: mode === 'signup' ? { full_name: name.trim().slice(0, 80) } : undefined },
    });
    setBusy(false);
    if (error) { setErr(error.status === 429 ? 'Too many sign-in emails. Wait a minute and try again.' : 'We couldn’t send the link. Check the email and try again.'); return; }
    setSent(true); setWait(60);
  }

  async function google() {
    setErr('');
    const { error } = await supabaseBrowser().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: callback() } });
    if (error) setErr('Google sign-in isn’t available right now. Use your email instead.');
  }

  const step = sent ? 2 : 1;
  const steps = ['Enter your email', 'Tap the link we send you', 'Your tickets, ready at the door'];

  return (
    <div className="au">
      <section className="au-panel" aria-label="How signing in works">
        <Link href="/" className="au-logo"><Logo />Gatepass</Link>
        <div>
          <span className="au-tag">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 1.5 9.6 6l4.9.2-3.9 3 1.4 4.7L8 11.2 4 13.9l1.4-4.7-3.9-3L6.4 6z" /></svg>
            No password needed
          </span>
          <h1>{mode === 'signup' ? 'Your next night out starts here' : 'Welcome back to the good nights'}</h1>
          <p className="au-sub">Sign in with a secure link we email you. Three quick steps and your tickets are in your pocket.</p>
        </div>
        <ol className="au-steps">
          {steps.map((label, i) => {
            const n = i + 1, state = n < step ? 'done' : n === step ? 'on' : '';
            return (
              <li key={label} className={state} aria-current={n === step ? 'step' : undefined}>
                <span className="n">{n < step ? <Check /> : n}</span>
                <span>{label}</span>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="au-form">
        {sent ? (
          <div className="au-sent" role="status">
            <span className="au-mail">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 7 8 6 8-6" /></svg>
            </span>
            <h2>Check your email</h2>
            <p>We sent a sign-in link to <b>{email.trim().toLowerCase()}</b>. Open it on this device and browser to continue.</p>
            <p style={{ fontSize: 13 }}>It can take a minute. Check spam or promotions if you don’t see it.</p>
            <button type="button" className="au-primary" disabled={busy || wait > 0} onClick={() => send()}>
              {busy ? 'Sending…' : wait > 0 ? `Resend link in ${wait}s` : 'Resend link'}
            </button>
            <p className="au-alt" style={{ marginTop: 6 }}>Wrong address? <button type="button" className="au-link" onClick={() => { setSent(false); setErr(''); setTimeout(() => emailRef.current?.focus(), 0); }}>Use a different email</button></p>
            {err && <p className="au-err" role="alert">{err}</p>}
          </div>
        ) : (
          <>
            <h2>{mode === 'signup' ? 'Create your account' : 'Sign in'}</h2>
            <p className="au-lede">{mode === 'signup' ? 'Buy tickets, invite friends and run events.' : 'See your tickets, invites and events.'}</p>
            <div className="au-switch" role="tablist" aria-label="Choose">
              <button type="button" role="tab" aria-selected={mode === 'signin'} onClick={() => { setMode('signin'); setErr(''); }}>Sign in</button>
              <button type="button" role="tab" aria-selected={mode === 'signup'} onClick={() => { setMode('signup'); setErr(''); }}>Create account</button>
            </div>
            <form onSubmit={send} noValidate>
              <div className="au-fields">
                {mode === 'signup' && (
                  <div className="au-field">
                    <label htmlFor="au-name">Full name</label>
                    <input id="au-name" name="name" autoComplete="name" maxLength={80} placeholder="Ada Okafor" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                )}
                <div className="au-field">
                  <label htmlFor="au-email">Email</label>
                  <input ref={emailRef} id="au-email" name="email" type="email" inputMode="email" autoComplete="email" maxLength={254} placeholder="you@example.com"
                    value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={err.startsWith('Enter a valid') || undefined} aria-describedby="au-email-hint" />
                  <p id="au-email-hint" className="au-hint">{mode === 'signup' ? 'We’ll send your tickets here.' : 'Use the email you bought tickets with.'}</p>
                </div>
              </div>
              {err && <p className="au-err" role="alert">{err}</p>}
              <button className="au-primary" disabled={busy}>{busy ? 'Sending link…' : 'Continue'}</button>
            </form>
            <p className="au-alt">
              {mode === 'signup'
                ? <>Already have an account? <button type="button" className="au-link" onClick={() => { setMode('signin'); setErr(''); }}>Sign in</button></>
                : <>New to Gatepass? <button type="button" className="au-link" onClick={() => { setMode('signup'); setErr(''); }}>Create an account</button></>}
            </p>
            {GOOGLE_ON && (
              <>
                <div className="au-or">Or</div>
                <button type="button" className="au-google" onClick={google}><Google />{mode === 'signup' ? 'Sign up with Google' : 'Continue with Google'}</button>
              </>
            )}
            <p className="au-fine">The link works once and expires after an hour. We never ask for a password.</p>
          </>
        )}
      </section>
    </div>
  );
}
