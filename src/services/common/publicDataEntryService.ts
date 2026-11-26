import { supabase } from '@/services/supabase'
import type { Database } from '@/types/database.types'
import type { AnnexDEntryInsert } from '@/types/common/dataEntry'

type SubmitArgs = Database['public']['Functions']['submit_annex_d_entry']['Args']

/** The server refused the entry because of a rate limit (HTTP 429 / errcode PT429). */
export class DataEntryRateLimitError extends Error {}

/**
 * Public Data Entry form (/data-entry). Calls the insert-only `public.submit_annex_d_entry` RPC, which validates,
 * rate-limits and stores one ANNEX D beneficiary. Nothing is read back (RA 10173 — PRIVACY.md).
 */
export const publicDataEntryService = {
  async submit(entry: AnnexDEntryInsert): Promise<void> {
    // Every SQL parameter is nullable, but the generated Args type marks them non-null; PostgREST needs all
    // 21 named arguments present, so blanks are sent as null.
    const args = {
      p_lastname: entry.lastname,
      p_firstname: entry.firstname,
      p_middlename: entry.middlename ?? null,
      p_extension_name: entry.extension_name ?? null,
      p_birthdate: entry.birthdate,
      p_barangay: entry.barangay,
      p_municipality: entry.municipality,
      p_province: entry.province,
      p_district: entry.district ?? null,
      p_id_type: entry.id_type ?? null,
      p_id_number: entry.id_number ?? null,
      p_contact_number: entry.contact_number ?? null,
      p_epayment_account: entry.epayment_account ?? null,
      p_beneficiary_type: entry.beneficiary_type,
      p_occupation: entry.occupation ?? null,
      p_sex: entry.sex,
      p_civil_status: entry.civil_status ?? null,
      p_average_monthly_income: entry.average_monthly_income ?? null,
      p_dependent: entry.dependent ?? null,
      p_interested_in_employment: entry.interested_in_employment ?? null,
      p_skills_training_needed: entry.skills_training_needed ?? null,
    } as unknown as SubmitArgs
    const { error } = await supabase.rpc('submit_annex_d_entry', args)
    // Never log the payload: it holds the beneficiary's personal data.
    if (error?.code === 'PT429') throw new DataEntryRateLimitError(error.message)
    // Messages raised on purpose by the function (validation, duplicates) are safe to show
    if (error && ['22023', '22007', '23505'].includes(error.code)) throw new Error(error.message)
    if (error) throw new Error('Could not save the entry. Please try again.')
  },
}
