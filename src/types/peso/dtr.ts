import type { ProfileRecord } from './userManagement'
import type { AttendanceRecord } from './attendance'

/** The attendance fields a DTR needs — lets the beneficiary My DTR page reuse the builder. */
export type DtrAttendance = Pick<
  AttendanceRecord,
  'attendanceDate' | 'amCheckIn' | 'amCheckOut' | 'pmCheckIn' | 'pmCheckOut'
>

export interface DtrDayRow {
  day: number
  dateStr: string // YYYY-MM-DD
  dayOfWeek: number // 0 = Sunday, 6 = Saturday
  isSaturday: boolean
  isSunday: boolean
  /** Holiday name in capitals on a weekday with no punches (printed across the row), else null. */
  holidayName: string | null
  isWithinRange: boolean
  amArrival: string
  amDeparture: string
  pmArrival: string
  pmDeparture: string
  undertimeHours: string
  undertimeMinutes: string
}

export interface DtrOptions {
  /** Only the name is printed on the form. */
  employee: Pick<ProfileRecord, 'fullName'> | null
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  monthLabel?: string
  regularHours?: string // e.g. "8:00 AM - 5:00 PM"
  saturdayHours?: string // e.g. ""
  supervisorName?: string // e.g. "PGDH"
  supervisorTitle?: string // e.g. "(PESO Manager)"
  duplicateLayout?: boolean // true = 2 slips side-by-side (Civil Service standard)
  /** Also print the employee's name above the "Name" signature line (My DTR). */
  printSignatureName?: boolean
}

export interface DtrGenerationResult {
  employeeName: string
  monthDisplay: string
  regularHours: string
  saturdayHours: string
  supervisorName: string
  supervisorTitle: string
  /** Name printed above the "Name" signature line; '' leaves the line blank. */
  signatureName: string
  rows: DtrDayRow[]
  activeStartDay: number
  activeEndDay: number
  totalDaysInMonth: number
  totalUndertimeHours: number
  totalUndertimeMinutes: number
}
