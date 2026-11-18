import { supabase } from '@/services/supabase'
import type { DtrAttendance } from '@/types/peso/dtr'
import type { MyDtrProfile } from '@/types/beneficiary/myDtr'
import { formatNameWithMiddleInitial } from '@/helpers/common/nameHelper'

async function getMyUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) throw new Error('Your session has ended. Please sign in again.')
  return data.user.id
}

export const myDtrService = {
  /**
   * The signed-in user's name, and the signatory of their DTR: the head of their assigned office
   * (offices.directory_id → directories.office_head) titled "PGDH / <office code>".
   * Both signatory fields are blank when there is no office or no head on file.
   */
  async getMyDtrProfile(): Promise<MyDtrProfile> {
    const userId = await getMyUserId()
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('firstname, middlename, lastname, office_id')
      .eq('id', userId)
      .single()

    if (error || !profile) throw new Error('Failed to load your profile.')
    // Printed on the form with the middle name as an initial ("Juan S. Dela Cruz").
    const fullName = formatNameWithMiddleInitial(profile.firstname, profile.middlename, profile.lastname)

    const blank: MyDtrProfile = { fullName, supervisorName: '', supervisorTitle: '' }
    if (!profile.office_id) return blank

    const { data: office, error: officeError } = await supabase
      .from('offices')
      .select('name, code, directory_id')
      .eq('id', profile.office_id)
      .maybeSingle()
    if (officeError) throw new Error('Failed to load your office.')
    if (!office?.directory_id) return blank

    const { data: directory, error: directoryError } = await supabase
      .from('directories')
      .select('office_head, office_code')
      .eq('id', office.directory_id)
      .maybeSingle()
    if (directoryError) throw new Error('Failed to load your office head.')

    const head = directory?.office_head?.trim()
    if (!head) return blank

    const code = office.code?.trim() || directory?.office_code?.trim() || office.name.trim()
    return { fullName, supervisorName: head.toUpperCase(), supervisorTitle: `PGDH / ${code}` }
  },

  /**
   * The signed-in user's own punches between two ISO dates (inclusive).
   * RLS also limits the rows to auth.uid() on the server.
   */
  async getMyAttendancesInRange(startDate: string, endDate: string): Promise<DtrAttendance[]> {
    const userId = await getMyUserId()
    const { data, error } = await supabase
      .schema('core')
      .from('attendances')
      .select('attendance_date, am_check_in, am_check_out, pm_check_in, pm_check_out')
      .eq('profile_id', userId)
      .gte('attendance_date', startDate)
      .lte('attendance_date', endDate)

    if (error) throw new Error('Failed to load your attendance for this period.')
    return (data ?? []).map((row) => ({
      attendanceDate: row.attendance_date,
      amCheckIn: row.am_check_in,
      amCheckOut: row.am_check_out,
      pmCheckIn: row.pm_check_in,
      pmCheckOut: row.pm_check_out,
    }))
  },
}
