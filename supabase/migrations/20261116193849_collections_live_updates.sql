-- Send only invalidation signals; content remains behind the existing table RLS.
create function public.notify_collection_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if TG_OP <> 'DELETE' then
    perform realtime.send('{}'::jsonb, 'change', 'collections:' || NEW.owner_id::text, true);
  end if;
  if TG_OP = 'DELETE' or (TG_OP = 'UPDATE' and OLD.owner_id is distinct from NEW.owner_id) then
    perform realtime.send('{}'::jsonb, 'change', 'collections:' || OLD.owner_id::text, true);
  end if;
  return null;
end;
$$;
revoke all on function public.notify_collection_change() from public, anon, authenticated;

create trigger collection_entries_notify
after insert or update or delete on public.collection_entries
for each row execute function public.notify_collection_change();

create trigger collection_settings_notify
after insert or update or delete on public.collection_settings
for each row execute function public.notify_collection_change();

create policy "Members receive their own collection notifications"
on realtime.messages for select to authenticated
using (
  extension = 'broadcast'
  and (select realtime.topic()) = 'collections:' || (select auth.uid())::text
  and exists (
    select 1 from public.collection_members where user_id = (select auth.uid())
  )
);
