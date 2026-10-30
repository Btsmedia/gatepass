-- Gatepass schema. Safe to run more than once. Applied automatically by the Supabase GitHub integration,
-- or by hand: SQL Editor > New query > paste > Run.
-- Money is stored in kobo (1 naira = 100 kobo) as integers.

create extension if not exists pgcrypto;

-- ---------- Profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- ---------- Organizers ----------
create table if not exists public.organizers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null,
  bank_name text,
  bank_code text,
  account_last4 text,
  account_name text,
  paystack_subaccount_code text,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- Events ----------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.organizers(id) on delete cascade,
  slug text not null unique,
  title text not null,
  tagline text,
  category text,
  description text,
  starts_at timestamptz not null,
  venue text not null,
  address text,
  city text,
  cover_url text,
  promo_url text,
  status text not null default 'draft' check (status in ('draft','published','cancelled')),
  featured boolean not null default false,
  activities jsonb not null default '[]',
  expect jsonb not null default '[]',
  guests jsonb not null default '[]',
  show_going boolean not null default true,
  past_title text,
  gallery jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists events_status_start on public.events (status, starts_at);

create table if not exists public.ticket_types (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  price_kobo integer not null default 0 check (price_kobo >= 0),
  quantity integer not null check (quantity >= 0),
  sold integer not null default 0 check (sold >= 0),
  max_per_order integer not null default 10,
  sort integer not null default 0,
  constraint sold_le_qty check (sold <= quantity)
);

create table if not exists public.event_staff (
  event_id uuid references public.events(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  primary key (event_id, user_id)
);

-- ---------- Orders & tickets ----------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id),
  user_id uuid references auth.users(id),
  buyer_name text not null,
  buyer_email text not null,
  buyer_phone text,
  subtotal_kobo integer not null,
  fee_kobo integer not null,
  total_kobo integer not null,
  status text not null default 'pending' check (status in ('pending','paid','failed','expired','refunded')),
  paystack_reference text unique,
  invite_id uuid,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  expires_at timestamptz not null default now() + interval '20 minutes'
);
create index if not exists orders_event on public.orders (event_id, status);

create table if not exists public.order_items (
  order_id uuid not null references public.orders(id) on delete cascade,
  ticket_type_id uuid not null references public.ticket_types(id),
  quantity integer not null check (quantity > 0),
  unit_price_kobo integer not null,
  primary key (order_id, ticket_type_id)
);

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  order_id uuid not null references public.orders(id) on delete cascade,
  event_id uuid not null references public.events(id),
  ticket_type_id uuid not null references public.ticket_types(id),
  holder_name text not null,
  status text not null default 'valid' check (status in ('valid','used','void')),
  checked_in_at timestamptz,
  checked_in_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists tickets_event on public.tickets (event_id);

-- ---------- Invites ----------
create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  ticket_type_id uuid not null references public.ticket_types(id),
  inviter_id uuid references auth.users(id),
  from_name text not null,
  contact text not null,
  contact_kind text not null check (contact_kind in ('email','phone')),
  guest_name text,
  note text,
  status text not null default 'pending' check (status in ('pending','accepted','declined','paid')),
  order_id uuid references public.orders(id),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

-- ---------- Inventory: reserve, fulfil, release ----------
-- Reserves seats atomically. Raises 'sold_out:<ticket name>' if any line can't be met.
create or replace function public.create_pending_order(
  p_event uuid, p_items jsonb, p_name text, p_email text, p_phone text,
  p_user uuid, p_fee_percent numeric, p_fee_flat_kobo integer, p_invite uuid default null
) returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  it jsonb; tt public.ticket_types; q int; sub int := 0; fee int := 0; o public.orders;
begin
  if not exists (select 1 from events where id = p_event and status = 'published' and starts_at > now() - interval '8 hours') then
    raise exception 'event_unavailable';
  end if;
  insert into orders (event_id, user_id, buyer_name, buyer_email, buyer_phone, subtotal_kobo, fee_kobo, total_kobo, invite_id)
  values (p_event, p_user, p_name, lower(p_email), p_phone, 0, 0, 0, p_invite) returning * into o;
  for it in select * from jsonb_array_elements(p_items) loop
    q := (it->>'quantity')::int;
    if q is null or q <= 0 then continue; end if;
    select * into tt from ticket_types where id = (it->>'ticket_type_id')::uuid and event_id = p_event for update;
    if not found then raise exception 'bad_ticket_type'; end if;
    if q > tt.max_per_order then raise exception 'too_many:%', tt.name; end if;
    if tt.sold + q > tt.quantity then raise exception 'sold_out:%', tt.name; end if;
    update ticket_types set sold = sold + q where id = tt.id;
    insert into order_items values (o.id, tt.id, q, tt.price_kobo);
    sub := sub + q * tt.price_kobo;
    if tt.price_kobo > 0 then fee := fee + q * (round(tt.price_kobo * p_fee_percent / 100) + p_fee_flat_kobo); end if;
  end loop;
  if sub = 0 and fee = 0 and not exists (select 1 from order_items where order_id = o.id) then raise exception 'empty_order'; end if;
  update orders set subtotal_kobo = sub, fee_kobo = fee, total_kobo = sub + fee where id = o.id returning * into o;
  return o;
