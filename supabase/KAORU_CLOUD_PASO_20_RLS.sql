-- KAORU CLOUD - PASO 20
-- Seguridad final: RLS, RPC y Storage privado por usuario.
-- Idempotente: puede ejecutarse otra vez si fuera necesario.

begin;

-- ============================================================
-- 1) TABLA PRIVADA: public.kaoru_records
-- ============================================================
alter table public.kaoru_records enable row level security;
alter table public.kaoru_records force row level security;

revoke all on table public.kaoru_records from public;
revoke all on table public.kaoru_records from anon;
grant select, insert, update, delete
  on table public.kaoru_records
  to authenticated;

-- La tabla es exclusiva de Kaoru: eliminamos cualquier politica previa
-- para evitar que una politica permisiva antigua quede combinada por OR.
do $$
declare
  p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'kaoru_records'
  loop
    execute format(
      'drop policy if exists %I on public.kaoru_records',
      p.policyname
    );
  end loop;
end
$$;

create policy kaoru_records_select_own
on public.kaoru_records
for select
to authenticated
using (auth.uid() = user_id);

create policy kaoru_records_insert_own
on public.kaoru_records
for insert
to authenticated
with check (auth.uid() = user_id);

create policy kaoru_records_update_own
on public.kaoru_records
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy kaoru_records_delete_own
on public.kaoru_records
for delete
to authenticated
using (auth.uid() = user_id);

-- ============================================================
-- 2) RPC: el usuario SIEMPRE sale de auth.uid()
-- ============================================================
create or replace function public.kaoru_upsert_record(
  p_module text,
  p_entity_type text,
  p_entity_id text,
  p_payload jsonb,
  p_client_updated_at bigint,
  p_deleted boolean default false,
  p_device_id text default null
)
returns public.kaoru_records
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_row public.kaoru_records;
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;

  if p_module is null or p_module not in ('tasks', 'reader') then
    raise exception 'Invalid Kaoru module';
  end if;

  if nullif(btrim(coalesce(p_entity_type, '')), '') is null then
    raise exception 'Entity type is required';
  end if;

  if nullif(btrim(coalesce(p_entity_id, '')), '') is null then
    raise exception 'Entity id is required';
  end if;

  insert into public.kaoru_records (
    user_id,
    module,
    entity_type,
    entity_id,
    payload,
    client_updated_at,
    device_id,
    deleted,
    server_updated_at
  )
  values (
    v_user,
    p_module,
    p_entity_type,
    p_entity_id,
    coalesce(p_payload, '{}'::jsonb),
    greatest(coalesce(p_client_updated_at, 0), 0),
    nullif(p_device_id, ''),
    coalesce(p_deleted, false),
    now()
  )
  on conflict (user_id, module, entity_type, entity_id)
  do update set
    payload = excluded.payload,
    client_updated_at = excluded.client_updated_at,
    device_id = excluded.device_id,
    deleted = excluded.deleted,
    server_updated_at = now()
  where excluded.client_updated_at >= kaoru_records.client_updated_at
  returning * into v_row;

  -- Si el cambio entrante era mas antiguo, devolvemos la version actual
  -- del MISMO usuario; nunca buscamos registros ajenos.
  if v_row is null then
    select *
      into v_row
      from public.kaoru_records
     where user_id = v_user
       and module = p_module
       and entity_type = p_entity_type
       and entity_id = p_entity_id;
  end if;

  return v_row;
end;
$$;

revoke all
  on function public.kaoru_upsert_record(
    text, text, text, jsonb, bigint, boolean, text
  )
  from public;

revoke all
  on function public.kaoru_upsert_record(
    text, text, text, jsonb, bigint, boolean, text
  )
  from anon;

grant execute
  on function public.kaoru_upsert_record(
    text, text, text, jsonb, bigint, boolean, text
  )
  to authenticated;

-- ============================================================
-- 3) STORAGE PRIVADO: kaoru-files
--    Primer segmento del path = auth.uid()
-- ============================================================
update storage.buckets
set
  public = false,
  file_size_limit = 104857600
where id = 'kaoru-files';

drop policy if exists kaoru_files_select_own on storage.objects;
drop policy if exists kaoru_files_insert_own on storage.objects;
drop policy if exists kaoru_files_update_own on storage.objects;
drop policy if exists kaoru_files_delete_own on storage.objects;

create policy kaoru_files_select_own
on storage.objects
for select
to authenticated
using (
  bucket_id = 'kaoru-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy kaoru_files_insert_own
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'kaoru-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy kaoru_files_update_own
on storage.objects
for update
to authenticated
using (
  bucket_id = 'kaoru-files'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'kaoru-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy kaoru_files_delete_own
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'kaoru-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

commit;

-- ============================================================
-- 4) VERIFICACION. Los resultados deben mostrar:
--    - rowsecurity = true
--    - forcerowsecurity = true
--    - security_definer = false
--    - bucket_public = false
--    - cuatro politicas authenticated para kaoru_records
-- ============================================================

select
  c.relrowsecurity as rowsecurity,
  c.relforcerowsecurity as forcerowsecurity
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'kaoru_records';

select
  p.prosecdef as security_definer
from pg_proc p
where p.oid =
  'public.kaoru_upsert_record(text,text,text,jsonb,bigint,boolean,text)'::regprocedure;

select
  id,
  public as bucket_public,
  file_size_limit
from storage.buckets
where id = 'kaoru-files';

select
  policyname,
  cmd,
  roles,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'kaoru_records'
order by policyname;

select
  policyname,
  cmd,
  roles,
  qual,
  with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and policyname like 'kaoru_files_%'
order by policyname;
