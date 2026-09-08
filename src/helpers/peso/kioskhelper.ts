import type { AttendanceRow, PunchStatus, PunchType } from '@/types/peso/kiosk'

/**
 * Returns YYYY-MM-DD in local time (e.g. Asia/Manila), avoiding UTC offset shifts.
 */
export const getLocalDateString = (date: Date = new Date()): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Automatically determine the appropriate punch type based on the employee's
 * existing records for today and the current time of day.
 */
export const determinePunchType = (
  todayRecord: AttendanceRow | null,
  now: Date = new Date()
): PunchType => {
  const currentHour = now.getHours()

  // Case 1: No record yet today
  if (!todayRecord) {
    // If arriving at or after 12:00 PM with no AM record, it's afternoon check-in
    return currentHour < 12 ? 'am_in' : 'pm_in'
  }

  // Case 2: AM In is missing
  if (!todayRecord.am_check_in) {
    if (currentHour < 12) {
      return 'am_in'
    }
    // Arrived in afternoon
    if (!todayRecord.pm_check_in) {
      return 'pm_in'
    }
    return 'pm_out'
  }

  // Case 3: AM In exists, but AM Out is missing
  if (!todayRecord.am_check_out) {
    // Lunch transition: before 1:00 PM (13:00), an employee clocking out is taking lunch (am_out)
    if (currentHour < 13) {
      return 'am_out'
    }
    // If it's already 1:00 PM or later and they never punched AM out, check PM In
    if (!todayRecord.pm_check_in) {
      return 'pm_in'
    }
    return 'pm_out'
  }

  // Case 4: AM In and AM Out are both completed
  if (!todayRecord.pm_check_in) {
    return 'pm_in'
  }

  // Case 5: PM In is done, PM Out is next
  return 'pm_out'
}

/**
 * Returns the most recent punch timestamp, punch type, and date object from today's attendance record.
 */
export const getMostRecentPunch = (
  record: AttendanceRow | null
): { punchType: PunchType; timestamp: string; date: Date } | null => {
  if (!record) return null

  const punches: { punchType: PunchType; timestamp: string; date: Date }[] = []

  if (record.am_check_in) {
    const d = new Date(record.am_check_in)
    if (!isNaN(d.getTime())) punches.push({ punchType: 'am_in', timestamp: record.am_check_in, date: d })
  }
  if (record.am_check_out) {
    const d = new Date(record.am_check_out)
    if (!isNaN(d.getTime())) punches.push({ punchType: 'am_out', timestamp: record.am_check_out, date: d })
  }
  if (record.pm_check_in) {
    const d = new Date(record.pm_check_in)
    if (!isNaN(d.getTime())) punches.push({ punchType: 'pm_in', timestamp: record.pm_check_in, date: d })
  }
  if (record.pm_check_out) {
    const d = new Date(record.pm_check_out)
    if (!isNaN(d.getTime())) punches.push({ punchType: 'pm_out', timestamp: record.pm_check_out, date: d })
  }

  if (punches.length === 0) return null

  punches.sort((a, b) => b.date.getTime() - a.date.getTime())
  return punches[0]
}

/**
 * Checks if the user already logged a punch within the cooldown duration (default 5 minutes).
 */
export const checkPunchCooldown = (
  record: AttendanceRow | null,
  now: Date = new Date(),
  cooldownMinutes: number = 5
): {
  isWithinCooldown: boolean
  recentPunch: { punchType: PunchType; timestamp: string; date: Date } | null
  minutesRemaining: number
} => {
  const recent = getMostRecentPunch(record)
  if (!recent) {
    return { isWithinCooldown: false, recentPunch: null, minutesRemaining: 0 }
  }

  const elapsedMs = now.getTime() - recent.date.getTime()
  const cooldownMs = cooldownMinutes * 60 * 1000

  if (elapsedMs >= 0 && elapsedMs < cooldownMs) {
    const remainingMs = cooldownMs - elapsedMs
    const minutesRemaining = Math.max(1, Math.ceil(remainingMs / (60 * 1000)))
    return { isWithinCooldown: true, recentPunch: recent, minutesRemaining }
  }

  return { isWithinCooldown: false, recentPunch: recent, minutesRemaining: 0 }
}

