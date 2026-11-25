import { supabase } from '@/services/supabase'
import type { WalkInSubmission } from '@/types/common/walkIn'

/** The server refused the submission because of a rate limit or a duplicate (HTTP 429 / errcode PT429). */
export class WalkInRateLimitError extends Error {}

/**
 * Public walk-in form (/walk-in). Calls the insert-only `public.submit_walk_in` RPC, which
 * validates, rate-limits and stores the record. Nothing is read back (RA 10173 — PRIVACY.md).
 */
export const walkInService = {
  async submit(payload: WalkInSubmission): Promise<void> {
    const { error } = await supabase.rpc('submit_walk_in', payload)
    // Never log the payload: it holds the client's personal data.
    if (error?.code === 'PT429') throw new WalkInRateLimitError(error.message)
    if (error) throw new Error(error.message || 'Could not submit the form. Please try again.')
  },
}
