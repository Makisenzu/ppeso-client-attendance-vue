import { supabase } from '@/services/supabase'
import type { Json } from '@/types/database.types'
import type {
  AccomplishmentReport,
  ReportAuthorContext,
  ReportFunding,
  ReportSavePayload,
} from '@/types/common/accomplishment'
import { toAccomplishmentReport } from '@/helpers/common/accomplishmentHelper'
import { formatNameWithMiddleInitial } from '@/helpers/common/nameHelper'

const REPORT_COLUMNS =
  'id, profile_id, funding, period_start, period_end, daily_entries, activities, designation, supervisor_name, approver_name, approver_position, amount, amount_in_words, status, review_remarks, reviewed_by, reviewed_at, submitted_at, created_at, updated_at'

const DELETE_CHUNK_SIZE = 100

async function getMyUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) throw new Error('Your session has ended. Please sign in again.')
  return data.user.id
}

/**
 * The signed-in beneficiary's own accomplishment reports. RLS limits every query to their rows, and the
 * database trigger validates what they write (funding, dates, entries, submit rules).
 */
export const myAccomplishmentService = {
  /** Newest period first */
  async getMyReports(): Promise<AccomplishmentReport[]> {
    const userId = await getMyUserId()
    const { data, error } = await supabase
      .schema('core')
      .from('accomplishment_reports')
      .select(REPORT_COLUMNS)
      .eq('profile_id', userId)
      .order('period_start', { ascending: false })

    if (error) throw new Error('Failed to load your accomplishment reports.')
    return (data ?? []).map(toAccomplishmentReport)
  },

  async getMyReport(id: string): Promise<AccomplishmentReport | null> {
    const { data, error } = await supabase
      .schema('core')
      .from('accomplishment_reports')
      .select(REPORT_COLUMNS)
      .eq('id', id)
      .maybeSingle()

    if (error) throw new Error('Failed to load this report.')
    return data ? toAccomplishmentReport(data) : null
  },

  /** Name, funding, office and its head (from the office directory) for the form and its signatories */
  async getMyContext(): Promise<ReportAuthorContext> {
    const userId = await getMyUserId()
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('firstname, middlename, lastname, funding, office_id')
      .eq('id', userId)
      .single()
    if (error || !profile) throw new Error('Failed to load your profile.')

    const context: ReportAuthorContext = {
      fullName: formatNameWithMiddleInitial(profile.firstname, profile.middlename, profile.lastname),
      funding: (profile.funding as ReportFunding | null) ?? null,
      officeName: '',
      officeHeadName: '',
      officeHeadPosition: '',
    }
    if (!profile.office_id) return context

    const { data: office } = await supabase
      .from('offices')
      .select('name, code, directory_id')
      .eq('id', profile.office_id)
      .maybeSingle()
    if (!office) return context
    context.officeName = office.name

    if (!office.directory_id) return context
    const { data: directory } = await supabase
      .from('directories')
      .select('office_head, office_code')
      .eq('id', office.directory_id)
      .maybeSingle()

    const head = directory?.office_head?.trim()
    if (head) {
      context.officeHeadName = head.toUpperCase()
      const code = office.code?.trim() || directory?.office_code?.trim() || office.name.trim()
      context.officeHeadPosition = `PGDH / ${code}`
    }
    return context
  },

  /** Saves a Draft or submits; returns the saved report. Errors raised by the trigger are shown as-is. */
  async saveReport(payload: ReportSavePayload): Promise<AccomplishmentReport> {
    const userId = await getMyUserId()
    const values = {
      period_start: payload.periodStart,
      period_end: payload.periodEnd,
      daily_entries: payload.dailyEntries as unknown as Json,
      activities: payload.activities as unknown as Json,
      designation: payload.details.designation || null,
      supervisor_name: payload.details.supervisor_name || null,
      approver_name: payload.details.approver_name || null,
      approver_position: payload.details.approver_position || null,
      amount: payload.details.amount ? Number(payload.details.amount) : null,
      amount_in_words: payload.details.amount_in_words || null,
      // The trigger keeps a Returned report Returned when it is only saved
      status: payload.submit ? 'Submitted' : 'Draft',
    }

    const query = payload.id
      ? supabase.schema('core').from('accomplishment_reports').update(values).eq('id', payload.id)
      : supabase
          .schema('core')
          .from('accomplishment_reports')
          // funding is set by the trigger from the profile
          .insert({ ...values, profile_id: userId, funding: 'DOLE' })

    const { data, error } = await query.select(REPORT_COLUMNS).maybeSingle()
    if (error) throw new Error(error.message || 'Failed to save your report.')
    if (!data) throw new Error('This report could not be saved. It may have been reviewed or removed.')
    return toAccomplishmentReport(data)
  },

  /** Removes the reports RLS lets the owner remove (not Reviewed); returns the removed IDs */
  async deleteMyReports(ids: string[]): Promise<string[]> {
    const deleted: string[] = []
    for (let i = 0; i < ids.length; i += DELETE_CHUNK_SIZE) {
      const chunk = ids.slice(i, i + DELETE_CHUNK_SIZE)
      const { data, error } = await supabase
        .schema('core')
        .from('accomplishment_reports')
        .delete()
        .in('id', chunk)
        .select('id')
      if (error) throw new Error('Failed to remove the selected reports.')
      deleted.push(...(data ?? []).map((row) => row.id))
    }
    return deleted
  },
}
