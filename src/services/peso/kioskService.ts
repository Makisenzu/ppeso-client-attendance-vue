import { supabase } from '@/services/supabase'
import type { Profile, AttendanceRow, AttendanceResult, AttendanceUpdate, PunchMode, PunchType } from '@/types/peso/kiosk'
import {
  calculatePunchStatus,
  determinePunchType,
  formatFullName,
  formatPunchTypeLabel,
  getLocalDateString,
  validatePunch,
} from '@/helpers/peso/kioskhelper'

export const attendanceService = {
  /**
   * Fetch profile by passcode
   */
  async getProfileByPasscode(passcode: string): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('passcode', passcode)
      .eq('status', 'active')
      .single()

    if (error || !data) {
      throw new Error('Invalid passcode or profile is inactive.')
    }

    return data
  },

  /**
   * Process Check-in / Check-out using 6-digit passcode and optional preferred punch mode
   */
  async processPunchByPasscode(
    passcode: string,
    preferredPunch: PunchMode = 'auto'
  ): Promise<AttendanceResult> {
    // 1. Validate employee profile
    const profile = await this.getProfileByPasscode(passcode)
    const now = new Date()
    const todayStr = getLocalDateString(now)
    const nowIso = now.toISOString()

    // 2. Fetch existing daily record for today (trying core schema first, then fallback to public)
    let existingRecord: AttendanceRow | null = null
    let useCore = true

    const { data: coreRecord, error: fetchError } = await supabase
      .schema('core')
      .from('attendances')
      .select('*')
      .eq('profile_id', profile.id)
      .eq('attendance_date', todayStr)
      .maybeSingle()

    if (fetchError && (fetchError.message?.includes('Invalid schema: core') || fetchError.code === 'PGRST106')) {
      useCore = false
      const { data: pubRecord, error: pubError } = await (supabase as any)
        .from('attendances')
        .select('*')
        .eq('profile_id', profile.id)
        .eq('attendance_date', todayStr)
        .maybeSingle()

      if (pubError) {
        throw new Error(
          "Supabase Data API error: Schema 'core' is not exposed. Please add 'core' to Exposed Schemas in your Supabase Dashboard (Settings > API > Data API > Exposed schemas)."
        )
      }
      existingRecord = pubRecord as AttendanceRow | null
    } else if (fetchError) {
      throw new Error(`Failed to verify attendance record: ${fetchError.message}`)
    } else {
      existingRecord = coreRecord
    }

    // 3. Resolve target punch type
    const targetPunch: PunchType =
      preferredPunch !== 'auto'
        ? preferredPunch
        : determinePunchType(existingRecord, now)

    // 4. Validate punch eligibility (prevent duplicates / invalid flow)
    const validation = validatePunch(existingRecord, targetPunch)
    if (!validation.valid) {
      throw new Error(validation.reason || 'This punch action is not allowed at this time.')
    }

    // 5. Calculate status (ontime, late, early_out)
    const status = calculatePunchStatus(targetPunch, now)

    const tableClient = useCore
      ? supabase.schema('core').from('attendances')
      : (supabase as any).from('attendances')

    // 6. Perform Insert or Update
    if (!existingRecord) {
      const { error: insertError } = await tableClient
        .insert({
          profile_id: profile.id,
          attendance_date: todayStr,
          am_check_in: targetPunch === 'am_in' ? nowIso : null,
          am_in_status: targetPunch === 'am_in' ? status : null,
          am_check_out: targetPunch === 'am_out' ? nowIso : null,
          am_out_status: targetPunch === 'am_out' ? status : null,
          pm_check_in: targetPunch === 'pm_in' ? nowIso : null,
          pm_in_status: targetPunch === 'pm_in' ? status : null,
          pm_check_out: targetPunch === 'pm_out' ? nowIso : null,
          pm_out_status: targetPunch === 'pm_out' ? status : null,
        })

      if (insertError) {
        throw new Error(`Failed to record punch: ${insertError.message}`)
      }
    } else {
      const updateData: AttendanceUpdate = {}

      if (targetPunch === 'am_in') {
        updateData.am_check_in = nowIso
        updateData.am_in_status = status
      } else if (targetPunch === 'am_out') {
        updateData.am_check_out = nowIso
        updateData.am_out_status = status
      } else if (targetPunch === 'pm_in') {
        updateData.pm_check_in = nowIso
        updateData.pm_in_status = status
      } else if (targetPunch === 'pm_out') {
        updateData.pm_check_out = nowIso
        updateData.pm_out_status = status
      }

      const { error: updateError } = await tableClient
        .update(updateData)
        .eq('id', existingRecord.id)

      if (updateError) {
        throw new Error(`Failed to update punch: ${updateError.message}`)
      }
    }

    const punchLabel = formatPunchTypeLabel(targetPunch)

    return {
      success: true,
      message: `${punchLabel} recorded successfully for ${formatFullName(profile)}!`,
      profile,
      punchType: targetPunch,
      status,
      timestamp: nowIso,
      existingRecord,
    }
  },
}