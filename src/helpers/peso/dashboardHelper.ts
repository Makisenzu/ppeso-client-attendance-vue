import type { AttendanceRecord } from '@/types/peso/attendance'
import type { ClientRecordItem, ServiceRequired } from '@/types/peso/clientRecord'
import type { ProfileRecord } from '@/types/peso/userManagement'
import { PURPOSE_OPTIONS } from '@/helpers/peso/clientRecordHelper'

// ─── Shared Helpers ───

function getLocalDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getLast7DayLabels(): { labels: string[]; dateStrings: string[] } {
  const labels: string[] = []
  const dateStrings: string[] = []
  const now = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    dateStrings.push(getLocalDateStr(d))
    labels.push(
      d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    )
  }
  return { labels, dateStrings }
}

// ─── Attendance Analytics ───

export interface AttendanceStatusDistribution {
  ontime: number
  late: number
  earlyOut: number
  absent: number
}

export function computeAttendanceStatusDistribution(
  records: AttendanceRecord[]
): AttendanceStatusDistribution {
  let ontime = 0
  let late = 0
  let earlyOut = 0
  let absent = 0

  for (const r of records) {
    const statuses = [r.amInStatus, r.amOutStatus, r.pmInStatus, r.pmOutStatus].filter(Boolean)
    if (statuses.includes('late')) late++
    if (statuses.includes('early_out')) earlyOut++
    if (statuses.includes('absent')) absent++
    if (
      statuses.includes('ontime') &&
      !statuses.includes('late') &&
      !statuses.includes('absent')
    ) {
      ontime++
    }
  }

  return { ontime, late, earlyOut, absent }
}

export interface WeeklyTrendData {
  labels: string[]
  data: number[]
}

export function computeWeeklyAttendanceTrend(
  records: AttendanceRecord[]
): WeeklyTrendData {
  const { labels, dateStrings } = getLast7DayLabels()
  const countMap = new Map<string, number>()
  dateStrings.forEach((ds) => countMap.set(ds, 0))

  for (const r of records) {
    if (r.attendanceDate) {
      const ds = r.attendanceDate.slice(0, 10)
      if (countMap.has(ds)) {
        countMap.set(ds, (countMap.get(ds) || 0) + 1)
      }
    }
  }

  return {
    labels,
    data: dateStrings.map((ds) => countMap.get(ds) || 0),
  }
}

export function computeOnTimeRate(records: AttendanceRecord[]): number {
  if (records.length === 0) return 0
  const dist = computeAttendanceStatusDistribution(records)
  const total = dist.ontime + dist.late + dist.earlyOut + dist.absent
  if (total === 0) return 0
  return Math.round((dist.ontime / total) * 100)
}

// ─── Client Record Analytics ───

export function computeWeeklyClientTrend(
  records: ClientRecordItem[]
): WeeklyTrendData {
  const { labels, dateStrings } = getLast7DayLabels()
  const countMap = new Map<string, number>()
  dateStrings.forEach((ds) => countMap.set(ds, 0))

  for (const r of records) {
    if (r.check_in) {
      const d = new Date(r.check_in)
      const ds = getLocalDateStr(d)
      if (countMap.has(ds)) {
        countMap.set(ds, (countMap.get(ds) || 0) + 1)
      }
    }
  }

  return {
    labels,
    data: dateStrings.map((ds) => countMap.get(ds) || 0),
  }
}

export interface ClientPurposeDistribution {
  labels: string[]
  values: ServiceRequired[]
  data: number[]
}

export function computeClientPurposeDistribution(
  records: ClientRecordItem[]
): ClientPurposeDistribution {
  const counts: Record<ServiceRequired, number> = {
    gip: 0,
    spes: 0,
    job_start: 0,
    ofw: 0,
    cea: 0,
    skills: 0,
    others: 0,
  }

  for (const r of records) {
    if (r.purpose && counts[r.purpose] !== undefined) {
      counts[r.purpose]++
    }
  }

  const labels: string[] = []
  const values: ServiceRequired[] = []
  const data: number[] = []

  for (const opt of PURPOSE_OPTIONS) {
    labels.push(opt.shortLabel)
    values.push(opt.value)
    data.push(counts[opt.value])
  }

  return { labels, values, data }
}

export interface GenderDistribution {
  male: number
  female: number
  notSpecified: number
}

export function computeGenderDistribution(
  records: ClientRecordItem[]
): GenderDistribution {
  let male = 0
  let female = 0
  let notSpecified = 0

  for (const r of records) {
    if (r.gender === 'male') male++
    else if (r.gender === 'female') female++
    else notSpecified++
  }

  return { male, female, notSpecified }
}

export function computeTodayClientCount(records: ClientRecordItem[]): number {
  const todayStr = getLocalDateStr(new Date())
  let count = 0

  for (const r of records) {
    if (r.check_in) {
      const d = new Date(r.check_in)
      if (getLocalDateStr(d) === todayStr) {
        count++
      }
    }
  }

  return count
}

// ─── Personnel Analytics ───

export interface PersonnelByPosition {
  labels: string[]
  data: number[]
}

export function computePersonnelByPosition(
  profiles: ProfileRecord[]
): PersonnelByPosition {
  const posMap: Record<string, number> = {
    employee: 0,
    gip: 0,
    tupad: 0,
    client: 0,
  }

  for (const p of profiles) {
    const pos = p.position?.toLowerCase() || 'employee'
    if (posMap[pos] !== undefined) {
      posMap[pos]++
    } else {
      posMap['employee']++
    }
  }

  return {
    labels: ['Employee', 'GIP', 'TUPAD', 'Client'],
    data: [posMap.employee, posMap.gip, posMap.tupad, posMap.client],
  }
}

export interface PersonnelByStatus {
  active: number
  inactive: number
  pending: number
}

export function computePersonnelByStatus(
  profiles: ProfileRecord[]
): PersonnelByStatus {
  let active = 0
  let inactive = 0
  let pending = 0

  for (const p of profiles) {
    switch (p.status) {
      case 'active':
        active++
        break
      case 'inactive':
        inactive++
        break
      case 'pending':
        pending++
        break
    }
  }

  return { active, inactive, pending }
}
