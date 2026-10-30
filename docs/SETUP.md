# Setup guide (test mode)

This gets Gatepass running with **test payments** (no real money). Do the steps in order. Each one says exactly where to click. Allow about an hour.

You need: a computer with internet, and accounts on **GitHub**, **Supabase** and **Vercel** (you have these), plus **Paystack** and **Resend** (free to create).

---

## 1. Put the code on GitHub
1. Go to github.com → **New repository** → name it `gatepass` → **Private** → **Create repository**.
2. On the new repo page, click **uploading an existing file**.
3. Unzip `gatepass.zip` on your computer. Drag **everything inside** the `gatepass` folder (not the folder itself) into the browser window. Do **not** upload `node_modules` or `.env` if you have them.
4. Click **Commit changes**.

> Prefer the terminal? `git init && git add . && git commit -m "Gatepass" && git branch -M main && git remote add origin https://github.com/YOU/gatepass.git && git push -u origin main`

## 2. Create the database (Supabase)
1. supabase.com → **New project**. Name: `gatepass`. Region: the closest to Nigeria available (e.g. **West EU (London)** or **Central EU (Frankfurt)**). Save the database password somewhere safe.
2. Wait for it to finish setting up (1–2 minutes).
3. Left menu → **SQL Editor** → **New query**. Open `supabase/migrations/0001_init.sql` from the zip, copy everything, paste, click **Run**. You should see "Success. No rows returned".
4. Left menu → **Project Settings** → **API**. Keep this tab open. You'll copy three values later:
   - **Project URL**
   - **anon public** key
   - **service_role** key (secret — never share it or put it in front-end code)
5. Left menu → **Authentication** → **URL Configuration**:
   - **Site URL**: leave for now, you'll set it in step 6.
6. Turn on releasing abandoned checkouts automatically: **Database** → **Extensions** → search `pg_cron` → enable. Then **SQL Editor** → new query → run:
   ```sql
   select cron.schedule('release-expired-orders', '*/5 * * * *', $$select public.release_expired_orders()$$);
   ```

## 3. Get Paystack test keys
1. paystack.com → sign up (choose Nigeria). You can use test mode straight away.
2. **Settings** → **API Keys & Webhooks**. Make sure the toggle says **Test Mode**.
3. Copy the **Test Secret Key** (`sk_test_…`) and **Test Public Key** (`pk_test_…`).

## 4. Get a Resend key (ticket emails)
1. resend.com → sign up → **API Keys** → **Create API Key** → copy it (`re_…`).
2. For testing, use the sender `Gatepass <onboarding@resend.dev>`. It only delivers to your own email until you verify a domain (see GO-LIVE).

## 5. Deploy on Vercel
1. vercel.com → **Add New…** → **Project** → import your `gatepass` GitHub repo.
2. Before clicking Deploy, open **Environment Variables** and add each of these (names must match exactly):

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key |
| `PAYSTACK_SECRET_KEY` | `sk_test_…` |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | `pk_test_…` |
| `RESEND_API_KEY` | `re_…` |
| `EMAIL_FROM` | `Gatepass <onboarding@resend.dev>` |
| `NEXT_PUBLIC_SITE_URL` | leave empty for now |
| `FEE_PERCENT` | `5` |
| `FEE_FLAT_NAIRA` | `100` |
| `CRON_SECRET` | any long random text |

3. Click **Deploy**. Wait for "Congratulations". Copy your site address, e.g. `https://gatepass-abc.vercel.app`.
4. In Vercel → your project → **Settings** → **Environment Variables** → set `NEXT_PUBLIC_SITE_URL` to that address → **Save** → **Deployments** → ⋯ on the latest → **Redeploy**.

## 6. Connect the pieces
1. **Supabase** → Authentication → URL Configuration:
   - **Site URL**: your Vercel address.
   - **Redirect URLs**: add `https://YOUR-SITE.vercel.app/auth/callback`.
2. **Paystack** → Settings → API Keys & Webhooks → **Test Webhook URL**: `https://YOUR-SITE.vercel.app/api/paystack/webhook` → **Save**.

## 7. Make yourself the admin
1. Open your site → **Sign in** → enter your email → click the link in your inbox.
2. Supabase → SQL Editor → run (with your email):
   ```sql
   update public.profiles set is_admin = true
   where id = (select id from auth.users where email = 'you@example.com');
   ```
3. Refresh the site. An **Admin** link appears in the menu.

## 8. Test the whole flow
1. **Organizer** → **Create event** → fill it in, add a ticket type with a price → **Save and publish**.
2. **Organizer** → **Payouts** → choose a bank and enter an account number. In test mode Paystack only accepts its test account: bank **Zenith Bank**, account `0000000000`.
3. Open the event page → choose a ticket → enter your details → **Pay**. On the Paystack page choose **Card** and use test card `4084 0840 8408 4081`, expiry any future date, CVV `408`, PIN `0000`, OTP `123456`.
4. You land on the confirmation page with your tickets, and get an email with QR codes.
5. **Organizer** → your event → **Door check-in** → type the ticket code → green **Admit**. Try it again → red **Already checked in**.
6. **Admin** → **Orders** → **Refund** → the ticket now shows **Refunded** and won't scan.

If something fails, check **Vercel → your project → Logs** and **Paystack → Transactions**.

## Running it on your computer (optional)
1. Install Node.js 20 LTS from nodejs.org.
2. In the unzipped `gatepass` folder, copy `.env.example` to a new file named `.env.local` and fill in the same values (`NEXT_PUBLIC_SITE_URL=http://localhost:3000`).
3. Open a terminal in that folder and run `npm install`, then `npm run dev`. Visit http://localhost:3000.
