import { supabase } from '@/services/supabase'
import type { ReviewReport } from '@/types/common/accomplishment'
import { toAccomplishmentReport } from '@/helpers/common/accomplishmentHelper'
import { formatNameWithMiddleInitial } from '@/helpers/common/nameHelper'

const REPORT_COLUMNS =
  'id, profile_id, funding, period_start, period_end, daily_entries, activities, designation, supervisor_name, approver_name, approver_position, amount, amount_in_words, status, review_remarks, reviewed_by, reviewed_at, submitted_at, created_at, updated_at'

const CHUNK_SIZE = 100

function chunks<T>(items: T[]): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += CHUNK_SIZE) out.push(items.slice(i, i + CHUNK_SIZE))
  return out
}

/**
 * Accomplishment reports for reviewers. RLS scopes every query: admins see all, supervisors only people in their
 * office. Drafts stay private to the writer (filtered out here). Reviewers may change only the status and remarks
 * (enforced by the database trigger); only admins may delete.
 */
export const accomplishmentReviewService = {
  /** Submitted, Returned and Reviewed reports, newest submission first, with the writer's name and office */
  async getReports(): Promise<ReviewReport[]> {
    const { data, error } = await supabase
      .schema('core')
      .from('accomplishment_reports')
      .select(REPORT_COLUMNS)
      .neq('status', 'Draft')
      .order('submitted_at', { ascending: false })

    if (error) throw new Error('Failed to load accomplishment reports.')
    const rows = data ?? []
    if (rows.length === 0) return []

    // Names and offices in batches (core and public can't be joined in one request)
    const profileIds = Array.from(new Set(rows.map((r) => r.profile_id)))
    const profileMap = new Map<string, { firstname: string; middlename: string | null; lastname: string; position: string; office_id: string | null }>()
    for (const ids of chunks(profileIds)) {
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, firstname, middlename, lastname, position, office_id')
        .in('id', ids)
      if (profileError) throw new Error('Failed to load the report writers.')
      for (const p of profiles ?? []) profileMap.set(p.id, p)
    }

    const officeIds = Array.from(
      new Set([...profileMap.values()].map((p) => p.office_id).filter((id): id is string => Boolean(id))),
    )
    const officeMap = new Map<string, { name: string; code: string | null }>()
    for (const ids of chunks(officeIds)) {
      const { data: offices } = await supabase.from('offices').select('id, name, code').in('id', ids)
      for (const o of offices ?? []) officeMap.set(o.id, o)
    }

    return rows.map((row) => {
      const profile = profileMap.get(row.profile_id)
      const office = profile?.office_id ? officeMap.get(profile.office_id) : undefined
      return {
        ...toAccomplishmentReport(row),
        fullName: profile ? formatNameWithMiddleInitial(profile.firstname, profile.middlename, profile.lastname) : 'Unknown',
        position: profile?.position ?? null,
        officeName: office?.name ?? null,
        officeCode: office?.code ?? null,
      }
    })
  },

  /** Reviewed, Returned (with remarks) or back to Submitted (undo); returns whether the row changed */
  async setReviewStatus(id: string, status: 'Reviewed' | 'Returned' | 'Submitted', remarks: string | null): Promise<void> {
    const { data, error } = await supabase
      .schema('core')
      .from('accomplishment_reports')
      .update({ status, review_remarks: remarks })
      .eq('id', id)
      .select('id')

    if (error) throw new Error(error.message || 'Failed to update the report.')
    if (!data || data.length === 0) throw new Error('This report could not be updated. It may have been removed.')
  },

  /** Admin only (RLS); returns the IDs actually deleted */
  async deleteReports(ids: string[]): Promise<string[]> {
    const deleted: string[] = []
    for (const chunk of chunks(ids)) {
      const { data, error } = await supabase
        .schema('core')
        .from('accomplishment_reports')
        .delete()
        .in('id', chunk)
        .select('id')
      if (error) throw new Error('Failed to delete the selected reports.')
      deleted.push(...(data ?? []).map((row) => row.id))
    }
    return deleted
  },
}
