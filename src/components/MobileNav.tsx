'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Outline icon when idle, filled icon when active (same idea as the reference tab bar).
const ic = {
  home: [
    <svg key="o" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M4 10.5 12 4l8 6.5V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" /><path d="M10 15v3M14 15v3" strokeLinecap="round" /></svg>,
    <svg key="f" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3.5 3.6 10.2A1.6 1.6 0 0 0 3 11.5V19a2.5 2.5 0 0 0 2.5 2.5h13A2.5 2.5 0 0 0 21 19v-7.5c0-.5-.2-1-.6-1.3z" /><path d="M10 14.5v3.5M14 14.5v3.5" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" /></svg>,
  ],
  discover: [
    <svg key="o" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.8-3.8" /></svg>,
    <svg key="f" viewBox="0 0 24 24" fill="currentColor"><circle cx="11" cy="11" r="7.8" /><path d="m20 20-3.8-3.8" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg>,
  ],
  tickets: [
    <svg key="o" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M3.5 7.5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2V10a2 2 0 0 0 0 4v2.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V14a2 2 0 0 0 0-4z" /><path d="M14.5 8v1.5M14.5 11.25v1.5M14.5 14.5V16" strokeLinecap="round" /></svg>,
    <svg key="f" viewBox="0 0 24 24" fill="currentColor"><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5V10a2 2 0 0 0 0 4v2.5a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5V14a2 2 0 0 0 0-4z" /><path d="M14.5 8v1.5M14.5 11.25v1.5M14.5 14.5V16" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" /></svg>,
  ],
  organizer: [
    <svg key="o" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>,
    <svg key="f" viewBox="0 0 24 24" fill="currentColor"><rect x="2.5" y="9" width="4" height="11" rx="1.5" /><rect x="8.5" y="3" width="4" height="17" rx="1.5" /><rect x="14.5" y="12" width="4" height="8" rx="1.5" /><rect x="1.5" y="19.5" width="21" height="2" rx="1" /></svg>,
  ],
  account: [
    <svg key="o" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="10" r="3" /><path d="M6.5 18.5c1.3-2 3.2-3 5.5-3s4.2 1 5.5 3" strokeLinecap="round" /></svg>,
    <svg key="f" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="9.8" /><circle cx="12" cy="10" r="3.2" fill="#FFFFFF" /><path d="M6.5 18.5c1.3-2 3.2-3 5.5-3s4.2 1 5.5 3" stroke="#FFFFFF" strokeWidth="1.9" strokeLinecap="round" fill="none" /></svg>,
  ],
};

export default function MobileNav({ signedIn }: { signedIn: boolean }) {
  const path = usePathname() || '/';
  const items: [string, string, keyof typeof ic, (p: string) => boolean][] = [
    ['/', 'Home', 'home', (p) => p === '/'],
    ['/events', 'Discover', 'discover', (p) => p.startsWith('/events') || p.startsWith('/e/') || p.startsWith('/invite')],
    ['/tickets', 'Tickets', 'tickets', (p) => p.startsWith('/tickets') || p.startsWith('/t/') || p.startsWith('/checkout')],
    ['/organizer', 'Organizer', 'organizer', (p) => p.startsWith('/organizer') || p.startsWith('/door')],
    [signedIn ? '/account' : '/login', signedIn ? 'Account' : 'Sign in', 'account', (p) => p.startsWith('/account') || p.startsWith('/login') || p.startsWith('/admin')],
  ];
  return (
    <nav className="tabbar" aria-label="Main">
      {items.map(([href, label, key, isOn]) => {
        const on = isOn(path);
        return (
          <Link key={href} href={href} className={on ? 'on' : ''} aria-current={on ? 'page' : undefined} aria-label={label}>
            <span className="ti" aria-hidden="true">{ic[key][on ? 1 : 0]}</span>
            <span className="tl">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
