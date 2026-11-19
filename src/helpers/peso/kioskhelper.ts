import type { PunchStatus, PunchType } from '@/types/peso/kiosk'

/**
 * Returns YYYY-MM-DD in local time (e.g. Asia/Manila), avoiding UTC offset shifts.
 */
export const getLocalDateString = (date: Date = new Date()): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// The punch rules (which punch is next, cooldown, on-time / late) live in core.record_punch() — the database
// decides them, not the browser (migration 20261119000400).

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