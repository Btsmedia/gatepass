'use client';
import type React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const I = {
  home: <svg className="ico" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3.2 2.8 10.6a1 1 0 0 0 .6 1.8H5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-7.6h1.6a1 1 0 0 0 .6-1.8z" /></svg>,
  cal: <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>,
  ticket: <svg className="ico" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a3 3 0 0 0 0 6v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a3 3 0 0 0 0-6zm11 1v2h2V7zm0 4v2h2v-2zm0 4v2h2v-2z" /></svg>,
  org: <svg className="ico" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="8" r="3.6" /><path d="M2 19.2C2 15.8 5.1 13.5 9 13.5s7 2.3 7 5.7V20H2z" /><circle cx="17.3" cy="9" r="2.8" /><path d="M17.8 13.6c2.6.3 4.2 2.1 4.2 4.6V20h-4.4v-.8c0-2.2-.9-4.2-2.6-5.4.9-.2 1.8-.3 2.8-.2z" /></svg>,
  admin: <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" aria-hidden="true"><path d="M12 3 4 6v6c0 4.6 3.4 8.2 8 9 4.6-.8 8-4.4 8-9V6z" /><path d="m9 12 2 2 4-4" /></svg>,
};

export default function NavLinks({ admin }: { admin: boolean }) {
  const path = usePathname() || '/';
  const links: [string, string, React.ReactElement][] = [['/', 'Home', I.home], ['/events', 'Discover', I.cal], ['/tickets', 'My tickets', I.ticket], ['/organizer', 'Organizer', I.org]];
  if (admin) links.push(['/admin', 'Admin', I.admin]);
  const on = (href: string) => (href === '/' ? path === '/' : path.startsWith(href) || (href === '/events' && path.startsWith('/e/')));
  return (
    <nav className="main" aria-label="Main">
      {links.map(([href, label, icon]) => <Link key={href} href={href} aria-label={label} aria-current={on(href) ? 'page' : undefined}>{icon}<span>{label}</span></Link>)}
    </nav>
  );
}
