-- Security hardening. Safe to run more than once.

-- 1. Server-only functions.
-- Postgres lets everyone run new functions by default, and Supabase exposes them through the public API.
-- Without this, anyone holding the public (anon) key could mark their own unpaid order as paid, void other
-- people's tickets or check tickets in. Only the server (service role) may call these now.
revoke execute on function public.create_pending_order(uuid, jsonb, text, text, text, uuid, numeric, integer, uuid) from public, anon, authenticated;
revoke execute on function public.fulfil_order(uuid, text) from public, anon, authenticated;
revoke execute on function public.release_expired_orders() from public, anon, authenticated;
revoke execute on function public.mark_refunded(uuid) from public, anon, authenticated;
revoke execute on function public.check_in(text, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.create_pending_order(uuid, jsonb, text, text, text, uuid, numeric, integer, uuid) to service_role;
grant execute on function public.fulfil_order(uuid, text) to service_role;
grant execute on function public.release_expired_orders() to service_role;
grant execute on function public.mark_refunded(uuid) to service_role;
grant execute on function public.check_in(text, uuid, uuid) to service_role;
-- New functions in this schema are no longer callable by the public API unless granted on purpose.
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- 2. Rate limits (checkout, invites, check-in, bank changes). Server-only.
create table if not exists public.rate_hits (
  key text not null,
  at timestamptz not null default now()
);
create index if not exists rate_hits_key_at on public.rate_hits (key, at);
alter table public.rate_hits enable row level security; -- no policies: invisible to the public API
revoke all on public.rate_hits from anon, authenticated;

create or replace function public.hit_rate_limit(p_key text, p_max integer, p_window_seconds integer) returns boolean
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  perform pg_advisory_xact_lock(hashtext(p_key));
  delete from rate_hits where key = p_key and at < now() - make_interval(secs => p_window_seconds);
  select count(*) into n from rate_hits where key = p_key;
  if n >= p_max then return false; end if;
  insert into rate_hits (key) values (p_key);
  return true;
end $$;
revoke execute on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;

-- Old rate-limit rows are cleared daily.
create extension if not exists pg_cron;
select cron.schedule('clear-rate-hits', '17 3 * * *', $$delete from public.rate_hits where at < now() - interval '2 days'$$);

-- 3. Organizers can't verify themselves or set their own payout account through the public API.
-- (The app sets bank details on the server after Paystack confirms the account.)
revoke insert, update on public.organizers from anon, authenticated;
grant insert (owner_id, display_name) on public.organizers to authenticated;
grant update (display_name) on public.organizers to authenticated;

-- 4. Organizers can't feature their own events or move them to another organizer.
create or replace function public.events_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(auth.role(), '') in ('anon', 'authenticated') and not public.is_admin() then
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
drop trigger if exists events_guard on public.events;
create trigger events_guard before insert or update on public.events for each row execute function public.events_guard();

-- 5. Seat counts change only through checkout and refunds, never directly.
revoke insert, update on public.ticket_types from anon, authenticated;
grant insert (event_id, name, price_kobo, quantity, max_per_order, sort) on public.ticket_types to authenticated;
grant update (name, price_kobo, quantity, max_per_order, sort) on public.ticket_types to authenticated;
drop policy if exists "ticket types owner write" on public.ticket_types;
create policy "ticket types owner write" on public.ticket_types for all
  using (exists (select 1 from public.events e join public.organizers o on o.id = e.organizer_id where e.id = event_id and (o.owner_id = auth.uid() or public.is_admin())))
  with check (exists (select 1 from public.events e join public.organizers o on o.id = e.organizer_id where e.id = event_id and (o.owner_id = auth.uid() or public.is_admin())));

-- 6. Orders, tickets and invites are written only by the server.
revoke insert, update, delete on public.orders, public.order_items, public.tickets, public.invites, public.event_staff from anon, authenticated;
revoke insert, delete on public.profiles from anon, authenticated;

-- 7. Uploads: images and short videos only, 50 MB max, each person in their own folder.
update storage.buckets
  set file_size_limit = 52428800,
      allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm','video/quicktime']
  where id = 'media';
drop policy if exists "media delete own" on storage.objects;
create policy "media delete own" on storage.objects for delete
  using (bucket_id = 'media' and owner = auth.uid() and (storage.foldername(name))[1] = auth.uid()::text);
