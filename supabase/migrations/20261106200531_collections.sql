-- Apply once in the Supabase SQL Editor. No private content or credentials here.
begin;

-- Only an administrator can add an allowed user. Signing up alone grants nothing.
create table public.collection_members (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.collection_members enable row level security;
revoke all on public.collection_members from anon, authenticated;
grant select on public.collection_members to authenticated;
create policy "Members can see their own membership" on public.collection_members
  for select to authenticated using (user_id = (select auth.uid()));

create table public.collection_entries (
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  collection text not null check (collection in (
    'philosophy', 'firstPrinciples', 'philosophyNotes', 'ideas', 'history',
    'psychology', 'neuroscience', 'learnings', 'thoughts', 'inspiration',
    'finance', 'social-sciences'
  )),
  position integer not null check (position >= 0),
  content jsonb not null check (
    jsonb_typeof(content) = 'object' and content ? 'id' and content->>'id' = id
  ),
  primary key (owner_id, id)
);
create index collection_entries_order on public.collection_entries (owner_id, position, id);

create table public.collection_settings (
  owner_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  content jsonb not null check (jsonb_typeof(content) = 'object')
);

alter table public.collection_entries enable row level security;
alter table public.collection_settings enable row level security;
revoke all on public.collection_entries, public.collection_settings from anon, authenticated;
grant select, insert, update, delete on public.collection_entries, public.collection_settings to authenticated;

create policy "Members manage their own entries" on public.collection_entries
  for all to authenticated
  using (owner_id = (select auth.uid()) and exists (
    select 1 from public.collection_members where user_id = (select auth.uid())
  ))
  with check (owner_id = (select auth.uid()) and exists (
    select 1 from public.collection_members where user_id = (select auth.uid())
  ));
create policy "Members manage their own settings" on public.collection_settings
  for all to authenticated
  using (owner_id = (select auth.uid()) and exists (
    select 1 from public.collection_members where user_id = (select auth.uid())
  ))
  with check (owner_id = (select auth.uid()) and exists (
    select 1 from public.collection_members where user_id = (select auth.uid())
  ));

-- Transactional import: failure rolls back everything. Never accepts an owner id
-- from the caller, and executes under the caller's permissions and RLS policies.
create function public.replace_collection_content(entries jsonb, settings jsonb)
returns integer language plpgsql security invoker set search_path = '' as $$
declare imported integer;
begin
  if not exists (select 1 from public.collection_members where user_id = (select auth.uid())) then
    raise exception 'Collections access is not enabled for this account' using errcode = '42501';
  end if;
  if jsonb_typeof(entries) is distinct from 'array' or jsonb_typeof(settings) is distinct from 'object' then
    raise exception 'Invalid import';
  end if;
  delete from public.collection_entries where owner_id = (select auth.uid());
  insert into public.collection_entries (id, collection, position, content)
    select item->>'id', item->>'collection', (item->>'position')::integer, item->'content'
    from jsonb_array_elements(entries) as item;
  get diagnostics imported = row_count;
  insert into public.collection_settings (owner_id, content)
    values ((select auth.uid()), settings)
    on conflict (owner_id) do update set content = excluded.content;
  return imported;
end;
$$;
revoke all on function public.replace_collection_content(jsonb, jsonb) from public, anon;
grant execute on function public.replace_collection_content(jsonb, jsonb) to authenticated;

commit;
