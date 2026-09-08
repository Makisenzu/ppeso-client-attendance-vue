import type { AttendanceRecord, AttendanceStatsSummary, PunchStatus } from '@/types/peso/attendance'

export function getInitials(name?: string | null): string {
  if (!name) return 'U'
  const parts = name.trim().split(' ').filter(Boolean)
  if (parts.length === 0) return 'U'
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

export function formatDateDisplay(dateStr?: string | null): string {
  if (!dateStr) return '—'
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
      const [y, m, d] = dateStr.trim().split('-').map(Number)
      const date = new Date(y, m - 1, d)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    }
    const d = new Date(dateStr)
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    }
  } catch {
    return dateStr
  }
  return dateStr
}

export function formatTimeDisplay(timeStr?: string | null): string {
  if (!timeStr) return '—'
  const trimmed = timeStr.trim()
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    const [h, m] = trimmed.split(':').map(Number)
    const period = h >= 12 ? 'PM' : 'AM'
    const hour12 = h % 12 || 12
    return `${hour12}:${String(m).padStart(2, '0')} ${period}`
  }
  try {
    const d = new Date(trimmed)
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    }
  } catch {
    return trimmed
  }
  return trimmed
}

export function formatDateTimeDisplay(dateStr?: string | null): string {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    if (!isNaN(d.getTime())) {
      return d.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    }
  } catch {
    return dateStr
  }
  return dateStr
}

export function getPunchStatusBadgeClass(status?: PunchStatus | string | null): string {
  switch (status?.toLowerCase()) {
    case 'ontime':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
    case 'late':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
    case 'early_out':
      return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30'
    case 'absent':
      return 'bg-destructive/10 text-destructive border-destructive/30'
    default:
      return 'bg-muted text-muted-foreground border-transparent'
  }
}

export function formatPunchStatusLabel(status?: PunchStatus | string | null): string {
  switch (status?.toLowerCase()) {
    case 'ontime':
      return 'On Time'
    case 'late':
      return 'Late'
    case 'early_out':
      return 'Early Out'
    case 'absent':
      return 'Absent'
    default:
      return status ? status.replace(/_/g, ' ') : '—'
  }
}

export function getPositionBadgeClass(pos?: string | null): string {
  switch (pos?.toLowerCase()) {
    case 'employee':
      return 'bg-primary/10 text-primary border-primary/20'
    case 'gip':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
    case 'tupad':
      return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
    case 'client':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
    default:
      return 'bg-muted text-muted-foreground border-border'
  }
}

export function computeAttendanceStats(records: AttendanceRecord[]): AttendanceStatsSummary {
  let onTimeCount = 0
  let lateCount = 0
  let earlyOutCount = 0
  let absentCount = 0

  for (const r of records) {
    const statuses = [r.amInStatus, r.amOutStatus, r.pmInStatus, r.pmOutStatus].filter(Boolean)
    if (statuses.includes('late')) {
      lateCount++
    }
    if (statuses.includes('early_out')) {
      earlyOutCount++
    }
    if (statuses.includes('absent')) {
      absentCount++
    }
    if (statuses.includes('ontime') && !statuses.includes('late') && !statuses.includes('absent')) {
      onTimeCount++
    }
  }

  return {
    total: records.length,
    onTimeCount,
    lateCount,
    earlyOutCount,
    absentCount,
  }
}

export function exportAttendanceToCsv(records: AttendanceRecord[], filterSummary: string = 'All'): void {
  const headers = [
    'Record ID',
    'Profile ID',
    'Full Name',
    'Position',
    'Attendance Date',
    'AM Check In',
    'AM In Status',
    'AM Check Out',
    'AM Out Status',
    'PM Check In',
    'PM In Status',
    'PM Check Out',
    'PM Out Status',
    'Created At',
  ]

  const rows = records.map((r) => [
    `"${r.id}"`,
    `"${r.profileId}"`,
    `"${r.fullName}"`,
    `"${r.position ? r.position.toUpperCase() : 'N/A'}"`,
    `"${formatDateDisplay(r.attendanceDate)}"`,
    `"${formatTimeDisplay(r.amCheckIn)}"`,
    `"${formatPunchStatusLabel(r.amInStatus)}"`,
    `"${formatTimeDisplay(r.amCheckOut)}"`,
    `"${formatPunchStatusLabel(r.amOutStatus)}"`,
    `"${formatTimeDisplay(r.pmCheckIn)}"`,
    `"${formatPunchStatusLabel(r.pmInStatus)}"`,
    `"${formatTimeDisplay(r.pmCheckOut)}"`,
    `"${formatPunchStatusLabel(r.pmOutStatus)}"`,
    `"${r.createdAt}"`,
  ])

  const csvContent =
    'data:text/csv;charset=utf-8,\uFEFF' +
    [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')

  const encodedUri = encodeURI(csvContent)
  const link = document.createElement('a')
  link.setAttribute('href', encodedUri)
  link.setAttribute(
    'download',
    `Attendance_Records_${filterSummary.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`
  )
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
