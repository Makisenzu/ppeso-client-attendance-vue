import { supabase } from '@/services/supabase'
import type { MyAttendanceRecord } from '@/types/beneficiary/myAttendance'

// Only the columns the My Attendance screen shows.
const MY_ATTENDANCE_COLUMNS =
  'id, attendance_date, am_check_in, am_in_status, am_check_out, am_out_status, pm_check_in, pm_in_status, pm_check_out, pm_out_status, created_at'

export const myAttendanceService = {
  /**
   * The signed-in user's own daily time records, newest first.
   * RLS ("attendances: read own …") also limits the rows to auth.uid() on the server.
   */
  async getMyAttendances(): Promise<MyAttendanceRecord[]> {
    const { data: userData, error: userError } = await supabase.auth.getUser()
    const user = userData?.user
    if (userError || !user) throw new Error('Your session has ended. Please sign in again.')

    const { data, error } = await supabase
      .schema('core')
      .from('attendances')
      .select(MY_ATTENDANCE_COLUMNS)
      .eq('profile_id', user.id)
      .order('attendance_date', { ascending: false })

    if (error) throw new Error('Failed to load your attendance records.')

    return (data ?? []).map((row) => ({
      id: row.id,
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
    }))
  },
}
