-- KAORU WEB PUSH - PASO 21
-- Tablas privadas para suscripciones, preferencias y deduplicacion.
-- Este archivo NO contiene claves VAPID ni secretos.

begin;

create table if not exists public.kaoru_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  device_id text,
  user_agent text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists kaoru_push_subscriptions_user_idx
  on public.kaoru_push_subscriptions(user_id);

create table if not exists public.kaoru_push_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  thresholds integer[] not null default array[24,3,1],
  overdue_enabled boolean not null default true,
  timezone text not null default 'America/Lima',
  updated_at timestamptz not null default now()
);

create table if not exists public.kaoru_push_delivery_log (
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id text not null,
  due_at timestamptz not null,
  alert_key text not null,
  status text not null default 'pending',
  attempts integer not null default 0,
  delivered_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  primary key (user_id, task_id, due_at, alert_key)
);

alter table public.kaoru_push_subscriptions enable row level security;
alter table public.kaoru_push_subscriptions force row level security;
alter table public.kaoru_push_preferences enable row level security;
alter table public.kaoru_push_preferences force row level security;
alter table public.kaoru_push_delivery_log enable row level security;
alter table public.kaoru_push_delivery_log force row level security;

revoke all on public.kaoru_push_subscriptions from public, anon;
revoke all on public.kaoru_push_preferences from public, anon;
revoke all on public.kaoru_push_delivery_log from public, anon, authenticated;

grant select, insert, update, delete
  on public.kaoru_push_subscriptions to authenticated;
grant select, insert, update, delete
  on public.kaoru_push_preferences to authenticated;

grant all on public.kaoru_push_subscriptions to service_role;
grant all on public.kaoru_push_preferences to service_role;
grant all on public.kaoru_push_delivery_log to service_role;

drop policy if exists kaoru_push_subscriptions_select_own on public.kaoru_push_subscriptions;
drop policy if exists kaoru_push_subscriptions_insert_own on public.kaoru_push_subscriptions;
drop policy if exists kaoru_push_subscriptions_update_own on public.kaoru_push_subscriptions;
drop policy if exists kaoru_push_subscriptions_delete_own on public.kaoru_push_subscriptions;

create policy kaoru_push_subscriptions_select_own
on public.kaoru_push_subscriptions
for select to authenticated
using (auth.uid() = user_id);

create policy kaoru_push_subscriptions_insert_own
on public.kaoru_push_subscriptions
for insert to authenticated
with check (auth.uid() = user_id);

create policy kaoru_push_subscriptions_update_own
on public.kaoru_push_subscriptions
for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy kaoru_push_subscriptions_delete_own
on public.kaoru_push_subscriptions
for delete to authenticated
using (auth.uid() = user_id);

drop policy if exists kaoru_push_preferences_select_own on public.kaoru_push_preferences;
drop policy if exists kaoru_push_preferences_insert_own on public.kaoru_push_preferences;
drop policy if exists kaoru_push_preferences_update_own on public.kaoru_push_preferences;
drop policy if exists kaoru_push_preferences_delete_own on public.kaoru_push_preferences;

create policy kaoru_push_preferences_select_own
on public.kaoru_push_preferences
for select to authenticated
using (auth.uid() = user_id);

create policy kaoru_push_preferences_insert_own
on public.kaoru_push_preferences
for insert to authenticated
with check (auth.uid() = user_id);

create policy kaoru_push_preferences_update_own
on public.kaoru_push_preferences
for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy kaoru_push_preferences_delete_own
on public.kaoru_push_preferences
for delete to authenticated
using (auth.uid() = user_id);

commit;

select
  (select count(*) from pg_policies
    where schemaname='public'
      and tablename='kaoru_push_subscriptions') as subscription_policies,
  (select count(*) from pg_policies
    where schemaname='public'
      and tablename='kaoru_push_preferences') as preference_policies;
