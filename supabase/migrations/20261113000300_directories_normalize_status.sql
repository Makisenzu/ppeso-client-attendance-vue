-- =============================================================================
-- public.directories — accept status in any letter case.
--
-- CSV imports use "Active" / "Inactive". Normalise the value (trim + lowercase,
-- blank → 'active') before the CHECK constraint runs, so every write path
-- (dashboard CSV import, app, SQL) stores 'active' / 'inactive'.
-- =============================================================================

create or replace function public.normalize_directory_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.status := coalesce(nullif(lower(btrim(new.status)), ''), 'active');
  return new;
end;
$$;

revoke execute on function public.normalize_directory_status() from public, anon, authenticated;

drop trigger if exists trg_normalize_directory_status on public.directories;
create trigger trg_normalize_directory_status
  before insert or update of status on public.directories
  for each row execute function public.normalize_directory_status();
