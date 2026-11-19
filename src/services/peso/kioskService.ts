import { supabase } from '@/services/supabase'
import { attendanceService as attendanceDataService } from '@/services/peso/attendanceService'
import type { AttendanceResult, KioskRecentPunch, PunchMode, PunchStatus, PunchType, RecordPunchResponse } from '@/types/peso/kiosk'
import { formatFullName, formatPunchTypeLabel, formatShortTime, getLocalDateString } from '@/helpers/peso/kioskhelper'

/**
 * Attendance kiosk: the admin kiosk (/dashboard/kiosk) and the office kiosks (/office-kiosk) both record punches
 * through core.record_punch() (migration 20261119000400). The database looks up the passcode, applies the punch
 * rules and the 5-minute cooldown, refuses people from another office on an office kiosk, and locks a kiosk after
 * repeated wrong passcodes. The browser never reads passcodes or writes core.attendances itself.
 */

const PUNCH_FIELDS: { type: PunchType; at: 'am_check_in' | 'am_check_out' | 'pm_check_in' | 'pm_check_out'; status: 'am_in_status' | 'am_out_status' | 'pm_in_status' | 'pm_out_status' }[] = [
  { type: 'am_in', at: 'am_check_in', status: 'am_in_status' },
  { type: 'am_out', at: 'am_check_out', status: 'am_out_status' },
  { type: 'pm_in', at: 'pm_check_in', status: 'pm_in_status' },
  { type: 'pm_out', at: 'pm_check_out', status: 'pm_out_status' },
]

export const attendanceService = {
  /** Records the next punch (or the chosen one) for the person with this passcode */
  async processPunchByPasscode(passcode: string, preferredPunch: PunchMode = 'auto'): Promise<AttendanceResult> {
    const { data, error } = await supabase
      .schema('core')
      .rpc('record_punch', { p_passcode: passcode, p_mode: preferredPunch })

    if (error) {
      // Messages raised on purpose by the function are written for the kiosk; others stay generic
      throw new Error(error.code === '42501' && error.message ? error.message : 'The punch could not be recorded. Please try again.')
    }

    const result = data as unknown as RecordPunchResponse
    if (result.already_recorded && result.punch_type) {
      return {
        success: false,
        alreadyRecorded: true,
        message: `Already Recorded: ${formatPunchTypeLabel(result.punch_type)} was recorded at ${formatShortTime(result.timestamp)}.`,
        profile: result.profile,
        punchType: result.punch_type,
        timestamp: result.timestamp,
      }
    }
    if (!result.ok) {
      throw new Error(result.message || 'This punch action is not allowed at this time.')
    }

    try {
      attendanceDataService.notifyAttendanceChange()
    } catch {
      console.warn('Failed to broadcast the attendance change.')
    }

    const name = result.profile ? formatFullName(result.profile) : ''
    return {
      success: true,
      message: `${result.punch_type ? formatPunchTypeLabel(result.punch_type) : 'Punch'} recorded successfully for ${name}!`,
      profile: result.profile,
      punchType: result.punch_type,
      status: result.status,
      timestamp: result.timestamp,
    }
  },

  /** Today's punches, newest first (an office kiosk sees only its own office) */
  async getTodayRecentPunches(): Promise<KioskRecentPunch[]> {
    const { data, error } = await supabase.schema('core').rpc('kiosk_today_punches')
    if (error) {
      console.warn('Failed to load today\'s punches.')
      return []
    }

    const punches: KioskRecentPunch[] = []
    for (const row of data ?? []) {
      const fullName = formatFullName(row)
      for (const field of PUNCH_FIELDS) {
        const at = row[field.at]
        if (!at) continue
        punches.push({
          id: `${row.attendance_id}-${field.type}`,
          profileId: row.profile_id,
          fullName,
          firstName: row.firstname,
          lastName: row.lastname,
          position: row.position || 'Employee',
          punchType: field.type,
          status: (row[field.status] as PunchStatus | null) ?? null,
          timestamp: at,
        })
      }
    }
    return punches.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  },

  /**
   * Live updates of today's punches. Realtime follows RLS, so only the admin kiosk receives them; office kiosks
   * refresh on a timer (kioskStore).
   */
  subscribeToTodayPunches(callback: () => void) {
    const todayStr = getLocalDateString(new Date())
    return supabase
      .channel(`kiosk-realtime-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'core', table: 'attendances', filter: `attendance_date=eq.${todayStr}` },
        () => callback(),
      )
      .subscribe()
  },
}
