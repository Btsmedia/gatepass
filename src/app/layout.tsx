import type { Metadata } from 'next';
import Link from 'next/link';
import { Poppins } from 'next/font/google';
import './globals.css';
import { getUser, isAdmin } from '@/lib/auth';
import NavLinks from '@/components/NavLinks';
import MobileNav from '@/components/MobileNav';

const poppins = Poppins({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'], variable: '--font-poppins' });

export const metadata: Metadata = {
  title: 'Gatepass',
  description: 'Tickets for the best nights in Nigeria. Buy, share, invite and get in.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser().catch(() => null);
  const admin = user ? await isAdmin(user.id).catch(() => false) : false;
  return (
    <html lang="en" className={poppins.variable}>
      <body>
        <header className="top">
          <div className="wrap">
            <Link href="/" className="brand"><i aria-hidden="true" />Gatepass</Link>
            <NavLinks admin={admin} />
            <span className="spacer" />
            {user ? <Link href="/account" className="me" title={user.email || ''} aria-label="Account"><i aria-hidden="true">{(user.email || '?')[0].toUpperCase()}</i></Link> : <Link className="btn small primary" href="/login">Sign in</Link>}
          </div>
        </header>
        <main className="wrap">{children}</main>
        <MobileNav signedIn={!!user} />
        <footer className="site"><div className="wrap">
          <div className="footcols">
            <div className="fb"><Link href="/" className="brand"><i aria-hidden="true" />Gatepass</Link><p>Tickets for the best nights in Nigeria. Buy, share, invite and get in.</p></div>
            <div><h4>Explore</h4><ul><li><Link href="/events">Discover</Link></li><li><Link href="/events?when=weekend">This weekend</Link></li><li><Link href="/events?when=week">Next 7 days</Link></li></ul></div>
            <div><h4>Your account</h4><ul><li><Link href="/tickets">My tickets</Link></li><li><Link href="/login">Sign in</Link></li></ul></div>
            <div><h4>Organizers</h4><ul><li><Link href="/organizer/events/new">Create an event</Link></li><li><Link href="/organizer">Dashboard</Link></li><li><Link href="/organizer/payouts">Payouts</Link></li></ul></div>
          </div>
          <div className="copy"><span>© {new Date().getFullYear()} Gatepass</span><span>Made in Lagos</span></div>
        </div></footer>
      </body>
    </html>
  );
}
