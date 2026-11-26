import { supabase } from '@/services/supabase'
import { birthdateCutoffForAge, sanitizeSearchTerm, SENIOR_MIN_AGE } from '@/helpers/common/dataEntryHelper'
import type { AnnexDEntry, AnnexDEntryInsert, AnnexDFilters, AnnexDSelection } from '@/types/common/dataEntry'

/** Every ANNEX D column the page and the export use (no audit stamps). */
const ENTRY_COLUMNS =
  'id, lastname, firstname, middlename, extension_name, birthdate, barangay, municipality, province, district, id_type, id_number, contact_number, epayment_account, beneficiary_type, occupation, sex, civil_status, average_monthly_income, dependent, interested_in_employment, skills_training_needed, source, created_at'

/** Enough to list a selected entry in the delete confirmation. */
const SELECTION_COLUMNS = 'id, lastname, firstname, middlename, extension_name'

const CHUNK_SIZE = 100
const EXPORT_PAGE_SIZE = 1000

const table = () => supabase.schema('core').from('annex_d_entries')

/** Applies the page's search and filters to a query (same rules for the list, the ids and the export). */
function applyFilters<
  Q extends { eq: (c: string, v: string) => Q; lte: (c: string, v: string) => Q; or: (f: string) => Q },
>(query: Q, filters: AnnexDFilters): Q {
  let q = query
  if (filters.beneficiaryType !== 'ALL') q = q.eq('beneficiary_type', filters.beneficiaryType)
  if (filters.municipality) q = q.eq('municipality', filters.municipality)
  if (filters.age === 'ABOVE_60') q = q.lte('birthdate', birthdateCutoffForAge(SENIOR_MIN_AGE))
  const term = sanitizeSearchTerm(filters.search)
  if (term) {
    q = q.or(`lastname.ilike.%${term}%,firstname.ilike.%${term}%,middlename.ilike.%${term}%,id_number.ilike.%${term}%`)
  }
  return q
}

/** Turns constraint errors into messages an admin can act on; hides other database details. */
function toEntryError(error: { code?: string; message: string }, fallback: string): Error {
  if (error.code === '22007') return new Error(error.message) // raised on purpose by the trigger
  if (error.code === '23505') return new Error('This beneficiary is already encoded (same name and birthdate).')
  if (error.code === '23514') return new Error('Some details are not valid. Check the form and try again.')
  if (error.code === '42501') return new Error('Only administrators can manage data entries.')
  return new Error(fallback)
}

export const dataEntryService = {
  /** One page of entries (sorted by name) and the total that match the filters. */
  async listEntries(
    filters: AnnexDFilters,
    page: number,
    pageSize: number,
  ): Promise<{ rows: AnnexDEntry[]; total: number }> {
    const from = (page - 1) * pageSize
    const { data, error, count } = await applyFilters(
      table().select(ENTRY_COLUMNS, { count: 'exact' }),
      filters,
    )
      .order('lastname', { ascending: true })
      .order('firstname', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1)

    if (error) throw toEntryError(error, 'Failed to load data entries.')
    return { rows: (data ?? []) as unknown as AnnexDEntry[], total: count ?? 0 }
  },

  /** Every entry that matches the filters, as name stubs ("Select all matching"). */
  async listSelection(filters: AnnexDFilters): Promise<AnnexDSelection[]> {
    const rows: AnnexDSelection[] = []
    for (let from = 0; ; from += EXPORT_PAGE_SIZE) {
      const { data, error } = await applyFilters(table().select(SELECTION_COLUMNS), filters)
        .order('lastname', { ascending: true })
        .order('id', { ascending: true })
        .range(from, from + EXPORT_PAGE_SIZE - 1)
      if (error) throw toEntryError(error, 'Failed to select the entries.')
      rows.push(...(data ?? []))
      if ((data?.length ?? 0) < EXPORT_PAGE_SIZE) return rows
    }
  },

  /** Every entry that matches the filters, in ANNEX D order (for the Excel export). */
  async listForExport(filters: AnnexDFilters): Promise<AnnexDEntry[]> {
    const rows: AnnexDEntry[] = []
    for (let from = 0; ; from += EXPORT_PAGE_SIZE) {
      const { data, error } = await applyFilters(table().select(ENTRY_COLUMNS), filters)
        .order('lastname', { ascending: true })
        .order('firstname', { ascending: true })
        .order('id', { ascending: true })
        .range(from, from + EXPORT_PAGE_SIZE - 1)
      if (error) throw toEntryError(error, 'Failed to load the entries to export.')
      rows.push(...((data ?? []) as unknown as AnnexDEntry[]))
      if ((data?.length ?? 0) < EXPORT_PAGE_SIZE) return rows
    }
  },

  /** The selected entries (for exporting a selection), in ANNEX D order. */
  async listByIds(ids: string[]): Promise<AnnexDEntry[]> {
    const rows: AnnexDEntry[] = []
    for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
      const { data, error } = await table().select(ENTRY_COLUMNS).in('id', ids.slice(i, i + CHUNK_SIZE))
      if (error) throw toEntryError(error, 'Failed to load the entries to export.')
      rows.push(...((data ?? []) as unknown as AnnexDEntry[]))
    }
    return rows.sort(
      (a, b) => a.lastname.localeCompare(b.lastname) || a.firstname.localeCompare(b.firstname) || a.id.localeCompare(b.id),
    )
  },

  async createEntry(payload: AnnexDEntryInsert): Promise<void> {
    const { error } = await table().insert(payload)
    if (error) throw toEntryError(error, 'Failed to save the entry.')
  },

  async updateEntry(id: string, payload: AnnexDEntryInsert): Promise<void> {
    const { data, error } = await table().update(payload).eq('id', id).select('id')
    if (error) throw toEntryError(error, 'Failed to save the changes.')
    if ((data?.length ?? 0) === 0) throw new Error('This entry no longer exists.')
  },

  /** Deletes in chunks of 100; returns the ids that were actually deleted. */
  async deleteEntries(ids: string[]): Promise<string[]> {
    const deleted: string[] = []
    for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
      const { data, error } = await table().delete().in('id', ids.slice(i, i + CHUNK_SIZE)).select('id')
      if (error) throw toEntryError(error, 'Failed to delete the entries.')
      deleted.push(...(data ?? []).map((r) => r.id))
    }
    return deleted
  },
}
