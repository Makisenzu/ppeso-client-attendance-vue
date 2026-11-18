import { supabase } from '@/services/supabase'
import type { DtrAttendance } from '@/types/peso/dtr'

async function getMyUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) throw new Error('Your session has ended. Please sign in again.')
  return data.user.id
}

export const myDtrService = {
  /** The signed-in user's full name, as printed on their DTR. */
  async getMyFullName(): Promise<string> {
    const userId = await getMyUserId()
    const { data, error } = await supabase
      .from('profiles')
      .select('firstname, middlename, lastname')
      .eq('id', userId)
      .single()

    if (error || !data) throw new Error('Failed to load your profile.')
    return [data.firstname, data.middlename, data.lastname].filter(Boolean).join(' ').trim()
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