end $$;

-- Marks an order paid and issues one ticket per seat. Safe to call twice.
create or replace function public.fulfil_order(p_order uuid, p_reference text) returns setof public.tickets
language plpgsql security definer set search_path = public as $$
declare o public.orders; oi record; i int; code text;
begin
  select * into o from orders where id = p_order for update;
  if not found then raise exception 'no_order'; end if;
  if o.status = 'paid' then return query select * from tickets where order_id = o.id; return; end if;
  if o.status not in ('pending','expired') then raise exception 'bad_status:%', o.status; end if;
  if o.status = 'expired' then
    -- payment arrived after release: re-reserve or fail
    for oi in select * from order_items where order_id = o.id loop
      update ticket_types set sold = sold + oi.quantity where id = oi.ticket_type_id and sold + oi.quantity <= quantity;
      if not found then raise exception 'sold_out_after_expiry'; end if;
    end loop;
  end if;
  update orders set status = 'paid', paid_at = now(), paystack_reference = coalesce(p_reference, paystack_reference) where id = o.id;
  for oi in select * from order_items where order_id = o.id loop
    for i in 1..oi.quantity loop
      code := 'GP' || upper(substr(translate(encode(gen_random_bytes(8), 'base64'), '+/=0O1Il', 'XYZABCDE'), 1, 8));
      insert into tickets (code, order_id, event_id, ticket_type_id, holder_name) values (code, o.id, o.event_id, oi.ticket_type_id, o.buyer_name);
    end loop;
  end loop;
  if o.invite_id is not null then update invites set status = 'paid', order_id = o.id, responded_at = now() where id = o.invite_id; end if;
  return query select * from tickets where order_id = o.id;
end $$;

-- Frees seats held by unpaid orders. Schedule with pg_cron (see docs/SETUP.md) or call from a cron route.
create or replace function public.release_expired_orders() returns integer
language plpgsql security definer set search_path = public as $$
declare o record; n int := 0;
begin
  for o in select id from orders where status = 'pending' and expires_at < now() for update skip locked loop
    update ticket_types t set sold = greatest(0, t.sold - oi.quantity) from order_items oi where oi.order_id = o.id and oi.ticket_type_id = t.id;
    update orders set status = 'expired' where id = o.id;
    n := n + 1;
  end loop;
  return n;
end $$;

