import type { Database } from '@/types/database.types'

/** Arguments of `public.submit_walk_in` — the only write the public walk-in form can make. */
export type WalkInSubmission = Database['public']['Functions']['submit_walk_in']['Args']
