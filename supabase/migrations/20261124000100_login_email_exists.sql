-- =============================================================================
-- public.login_email_exists(p_email) — does an account use this email?
--
-- Supabase Auth answers a wrong email and a wrong password with the same error. The login page
-- calls this only after a failed sign-in, so it can mark (and shake) only the wrong field.
--
-- Trade-off (accepted by the project owner, 11/24/2026): anyone can ask whether an email has an
-- account. It returns a boolean only — never a name, role or any other personal data.
-- SECURITY DEFINER (owner postgres) because clients cannot read auth.users.
-- =============================================================================

create or replace function public.login_email_exists(p_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.users u
    where lower(u.email) = lower(btrim(coalesce(p_email, '')))
  );
$$;

revoke execute on function public.login_email_exists(text) from public;
grant execute on function public.login_email_exists(text) to anon, authenticated;
