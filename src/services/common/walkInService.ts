import { supabase } from '@/services/supabase'
import type { WalkInSubmission } from '@/types/common/walkIn'

/**
 * Public walk-in form (/walk-in). Calls the insert-only `public.submit_walk_in` RPC, which
 * validates, rate-limits and stores the record. Nothing is read back (RA 10173 — PRIVACY.md).
 */
export const walkInService = {
  async submit(payload: WalkInSubmission): Promise<void> {
    const { error } = await supabase.rpc('submit_walk_in', payload)
    // Never log the payload: it holds the client's personal data.
    if (error) throw new Error(error.message || 'Could not submit the form. Please try again.')
  },
}
