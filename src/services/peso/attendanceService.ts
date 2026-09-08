import { supabase } from '@/services/supabase'
import type { AttendanceRecord } from '@/types/peso/attendance'

export const attendanceService = {
  async getAttendances(): Promise<AttendanceRecord[]> {
    try {
      // 1. Fetch attendance records from core.attendances with fallback to public.attendances
      let attendancesData: any[] | null = null
      const { data: coreData, error: coreError } = await supabase
        .schema('core')
        .from('attendances')
        .select('*')

      if (coreError && (coreError.message?.includes('Invalid schema') || coreError.code === 'PGRST106')) {
        const { data: pubData, error: pubError } = await (supabase as any)
          .from('attendances')
          .select('*')

        if (pubError) {
          console.warn(
            "Notice: Schema 'core' is not exposed. Add 'core' to Exposed Schemas in Supabase Dashboard (Settings > API > Data API > Exposed schemas)."
          )
          return []
        }
        attendancesData = pubData
      } else if (coreError) {
        console.warn('Query to core.attendances returned notice:', coreError.message)
        return []
      } else {
        attendancesData = coreData
      }

      if (!attendancesData || attendancesData.length === 0) {
        return []
      }

      // 2. Fetch profiles from public.profiles matching profile_ids
      const profileIds = Array.from(
        new Set(attendancesData.map((item) => item.profile_id).filter(Boolean))
      )

      const profileMap = new Map<string, any>()
      if (profileIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', profileIds)

        if (profilesError) {
          console.warn('Error fetching profiles for attendances:', profilesError.message)
        } else if (profilesData) {
          profilesData.forEach((p) => profileMap.set(p.id, p))
        }
      }

      // 3. Map into AttendanceRecord following core.attendances columns
      const results: AttendanceRecord[] = attendancesData.map((item) => {
        const p = profileMap.get(item.profile_id)
        const fullName = p
          ? `${p.firstname || ''} ${p.middlename ? p.middlename + ' ' : ''}${p.lastname || ''}`.trim()
          : 'Unknown Profile'

        return {
          id: item.id,
          profileId: item.profile_id,
          attendanceDate: item.attendance_date,
          fullName: fullName || 'Unknown Profile',
          firstName: p?.firstname || 'N/A',
          lastName: p?.lastname || '',
          middleName: p?.middlename || null,
          position: p?.position || 'employee',
          amCheckIn: item.am_check_in,
          amInStatus: item.am_in_status,
          amCheckOut: item.am_check_out,
          amOutStatus: item.am_out_status,
          pmCheckIn: item.pm_check_in,
          pmInStatus: item.pm_in_status,
          pmCheckOut: item.pm_check_out,
          pmOutStatus: item.pm_out_status,
          createdAt: item.created_at,
        }
      })

      // Sort newest attendance_date first, fallback to created_at
      return results.sort((a, b) => {
        const dateA = new Date(a.attendanceDate || a.createdAt).getTime()
        const dateB = new Date(b.attendanceDate || b.createdAt).getTime()
        return dateB - dateA
      })
    } catch (err) {
      console.error('Failed to get attendances from core.attendances:', err)
      return []
    }
  },
}
