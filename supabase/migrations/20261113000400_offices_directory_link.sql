-- =============================================================================
-- Link public.offices to public.directories.
--
-- An office is created from a directory entry; its chief (office_head) is read
-- from the directory through this link, so it stays current.
-- One directory entry can back at most one office.
-- =============================================================================

alter table public.offices
  add column if not exists directory_id uuid
    references public.directories (id) on delete set null;

create unique index if not exists offices_directory_id_key
  on public.offices (directory_id)
  where directory_id is not null;
