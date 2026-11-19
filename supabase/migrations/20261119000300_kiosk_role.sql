-- =============================================================================
-- Migration: 20261119000300_kiosk_role.sql
-- Purpose:   A new profile role, `kiosk`: an office's PACD computer, signed in to record attendance for that office
--            only. Its own migration because a new enum value can't be used in the transaction that adds it
--            (20261119000400_office_kiosks.sql uses it).
-- =============================================================================

alter type public.profile_roles add value if not exists 'kiosk';
