-- =============================================================================
-- Migration: avatars_supervisor_read
-- Purpose:   Profile pictures show in every DTR / attendance table. Supervisors may now also open the photos of the
--            members of their own office (private.supervises), alongside the owner and admins. Read only.
-- =============================================================================

begin;

drop policy if exists "avatars: read own, admin all" on storage.objects;
drop policy if exists "avatars: read own, admin all, supervisor own office" on storage.objects;
create policy "avatars: read own, admin all, supervisor own office"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'avatars'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select private.is_admin())
      or (
        (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        and private.supervises(((storage.foldername(name))[1])::uuid)
      )
    )
  );

commit;
