import type { ProfileRecord } from './userManagement'

export interface DtrDayRow {
  day: number
  dateStr: string // YYYY-MM-DD
  dayOfWeek: number // 0 = Sunday, 6 = Saturday
  isSaturday: boolean
  isSunday: boolean
  isWithinRange: boolean
  amArrival: string
  amDeparture: string
  pmArrival: string
  pmDeparture: string
  undertimeHours: string
  undertimeMinutes: string
}

export interface DtrOptions {
  employee: ProfileRecord | null
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  monthLabel?: string
  regularHours?: string // e.g. "8:00 AM - 5:00 PM"
  saturdayHours?: string // e.g. ""
  supervisorName?: string // e.g. "PGDH"
  supervisorTitle?: string // e.g. "(PESO Manager)"
  duplicateLayout?: boolean // true = 2 slips side-by-side (Civil Service standard)
}

export interface DtrGenerationResult {
  employeeName: string
  monthDisplay: string
  regularHours: string
  saturdayHours: string
  supervisorName: string
  supervisorTitle: string
  rows: DtrDayRow[]
  activeStartDay: number
  activeEndDay: number
  totalDaysInMonth: number
  totalUndertimeHours: number
  totalUndertimeMinutes: number
}
