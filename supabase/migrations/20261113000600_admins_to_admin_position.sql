-- =============================================================================
-- Move every existing admin account to the new 'admin' position, so position
-- and role agree: admin role <=> admin position.
--
-- Accounts keep their role; only the position label changes. Supervisors and
-- beneficiaries are untouched. Runs as postgres (no auth.uid()), so the
-- trg_guard_profile_update trigger allows it.
-- =============================================================================

update public.profiles
set position = 'admin'::public.profile_position
where role = 'admin'::public.profile_roles
  and position <> 'admin'::public.profile_position;
