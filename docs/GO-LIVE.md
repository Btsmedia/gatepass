# Go-live checklist

Work through this before taking real money. Items marked **Blocker** must be done. This is a practical checklist, not legal advice; confirm legal points with a Nigerian lawyer or accountant.

## 1. Business and payments
- [ ] **Blocker:** Activate your Paystack account for live payments: Paystack Dashboard → **Activate Business**. Provide business details, director ID and BVN, and a settlement bank account. Registered businesses also upload CAC documents (certificate, status report). Paystack reviews before enabling live mode.
- [ ] **Blocker:** Swap test keys for live keys in Vercel: `PAYSTACK_SECRET_KEY=sk_live_…`, `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_…` → Redeploy.
- [ ] **Blocker:** Set the **Live Webhook URL** in Paystack to `https://YOUR-DOMAIN/api/paystack/webhook`.
- [ ] Organizers re-enter bank details after the switch (test subaccounts don't exist in live mode).
- [ ] Decide your fee (`FEE_PERCENT`, `FEE_FLAT_NAIRA`) and check it covers Paystack's fee on your typical ticket price.
- [ ] Do one real ₦100 test purchase end to end, then refund it from Admin.
- [ ] Register the business for tax with FIRS and get advice on VAT for booking fees.

## 2. Domain and email
- [ ] Buy a domain (e.g. gatepass.ng via a .ng registrar, or .com). Add it in **Vercel → Settings → Domains** and follow the DNS instructions.
- [ ] Update `NEXT_PUBLIC_SITE_URL`, Supabase **Site URL** and **Redirect URLs**, and the Paystack webhook to the new domain.
- [ ] **Blocker:** Verify your domain in **Resend → Domains** (add the DNS records it shows), then set `EMAIL_FROM="Gatepass <tickets@yourdomain>"`. Until then, ticket emails only reach you.
- [ ] Supabase → Authentication → **SMTP Settings**: use Resend SMTP so sign-in emails come from your domain and aren't rate-limited.
- [ ] Set up a support inbox (e.g. help@yourdomain) and show it in the footer.

## 3. Legal pages
- [ ] **Blocker:** Terms of service (buyer and organizer), covering booking fees, who is responsible for the event, cancellations and refunds.
- [ ] **Blocker:** Refund policy (e.g. full refund if an event is cancelled; organizer's policy otherwise).
- [ ] **Blocker:** Privacy policy that meets the Nigeria Data Protection Act 2023: what you collect (names, emails, phones), why, who you share it with (Paystack, Resend, organizers), how long you keep it, and how people request deletion. Check whether you must register with the Nigeria Data Protection Commission as your user numbers grow.
- [ ] Organizer agreement: organizers confirm they have the right to sell the event and own the media they upload.

## 4. Security
- [ ] **Blocker:** Keep `SUPABASE_SERVICE_ROLE_KEY` and `PAYSTACK_SECRET_KEY` only in Vercel environment variables. Never in code, screenshots or chat.
- [ ] Turn on two-factor login for GitHub, Vercel, Supabase, Paystack and Resend.
- [ ] Supabase → Authentication → set **Rate limits** and enable **CAPTCHA** (hCaptcha/Turnstile) for sign-in if you see abuse.
- [ ] Only you (and trusted staff) have `is_admin = true`.
- [ ] Check the security migration ran: Supabase → SQL Editor → `select has_function_privilege('anon', 'public.fulfil_order(uuid, text)', 'execute');` must return **false**.
- [ ] Supabase → Authentication → URL Configuration: Site URL = your live address; Redirect URLs contains only your own `…/auth/callback` addresses.
- [ ] Supabase → Authentication → set **Email OTP expiry** to 1 hour or less.
- [ ] Optional: Vercel → Firewall → add a rate-limit rule on `/api/checkout` and `/api/invites` (the app already limits these in the database; this stops floods earlier).
- [ ] Keep dependencies patched: run `npm audit` monthly and upgrade Next.js when a security release comes out.
- [ ] Supabase **Point-in-time recovery** or daily backups (Pro plan). On the free plan, export a backup weekly (Database → Backups).

## 5. Reliability
- [ ] Upgrade Supabase to **Pro** before launch: free projects pause after a week of inactivity.
- [ ] Confirm the `release-expired-orders` cron job is running: Supabase → SQL Editor → `select * from cron.job_run_details order by start_time desc limit 5;`
- [ ] Add error tracking (e.g. Sentry's Vercel integration) and an uptime monitor (e.g. Better Stack) on your homepage and `/api/paystack/webhook`.
- [ ] Watch Paystack → **Transactions** for payments that succeeded but show **pending** in Admin. The webhook fixes these automatically; if not, check Vercel logs.

## 6. Door day
- [ ] Door staff use Chrome on Android for camera scanning (`BarcodeDetector`); iPhones type the code. For high-volume doors, add a scanning library such as `zxing` (small change in `src/components/DoorScanner.tsx`).
- [ ] Have the guest list open on a second device as a backup (Organizer → event → Guest list).
- [ ] Test check-in on the venue's mobile network beforehand.

## 7. Before you announce
- [ ] Replace the sample events: create real events with real covers and promo videos.
- [ ] Add real testimonials only with permission.
- [ ] Share links: event pages have preview images for WhatsApp and Instagram (from the cover image).

## Not built yet (next phases)
- SMS invites (Termii or Africa's Talking) — phone invites currently open WhatsApp from the inviter's phone.
- Discount codes, early-bird switching by date, seat maps.
- Map view with real maps (Mapbox or Google Maps).
- Apple/Google Wallet passes.
- Migrating data from the hosted prototype (the prototype's sample data isn't copied over).