-- Refund bookkeeping (money is returned by the Paystack refund API in the app).
create or replace function public.mark_refunded(p_order uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update orders set status = 'refunded' where id = p_order and status = 'paid';
  if not found then raise exception 'not_paid'; end if;
  update ticket_types t set sold = greatest(0, t.sold - oi.quantity) from order_items oi where oi.order_id = p_order and oi.ticket_type_id = t.id;
  update tickets set status = 'void' where order_id = p_order;
end $$;

-- Door check-in: atomic, one scan per ticket.
create or replace function public.check_in(p_code text, p_event uuid, p_user uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare t public.tickets; tn text;
begin
  select * into t from tickets where code = upper(p_code) for update;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select name into tn from ticket_types where id = t.ticket_type_id;
  if t.event_id <> p_event then return jsonb_build_object('ok', false, 'reason', 'wrong_event'); end if;
  if t.status = 'void' then return jsonb_build_object('ok', false, 'reason', 'refunded', 'holder', t.holder_name); end if;
  if t.status = 'used' then return jsonb_build_object('ok', false, 'reason', 'used', 'holder', t.holder_name, 'at', t.checked_in_at); end if;
  update tickets set status = 'used', checked_in_at = now(), checked_in_by = p_user where id = t.id;
  return jsonb_build_object('ok', true, 'holder', t.holder_name, 'type', tn);
end $$;

-- ---------- Row level security ----------
alter table public.profiles enable row level security;
alter table public.organizers enable row level security;
alter table public.events enable row level security;
alter table public.ticket_types enable row level security;
alter table public.event_staff enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.tickets enable row level security;
alter table public.invites enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for select using (id = auth.uid() or public.is_admin());
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
-- People can edit their name and phone, never their admin flag.
revoke update on public.profiles from authenticated, anon;
grant update (full_name, phone) on public.profiles to authenticated;

drop policy if exists "organizer read" on public.organizers;
create policy "organizer read" on public.organizers for select using (owner_id = auth.uid() or public.is_admin());
drop policy if exists "organizer insert" on public.organizers;
create policy "organizer insert" on public.organizers for insert with check (owner_id = auth.uid());
drop policy if exists "organizer update" on public.organizers;
create policy "organizer update" on public.organizers for update using (owner_id = auth.uid() or public.is_admin());

drop policy if exists "events public read" on public.events;
create policy "events public read" on public.events for select using (
  status = 'published' or public.is_admin()
  or exists (select 1 from public.organizers o where o.id = organizer_id and o.owner_id = auth.uid()));
drop policy if exists "events owner write" on public.events;
create policy "events owner write" on public.events for all using (
  public.is_admin() or exists (select 1 from public.organizers o where o.id = organizer_id and o.owner_id = auth.uid()))
  with check (public.is_admin() or exists (select 1 from public.organizers o where o.id = organizer_id and o.owner_id = auth.uid()));

drop policy if exists "ticket types read" on public.ticket_types;
create policy "ticket types read" on public.ticket_types for select using (
  exists (select 1 from public.events e where e.id = event_id));
drop policy if exists "ticket types owner write" on public.ticket_types;
create policy "ticket types owner write" on public.ticket_types for all using (
  exists (select 1 from public.events e join public.organizers o on o.id = e.organizer_id where e.id = event_id and (o.owner_id = auth.uid() or public.is_admin())));

drop policy if exists "staff read" on public.event_staff;
create policy "staff read" on public.event_staff for select using (user_id = auth.uid() or public.is_admin()
  or exists (select 1 from public.events e join public.organizers o on o.id = e.organizer_id where e.id = event_id and o.owner_id = auth.uid()));

-- Orders, tickets and invites are written only by the server (service role).
drop policy if exists "orders read" on public.orders;
create policy "orders read" on public.orders for select using (
  user_id = auth.uid() or public.is_admin()
  or exists (select 1 from public.events e join public.organizers o on o.id = e.organizer_id where e.id = event_id and o.owner_id = auth.uid()));
drop policy if exists "order items read" on public.order_items;
create policy "order items read" on public.order_items for select using (
  exists (select 1 from public.orders x where x.id = order_id));
drop policy if exists "tickets read" on public.tickets;
create policy "tickets read" on public.tickets for select using (
  public.is_admin()
  or exists (select 1 from public.orders x where x.id = order_id and x.user_id = auth.uid())
  or exists (select 1 from public.events e join public.organizers o on o.id = e.organizer_id where e.id = event_id and o.owner_id = auth.uid()));
drop policy if exists "invites read" on public.invites;
create policy "invites read" on public.invites for select using (inviter_id = auth.uid() or public.is_admin());

-- ---------- Storage bucket for covers, promo videos and galleries ----------
insert into storage.buckets (id, name, public) values ('media', 'media', true) on conflict (id) do nothing;
drop policy if exists "media public read" on storage.objects;
create policy "media public read" on storage.objects for select using (bucket_id = 'media');
drop policy if exists "media upload by signed-in users" on storage.objects;
create policy "media upload by signed-in users" on storage.objects for insert with check (bucket_id = 'media' and auth.role() = 'authenticated' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "media delete own" on storage.objects;
create policy "media delete own" on storage.objects for delete using (bucket_id = 'media' and owner = auth.uid());
