begin;
-- Column grants from the foundation still allow metadata edits. Preserve the
-- terminal archive rule even when an API caller bypasses the platform RPC.
create function private.protect_archived_club() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if old.status = 'archived' then
    raise exception 'Archived club is read-only' using errcode='23514';
  end if;
  return new;
end;
$$;
revoke all on function private.protect_archived_club() from public,anon,authenticated,service_role;
create trigger protect_archived_club before update on public.clubs
for each row execute function private.protect_archived_club();
commit;
