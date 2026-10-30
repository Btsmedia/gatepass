-- Tidy-up from the Supabase advisor. Safe to run more than once.

-- 1. Move the admin check off the public API (it was reachable at /rest/v1/rpc/is_admin).
-- Policies still use it; the "private" schema isn't exposed to the API.
create schema if not exists private;
grant usage on schema private to anon, authenticated;
create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = (select auth.uid())), false);
$$;
revoke execute on function private.is_admin() from public;
grant execute on function private.is_admin() to anon, authenticated, service_role;

-- 2. Policies rewritten: auth.uid() is read once per query (faster), and writes are separate
-- from reads so each read is checked by one policy.
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for select
  using (id = (select auth.uid()) or (select private.is_admin()));
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles for update
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "organizer read" on public.organizers;
create policy "organizer read" on public.organizers for select
  using (owner_id = (select auth.uid()) or (select private.is_admin()));
drop policy if exists "organizer insert" on public.organizers;
create policy "organizer insert" on public.organizers for insert
  with check (owner_id = (select auth.uid()));
drop policy if exists "organizer update" on public.organizers;
create policy "organizer update" on public.organizers for update
  using (owner_id = (select auth.uid()) or (select private.is_admin()));

drop policy if exists "events public read" on public.events;
create policy "events public read" on public.events for select using (
  status = 'published' or (select private.is_admin())
  or exists (select 1 from public.organizers o where o.id = organizer_id and o.owner_id = (select auth.uid())));
drop policy if exists "events owner write" on public.events;
drop policy if exists "events owner insert" on public.events;
drop policy if exists "events owner update" on public.events;
drop policy if exists "events owner delete" on public.events;
create policy "events owner insert" on public.events for insert with check (
  (select private.is_admin()) or exists (select 1 from public.organizers o where o.id = organizer_id and o.owner_id = (select auth.uid())));
create policy "events owner update" on public.events for update
  using ((select private.is_admin()) or exists (select 1 from public.organizers o where o.id = organizer_id and o.owner_id = (select auth.uid())))
  with check ((select private.is_admin()) or exists (select 1 from public.organizers o where o.id = organizer_id and o.owner_id = (select auth.uid())));
create policy "events owner delete" on public.events for delete using (
  (select private.is_admin()) or exists (select 1 from public.organizers o where o.id = organizer_id and o.owner_id = (select auth.uid())));

drop policy if exists "ticket types read" on public.ticket_types;
create policy "ticket types read" on public.ticket_types for select using (
  exists (select 1 from public.events e where e.id = event_id));
drop policy if exists "ticket types owner write" on public.ticket_types;
drop policy if exists "ticket types owner insert" on public.ticket_types;
drop policy if exists "ticket types owner update" on public.ticket_types;
drop policy if exists "ticket types owner delete" on public.ticket_types;
create policy "ticket types owner insert" on public.ticket_types for insert with check (
  exists (select 1 from public.events e join public.organizers o on o.id = e.organizer_id where e.id = event_id and (o.owner_id = (select auth.uid()) or (select private.is_admin()))));
create policy "ticket types owner update" on public.ticket_types for update
  using (exists (select 1 from public.events e join public.organizers o on o.id = e.organizer_id where e.id = event_id and (o.owner_id = (select auth.uid()) or (select private.is_admin()))))
  with check (exists (select 1 from public.events e join public.organizers o on o.id = e.organizer_id where e.id = event_id and (o.owner_id = (select auth.uid()) or (select private.is_admin()))));
create policy "ticket types owner delete" on public.ticket_types for delete using (
  exists (select 1 from public.events e join public.organizers o on o.id = e.organizer_id where e.id = event_id and (o.owner_id = (select auth.uid()) or (select private.is_admin()))));

drop policy if exists "staff read" on public.event_staff;
create policy "staff read" on public.event_staff for select using (
  user_id = (select auth.uid()) or (select private.is_admin())
  or exists (select 1 from public.events e join public.organizers o on o.id = e.organizer_id where e.id = event_id and o.owner_id = (select auth.uid())));

drop policy if exists "orders read" on public.orders;
create policy "orders read" on public.orders for select using (
  user_id = (select auth.uid()) or (select private.is_admin())
  or exists (select 1 from public.events e join public.organizers o on o.id = e.organizer_id where e.id = event_id and o.owner_id = (select auth.uid())));

drop policy if exists "tickets read" on public.tickets;
create policy "tickets read" on public.tickets for select using (
  (select private.is_admin())
  or exists (select 1 from public.orders x where x.id = order_id and x.user_id = (select auth.uid()))
  or exists (select 1 from public.events e join public.organizers o on o.id = e.organizer_id where e.id = event_id and o.owner_id = (select auth.uid())));

drop policy if exists "invites read" on public.invites;
create policy "invites read" on public.invites for select
  using (inviter_id = (select auth.uid()) or (select private.is_admin()));

-- The event guard trigger now uses the private check too, then the old public function goes.
create or replace function public.events_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce((select auth.role()), '') in ('anon', 'authenticated') and not private.is_admin() then
    if tg_op = 'INSERT' then
      new.featured := false;
    else
      new.featured := old.featured;
      new.organizer_id := old.organizer_id;
      new.slug := old.slug;
    end if;
  end if;
  return new;
end $$;
revoke execute on function public.events_guard() from public, anon, authenticated;
drop function if exists public.is_admin();

-- 3. Rate-limit rows get a primary key.
alter table public.rate_hits add column if not exists id bigint generated always as identity;
do $$ begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.rate_hits'::regclass and contype = 'p') then
    alter table public.rate_hits add primary key (id);
  end if;
end $$;

-- 4. Indexes for the lookups the app and the policies make.
create index if not exists events_organizer on public.events (organizer_id);
create index if not exists ticket_types_event on public.ticket_types (event_id);
create index if not exists orders_user on public.orders (user_id);
create index if not exists orders_email on public.orders (buyer_email);
create index if not exists order_items_type on public.order_items (ticket_type_id);
create index if not exists tickets_order on public.tickets (order_id);
create index if not exists tickets_type on public.tickets (ticket_type_id);
create index if not exists invites_event on public.invites (event_id);
create index if not exists invites_inviter on public.invites (inviter_id);
create index if not exists invites_order on public.invites (order_id);
create index if not exists invites_type on public.invites (ticket_type_id);
create index if not exists event_staff_user on public.event_staff (user_id);
