import type { Metadata } from 'next';
import Link from 'next/link';
import { Jost } from 'next/font/google';
import './globals.css';
import { getUser, isAdmin } from '@/lib/auth';

const jost = Jost({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'], variable: '--font-jost' });

export const metadata: Metadata = {
  title: 'Gatepass',
  description: 'Tickets for the best nights in Nigeria. Buy, share, invite and get in.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser().catch(() => null);
  const admin = user ? await isAdmin(user.id).catch(() => false) : false;
  return (
    <html lang="en" className={jost.variable}>
      <body>
        <header className="top">
          <div className="wrap">
            <Link href="/" className="brand"><i aria-hidden="true" />Gatepass</Link>
            <nav className="main" aria-label="Main">
              <Link href="/events">Discover</Link>
              <Link href="/tickets">My tickets</Link>
              <Link href="/organizer">Organizer</Link>
              {admin && <Link href="/admin">Admin</Link>}
            </nav>
            <span className="spacer" />
            {user ? <span className="muted">{user.email}</span> : <Link className="btn small primary" href="/login">Sign in</Link>}
          </div>
        </header>
        <main className="wrap">{children}</main>
        <footer className="site"><div className="wrap">© {new Date().getFullYear()} Gatepass · Tickets for the best nights in Nigeria</div></footer>
      </body>
    </html>
  );
}
