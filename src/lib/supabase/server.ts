import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Supabase client for server components, server actions and route handlers.
// Acts as the signed-in user, so row level security applies.
export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try { list.forEach(({ name, value, options }) => store.set(name, value, options)); } catch { /* called from a server component: middleware refreshes instead */ }
      },
    },
  });
}
