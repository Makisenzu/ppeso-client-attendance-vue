import { supabase } from '@/services/supabase'
import type {
  TeamAttendanceRecord,
  TeamMember,
  TeamOffice,
} from '@/types/supervisor/team'
import type { DtrAttendance } from '@/types/peso/dtr'
import { formatNameWithMiddleInitial } from '@/helpers/common/nameHelper'

/**
 * Supervisor screens: the people in the supervisor's own office and their attendance. Read-only.
 * RLS (SECURITY.md §4.1) already limits a supervisor to profiles and attendances of their own office;
 * the filters here only narrow it to beneficiaries and keep the selected columns to what the screens show.
 */

// Only the columns the Team Attendance screen shows.
const TEAM_ATTENDANCE_COLUMNS =
  'id, profile_id, attendance_date, am_check_in, am_in_status, am_check_out, am_out_status, pm_check_in, pm_in_status, pm_check_out, pm_out_status, created_at'

const CHUNK_SIZE = 100

function chunks<T>(items: T[]): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += CHUNK_SIZE) out.push(items.slice(i, i + CHUNK_SIZE))
  return out
}

async function getMyUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) throw new Error('Your session has ended. Please sign in again.')
  return data.user.id
}

export const teamService = {
  /** The signed-in supervisor's office, or null when they are not assigned to one */
  async getMyOffice(): Promise<TeamOffice | null> {
    const userId = await getMyUserId()
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('office_id')
      .eq('id', userId)
      .maybeSingle()
    if (error) throw new Error('Failed to load your profile.')
    if (!profile?.office_id) return null

    const { data: office, error: officeError } = await supabase
      .from('offices')
      .select('id, name, code')
      .eq('id', profile.office_id)
      .maybeSingle()
    if (officeError) throw new Error('Failed to load your office.')
    return office ?? null
  },

  /** Beneficiaries assigned to the office, by last name */
  async getTeamMembers(officeId: string): Promise<TeamMember[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, firstname, middlename, lastname, position, status')
      .eq('office_id', officeId)
      .eq('role', 'beneficiary')
      .order('lastname', { ascending: true })
    if (error) throw new Error('Failed to load the people in your office.')
    return (data ?? []).map((p) => ({
      id: p.id,
      fullName: formatNameWithMiddleInitial(p.firstname, p.middlename, p.lastname),
      position: p.position,
      status: p.status,
    }))
  },

  /** Every daily time record of the given members, newest first (optionally from one date on) */
  async getTeamAttendances(members: TeamMember[], fromDate?: string): Promise<TeamAttendanceRecord[]> {
    if (members.length === 0) return []
    const memberMap = new Map(members.map((m) => [m.id, m]))
    const results: TeamAttendanceRecord[] = []

    for (const ids of chunks([...memberMap.keys()])) {
      let query = supabase.schema('core').from('attendances').select(TEAM_ATTENDANCE_COLUMNS).in('profile_id', ids)
      if (fromDate) query = query.gte('attendance_date', fromDate)
      const { data, error } = await query
      if (error) throw new Error('Failed to load your team’s attendance.')

      for (const row of data ?? []) {
        const member = memberMap.get(row.profile_id)
        results.push({
          id: row.id,
          profileId: row.profile_id,
          fullName: member?.fullName ?? 'Unknown',
          position: member?.position ?? null,
          attendanceDate: row.attendance_date,
          amCheckIn: row.am_check_in,
          amInStatus: row.am_in_status,
          amCheckOut: row.am_check_out,
          amOutStatus: row.am_out_status,
          pmCheckIn: row.pm_check_in,
          pmInStatus: row.pm_in_status,
          pmCheckOut: row.pm_check_out,
          pmOutStatus: row.pm_out_status,
          createdAt: row.created_at,
        })
      }
    }

    return results.sort(
      (a, b) => b.attendanceDate.localeCompare(a.attendanceDate) || a.fullName.localeCompare(b.fullName),
    )
  },

  /** Accomplishment reports waiting for review in the office (RLS-scoped; drafts are never visible) */
  async getPendingReviewCount(): Promise<number> {
    const { count, error } = await supabase
      .schema('core')
      .from('accomplishment_reports')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'Submitted')
    if (error) throw new Error('Failed to load the reports waiting for review.')
    return count ?? 0
  },
  /** One member's punches between two dates, for their printed DTR (RLS: own office only) */
  async getMemberDtrAttendances(profileId: string, startDate: string, endDate: string): Promise<DtrAttendance[]> {
    const { data, error } = await supabase
      .schema('core')
      .from('attendances')
      .select('attendance_date, am_check_in, am_check_out, pm_check_in, pm_check_out')
      .eq('profile_id', profileId)
      .gte('attendance_date', startDate)
      .lte('attendance_date', endDate)
    if (error) throw new Error('Failed to load the daily time record.')
    return (data ?? []).map((row) => ({
      attendanceDate: row.attendance_date,
      amCheckIn: row.am_check_in,
      amCheckOut: row.am_check_out,
      pmCheckIn: row.pm_check_in,
      pmCheckOut: row.pm_check_out,
    }))
  },
}
