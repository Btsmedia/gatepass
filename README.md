# Gatepass

Event ticketing for Nigeria: discover events, buy tickets in naira (card, transfer, USSD via Paystack), get QR tickets by email, invite friends who pay when they accept, and check guests in at the door. Organizers get a dashboard and automatic payouts to their bank. Admins moderate events, feature them, and refund orders.

**Stack:** Next.js 14 (App Router) · Supabase (Postgres, Auth, Storage) · Paystack (payments, split payouts, refunds) · Resend (email) · Vercel (hosting).

## Start here
1. **[docs/SETUP.md](docs/SETUP.md)** — step by step, from zero to a running site in test mode (about an hour, no coding experience needed).
2. **[docs/GO-LIVE.md](docs/GO-LIVE.md)** — everything to finish before taking real money.

## What's in the box
| Area | Where |
| --- | --- |
| Landing, Discover with filters | `src/app/page.tsx`, `src/app/events` |
| Event page with Activities / What to expect / Guest list tabs, gallery, ticket picker | `src/app/e/[slug]`, `src/components/AboutTabs.tsx`, `src/components/BuyBox.tsx` |
| Checkout → Paystack → tickets | `src/app/api/checkout`, `src/app/checkout/verify`, `src/app/api/paystack/webhook`, `src/lib/fulfil.ts` |
| Tickets (QR, download, share) | `src/app/t/[code]`, `src/app/api/tickets/[code]/png`, `src/app/tickets` |
| Invites (pay on accept) | `src/app/api/invites`, `src/app/invite/[id]`, `src/components/InviteForm.tsx` |
| Organizer dashboard, event editor, payouts | `src/app/organizer` |
| Door check-in (camera or code) | `src/app/door/[eventId]`, `src/app/api/checkin` |
| Admin | `src/app/admin` |
| Database, security rules, inventory functions | `supabase/migrations/0001_init.sql` |

## How money moves
Buyer pays ticket price + booking fee (default 5% + ₦100 per paid ticket, set in `.env`). Paystack splits each payment: the organizer's subaccount receives the ticket price, Gatepass keeps the booking fee and pays Paystack's processing fee from it.

## How inventory stays correct
Seats are reserved inside Postgres with row locks when checkout starts (`create_pending_order`), so two buyers can't take the last ticket. Unpaid holds expire after 20 minutes and are released (`release_expired_orders`). Tickets are only issued after Paystack confirms payment, from either the redirect or the webhook, and issuing is idempotent (`fulfil_order`).

## Commands
```bash
npm install      # once
npm run dev      # local site at http://localhost:3000
npm run build    # production build check
```
