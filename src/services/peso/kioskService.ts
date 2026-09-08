import { supabase } from '@/services/supabase'
import { attendanceService as attendanceDataService } from '@/services/peso/attendanceService'
import type { Profile, AttendanceRow, AttendanceResult, AttendanceUpdate, PunchMode, PunchType, KioskRecentPunch } from '@/types/peso/kiosk'
import {
  calculatePunchStatus,
  checkPunchCooldown,
  determinePunchType,
  formatFullName,
  formatPunchTypeLabel,
  formatShortTime,
  getLocalDateString,
  validatePunch,
} from '@/helpers/peso/kioskhelper'

const recentPunchesCache = new Map<
  string,
  { timestamp: number; punchType: PunchType; profile: Profile; resultTime: string }
>()

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

    // 2. Check recent in-memory punch cache (within 5 minutes)
    const cachedPunch = recentPunchesCache.get(profile.id)
    if (cachedPunch && (now.getTime() - cachedPunch.timestamp) < 5 * 60 * 1000) {
      const punchLabel = formatPunchTypeLabel(cachedPunch.punchType)
      return {
        success: false,
        alreadyRecorded: true,
        message: `Already Recorded: ${punchLabel} was recorded at ${cachedPunch.resultTime}.`,
        profile: cachedPunch.profile,
        punchType: cachedPunch.punchType,
        timestamp: new Date(cachedPunch.timestamp).toISOString(),
      }
    }

    // 3. Fetch existing daily record for today (trying core schema first, then fallback to public)
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

    // 4. Check database punch cooldown (within 5 minutes from last punch today)
    const cooldown = checkPunchCooldown(existingRecord, now, 5)
    if (cooldown.isWithinCooldown && cooldown.recentPunch) {
      const punchLabel = formatPunchTypeLabel(cooldown.recentPunch.punchType)
      const punchTime = formatShortTime(cooldown.recentPunch.timestamp)

      recentPunchesCache.set(profile.id, {
        timestamp: cooldown.recentPunch.date.getTime(),
        punchType: cooldown.recentPunch.punchType,
        profile,
        resultTime: punchTime,
      })

      return {
        success: false,
        alreadyRecorded: true,
        message: `Already Recorded: ${punchLabel} was recorded at ${punchTime}.`,
        profile,
        punchType: cooldown.recentPunch.punchType,
        timestamp: cooldown.recentPunch.timestamp,
        existingRecord,
      }
    }

    // 5. Resolve target punch type
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

    recentPunchesCache.set(profile.id, {
      timestamp: now.getTime(),
      punchType: targetPunch,
      profile,
      resultTime: formatShortTime(nowIso),
    })

    // Broadcast attendance update to all open tabs and real-time listeners
    try {
      attendanceDataService.notifyAttendanceChange()
    } catch (e) {
      console.warn('Failed to broadcast attendance change:', e)
    }

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

  /**
   * Fetch today's punches in reverse chronological order
   */
  async getTodayRecentPunches(): Promise<KioskRecentPunch[]> {
    try {
      const todayStr = getLocalDateString(new Date())

      let attendancesData: any[] | null = null
      const { data: coreData, error: coreError } = await supabase
        .schema('core')
        .from('attendances')
        .select('*')
        .eq('attendance_date', todayStr)

      if (coreError && (coreError.message?.includes('Invalid schema: core') || coreError.code === 'PGRST106')) {
        const { data: pubData } = await (supabase as any)
          .from('attendances')
          .select('*')
          .eq('attendance_date', todayStr)
        attendancesData = pubData
      } else if (coreError) {
        console.warn('Error fetching today attendances:', coreError.message)
        return []
      } else {
        attendancesData = coreData
      }

      if (!attendancesData || attendancesData.length === 0) {
        return []
      }

      const profileIds = Array.from(
        new Set(attendancesData.map((item) => item.profile_id).filter(Boolean))
      )

      const profileMap = new Map<string, Profile>()
      if (profileIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('*')
          .in('id', profileIds)

        if (profilesData) {
          profilesData.forEach((p) => profileMap.set(p.id, p as Profile))
        }
      }

      const punches: KioskRecentPunch[] = []

      for (const record of attendancesData) {
        const profile = profileMap.get(record.profile_id)
        const fullName = profile ? formatFullName(profile) : 'Unknown Employee'
        const position = profile?.position || 'Employee'

        if (record.am_check_in) {
          punches.push({
            id: `${record.id}-am_in`,
            profileId: record.profile_id,
            fullName,
            firstName: profile?.firstname,
            lastName: profile?.lastname,
            position,
            punchType: 'am_in',
            status: record.am_in_status,
            timestamp: record.am_check_in,
          })
        }
        if (record.am_check_out) {
          punches.push({
            id: `${record.id}-am_out`,
            profileId: record.profile_id,
            fullName,
            firstName: profile?.firstname,
            lastName: profile?.lastname,
            position,
            punchType: 'am_out',
            status: record.am_out_status,
            timestamp: record.am_check_out,
          })
        }
        if (record.pm_check_in) {
          punches.push({
            id: `${record.id}-pm_in`,
            profileId: record.profile_id,
            fullName,
            firstName: profile?.firstname,
            lastName: profile?.lastname,
            position,
            punchType: 'pm_in',
            status: record.pm_in_status,
            timestamp: record.pm_check_in,
          })
        }
        if (record.pm_check_out) {
          punches.push({
            id: `${record.id}-pm_out`,
            profileId: record.profile_id,
            fullName,
            firstName: profile?.firstname,
            lastName: profile?.lastname,
            position,
            punchType: 'pm_out',
            status: record.pm_out_status,
            timestamp: record.pm_check_out,
          })
        }
      }

      return punches.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    } catch (err) {
      console.error('Failed to get today recent punches:', err)
      return []
    }
  },

  /**
   * Subscribe to today's punches in real-time
   */
  subscribeToTodayPunches(callback: () => void) {
    const todayStr = getLocalDateString(new Date())

    const channel = supabase
      .channel(`kiosk-realtime-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'core',
          table: 'attendances',
          filter: `attendance_date=eq.${todayStr}`,
        },
        () => {
          callback()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendances',
          filter: `attendance_date=eq.${todayStr}`,
        },
        () => {
          callback()
        }
      )
      .subscribe()

    return channel
  },
}