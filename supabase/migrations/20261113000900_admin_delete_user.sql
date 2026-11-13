-- =============================================================================
-- public.admin_delete_user(target_user_id) — delete an account completely.
--
-- Deleting only public.profiles left the login (auth.users) behind: the person could still sign in
-- and the email could not be reused. This removes the auth user; ON DELETE CASCADE then removes
-- public.profiles and core.attendances for that person.
--
-- SECURITY DEFINER (owner postgres) because clients cannot touch the auth schema. Guards:
--   * caller must be an active admin (private.is_admin())
--   * an admin cannot delete their own account
--   * the target must exist
-- =============================================================================

create or replace function public.admin_delete_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Only an administrator can delete accounts.' using errcode = '42501';
  end if;

  if target_user_id is null then
    raise exception 'No account was selected.' using errcode = '22004';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'You can''t delete your own account.' using errcode = '42501';
  end if;

  delete from auth.users where id = target_user_id;

  if not found then
    raise exception 'This account no longer exists.' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.admin_delete_user(uuid) from public, anon;
grant execute on function public.admin_delete_user(uuid) to authenticated;
