-- =============================================================================
-- Add 'admin' to public.profile_position.
--
-- From now on only the Admin position maps to the admin role; Employee maps to
-- beneficiary (see userManagementService.createUser). The value is used by the
-- next migration, which must run in a separate transaction.
-- =============================================================================

alter type public.profile_position add value if not exists 'admin';
