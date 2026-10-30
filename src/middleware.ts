import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// The one address people should use. Vercel also serves the site at other *.vercel.app names;
// sign-in links only work on the address Supabase knows, so production traffic is sent here.
const canonical = (() => {
  try { return process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL) : null; } catch { return null; }
})();

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;

  if (process.env.VERCEL_ENV === 'production' && canonical && req.headers.get('host') !== canonical.host) {
    const to = new URL(url.pathname + url.search, canonical.origin);
    return NextResponse.redirect(to, 308);
  }

  // If Supabase falls back to the home page with a sign-in code, finish signing in.
  if (url.pathname === '/' && url.searchParams.has('code')) {
    const to = new URL('/auth/callback', url.origin);
    to.searchParams.set('code', url.searchParams.get('code')!);
    return NextResponse.redirect(to);
  }

  // Keeps the Supabase session cookie fresh on every request.
  let res = NextResponse.next({ request: req });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  await supabase.auth.getUser();
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/paystack/webhook).*)'],
};
