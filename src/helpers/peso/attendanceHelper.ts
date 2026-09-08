import type { AttendanceRecord, AttendanceStatsSummary } from '@/types/peso/attendance'

export function getInitials(name?: string | null): string {
  if (!name) return 'U'
  const parts = name.trim().split(' ').filter(Boolean)
  if (parts.length === 0) return 'U'
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

export function formatDateDisplay(dateStr?: string | null): string {
  if (!dateStr) return 'N/A'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return 'N/A'
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return 'N/A'
  }
}

export function formatTimeDisplay(dateStr?: string | null): string {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '—'
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return '—'
  }
}

export function formatDateTimeDisplay(dateStr?: string | null): string {
  if (!dateStr) return 'N/A'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return 'N/A'
    return `${formatDateDisplay(dateStr)} at ${formatTimeDisplay(dateStr)}`
  } catch {
    return 'N/A'
  }
}

export function calculateDurationDisplay(checkInStr?: string | null, checkOutStr?: string | null): string {
  if (!checkInStr) return '—'
  const checkIn = new Date(checkInStr).getTime()
  if (isNaN(checkIn)) return '—'

  const checkOut = checkOutStr ? new Date(checkOutStr).getTime() : Date.now()
  const diffMs = Math.max(0, checkOut - checkIn)
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const hours = Math.floor(diffMinutes / 60)
  const minutes = diffMinutes % 60

  if (hours === 0 && minutes === 0) return '< 1m'
  if (hours === 0) return `${minutes}m`
  return `${hours}h ${minutes}m`
}

export function getStatusBadgeVariant(status: string): 'default' | 'outline' | 'secondary' | 'destructive' {
  switch (status.toLowerCase()) {
    case 'active':
    case 'checked in':
      return 'outline'
    case 'completed':
    case 'checked out':
      return 'outline'
    default:
      return 'secondary'
  }
}

export function getStatusBadgeClass(status: string): string {
  switch (status.toLowerCase()) {
    case 'active':
    case 'checked in':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
    case 'completed':
    case 'checked out':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

export function getTypeBadgeClass(type: string): string {
  switch (type.toLowerCase()) {
    case 'registered':
      return 'bg-primary/10 text-primary border-primary/20'
    case 'walkin':
    case 'walk-in':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

export function formatClassificationLabel(record: AttendanceRecord): string {
  if (record.attendanceType === 'registered') {
    return record.position ? record.position.toUpperCase() : 'EMPLOYEE'
  }
  return record.purpose ? record.purpose.toUpperCase() : 'CLIENT'
}

export function computeAttendanceStats(records: AttendanceRecord[]): AttendanceStatsSummary {
  const today = new Date().toISOString().slice(0, 10)

  let active = 0
  let completed = 0
  let walkinCount = 0
  let registeredCount = 0
  let todayCount = 0

  for (const r of records) {
    if (r.status === 'active' || !r.checkOut) {
      active++
    } else {
      completed++
    }

    if (r.attendanceType === 'walkin') {
      walkinCount++
    } else {
      registeredCount++
    }

    if (r.checkIn && r.checkIn.slice(0, 10) === today) {
      todayCount++
    }
  }

  return {
    total: records.length,
    active,
    completed,
    walkinCount,
    registeredCount,
    todayCount,
  }
}

export function exportAttendanceToCsv(records: AttendanceRecord[], filterSummary: string = 'All'): void {
  const headers = [
    'Attendance ID',
    'Type',
    'Full Name',
    'Classification / Purpose',
    'Contact Number',
    'Address',
    'Date',
    'Check In',
    'Check Out',
    'Duration',
    'Status',
  ]

  const rows = records.map((r) => [
    `"${r.id}"`,
    `"${r.attendanceType}"`,
    `"${r.fullName}"`,
    `"${formatClassificationLabel(r)}"`,
    `"${r.contactNumber || 'N/A'}"`,
    `"${r.address?.fullAddress || r.address?.barangay || 'N/A'}"`,
    `"${formatDateDisplay(r.checkIn)}"`,
    `"${formatTimeDisplay(r.checkIn)}"`,
    `"${r.checkOut ? formatTimeDisplay(r.checkOut) : 'Active'}"`,
    `"${calculateDurationDisplay(r.checkIn, r.checkOut)}"`,
    `"${r.status.toUpperCase()}"`,
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