/**
 * Validates whether the target punch type is valid given the user's current day record.
 */
export const validatePunch = (
  todayRecord: AttendanceRow | null,
  targetPunch: PunchType
): { valid: boolean; reason?: string } => {
  if (!todayRecord) {
    return { valid: true }
  }

  switch (targetPunch) {
    case 'am_in':
      if (todayRecord.am_check_in) {
        const time = formatShortTime(todayRecord.am_check_in)
        return { valid: false, reason: `AM Check-In was already recorded today at ${time}.` }
      }
      break
    case 'am_out':
      if (todayRecord.am_check_out) {
        const time = formatShortTime(todayRecord.am_check_out)
        return { valid: false, reason: `AM Check-Out was already recorded today at ${time}.` }
      }
      if (!todayRecord.am_check_in) {
        return { valid: false, reason: 'Cannot record AM Check-Out without an AM Check-In.' }
      }
      break
    case 'pm_in':
      if (todayRecord.pm_check_in) {
        const time = formatShortTime(todayRecord.pm_check_in)
        return { valid: false, reason: `PM Check-In was already recorded today at ${time}.` }
      }
      break
    case 'pm_out':
      if (todayRecord.pm_check_out) {
        const time = formatShortTime(todayRecord.pm_check_out)
        return { valid: false, reason: `PM Check-Out was already recorded today at ${time}.` }
      }
      if (!todayRecord.pm_check_in && !todayRecord.am_check_in) {
        return { valid: false, reason: 'Cannot record PM Check-Out without any prior check-in.' }
      }
      break
  }

  return { valid: true }
}

/**
 * Calculates punch status (ontime, late, early_out) based on standard office schedule:
 * AM In: <= 08:00 (ontime), > 08:00 (late)
 * AM Out: < 12:00 (early_out), >= 12:00 (ontime)
 * PM In: <= 13:00 (ontime), > 13:00 (late)
 * PM Out: < 17:00 (early_out), >= 17:00 (ontime)
 */
export const calculatePunchStatus = (
  punchType: PunchType,
  punchDate: Date = new Date()
): PunchStatus => {
  const hour = punchDate.getHours()
  const minute = punchDate.getMinutes()
  const timeInMinutes = hour * 60 + minute

  switch (punchType) {
    case 'am_in':
      // 8:00 AM = 480 minutes
      return timeInMinutes <= 8 * 60 ? 'ontime' : 'late'

    case 'am_out':
      // 12:00 PM = 720 minutes
      return timeInMinutes < 12 * 60 ? 'early_out' : 'ontime'

    case 'pm_in':
      // 1:00 PM = 780 minutes
      return timeInMinutes <= 13 * 60 ? 'ontime' : 'late'

    case 'pm_out':
      // 5:00 PM = 1020 minutes
      return timeInMinutes < 17 * 60 ? 'early_out' : 'ontime'

    default:
      return 'ontime'
  }
}

/**
 * Formats full name from profile record
 */
export const formatFullName = (profile: {
  firstname: string
  middlename: string | null
  lastname: string
}): string => {
  const middle = profile.middlename ? ` ${profile.middlename[0]}.` : ''
  return `${profile.firstname}${middle} ${profile.lastname}`.trim()
}

/**
 * Human-readable action labels
 */
export const formatPunchTypeLabel = (type: PunchType): string => {
  const labels: Record<PunchType, string> = {
    am_in: 'AM Check-In',
    am_out: 'AM Check-Out',
    pm_in: 'PM Check-In',
    pm_out: 'PM Check-Out',
  }
  return labels[type] || type
}

/**
 * Helper to format short time (e.g. "8:02 AM")
 */
export const formatShortTime = (isoString?: string | null): string => {
  if (!isoString) return ''
  try {
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return isoString
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return isoString
  }
}

/**
 * Returns badge CSS styling for punch status
 */
export const getStatusBadgeStyle = (status?: PunchStatus | null): string => {
  switch (status) {
    case 'ontime':
      return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
    case 'late':
      return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
    case 'early_out':
      return 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30'
    case 'absent':
      return 'bg-destructive/15 text-destructive border-destructive/30'
    default:
      return 'bg-muted text-muted-foreground border-border'
  }
}