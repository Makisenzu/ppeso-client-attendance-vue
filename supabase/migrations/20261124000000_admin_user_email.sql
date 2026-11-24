-- =============================================================================
-- Admin-only read / change of an account's sign-in email (User Management → Edit User).
--
-- Emails live in auth.users, which clients cannot read or write, so both functions are
-- SECURITY DEFINER (owner postgres) and check private.is_admin() first.
--
--   public.admin_get_user_email(target_user_id)            → the account's email
--   public.admin_update_user_email(target_user_id, email)  → sets a new email, confirmed right away
--                                                             (the admin vouches for it; no mail is sent)
-- =============================================================================

create or replace function public.admin_get_user_email(target_user_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_email text;
begin
  if not private.is_admin() then
    raise exception 'Only an administrator can view account emails.' using errcode = '42501';
  end if;

  select u.email into v_email from auth.users u where u.id = target_user_id;

  if not found then
    raise exception 'This account no longer exists.' using errcode = 'P0002';
  end if;

  return v_email;
end;
$$;

create or replace function public.admin_update_user_email(target_user_id uuid, new_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(new_email, '')));
begin
  if not private.is_admin() then
    raise exception 'Only an administrator can change account emails.' using errcode = '42501';
  end if;

  if target_user_id is null then
    raise exception 'No account was selected.' using errcode = '22004';
  end if;

  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Enter a valid email address.' using errcode = '22023';
  end if;

  if exists (select 1 from auth.users u where lower(u.email) = v_email and u.id <> target_user_id) then
    raise exception 'Another account already uses this email.' using errcode = '23505';
  end if;

  update auth.users
     set email = v_email,
         email_confirmed_at = coalesce(email_confirmed_at, now()),
         email_change = '',
         email_change_token_new = '',
         email_change_token_current = '',
         email_change_confirm_status = 0,
         updated_at = now()
   where id = target_user_id;

  if not found then
    raise exception 'This account no longer exists.' using errcode = 'P0002';
  end if;

  -- Keep the email sign-in identity in step with the account.
  update auth.identities
     set identity_data = coalesce(identity_data, '{}'::jsonb) || jsonb_build_object('email', v_email),
         updated_at = now()
   where user_id = target_user_id
     and provider = 'email';
end;
$$;

revoke execute on function public.admin_get_user_email(uuid) from public, anon;
grant execute on function public.admin_get_user_email(uuid) to authenticated;

revoke execute on function public.admin_update_user_email(uuid, text) from public, anon;
grant execute on function public.admin_update_user_email(uuid, text) to authenticated;
