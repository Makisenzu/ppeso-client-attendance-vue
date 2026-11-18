import type { AttendanceStatsSummary } from '@/types/peso/attendance'
import type {
  MyAttendanceRecord,
  MyAttendanceStatusFilter,
  PunchCell,
  PunchSlot,
} from '@/types/beneficiary/myAttendance'
import type { SearchSelectOption } from '@/types/common/searchSelect'
import {
  formatPunchStatusLabel,
  formatTimeDisplay,
  getRecordStatuses,
  isRecordAbsent,
} from '@/helpers/peso/attendanceHelper'
import { formatDisplayDate, formatDisplayDateLong } from '@/helpers/common/dateFormatHelper'

export const MY_STATUS_OPTIONS: SearchSelectOption[] = [
  { value: 'ALL', label: 'All Punch Statuses' },
  { value: 'ontime', label: 'On Time' },
  { value: 'late', label: 'Late' },
  { value: 'early_out', label: 'Early Out' },
  { value: 'absent', label: 'Absent' },
]

export const MY_DATE_OPTIONS: SearchSelectOption[] = [
  { value: 'ALL', label: 'All Dates' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'custom', label: 'Custom Date...' },
]

export const MY_PAGE_SIZE_OPTIONS: SearchSelectOption[] = ['10', '25', '50', '100'].map((value) => ({
  value,
  label: value,
}))

export const PUNCH_SLOTS: { key: PunchSlot; label: string }[] = [
  { key: 'amIn', label: 'AM Check In' },
  { key: 'amOut', label: 'AM Check Out' },
  { key: 'pmIn', label: 'PM Check In' },
  { key: 'pmOut', label: 'PM Check Out' },
]

export interface MyAttendanceStatCard {
  key: MyAttendanceStatusFilter
  stat: keyof AttendanceStatsSummary
  label: string
  hint: string
  /** Number color. Status colors stay in helpers (DESIGN.md §2 rule 5). */
  valueClass: string
  /** Border + ring when the card's filter is on. */
  activeClass: string
  hoverClass: string
}

export const MY_STAT_CARDS: MyAttendanceStatCard[] = [
  {
    key: 'ALL',
    stat: 'total',
    label: 'Total DTR Logs',
    hint: 'All my entries',
    valueClass: 'text-foreground',
    activeClass: 'border-primary ring-2 ring-primary/20 shadow-sm',
    hoverClass: 'hover:border-primary/40',
  },
  {
    key: 'ontime',
    stat: 'onTimeCount',
    label: 'On Time',
    hint: 'Punctual punches',
    valueClass: 'text-emerald-600 dark:text-emerald-400',
    activeClass: 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm',
    hoverClass: 'hover:border-emerald-500/40',
  },
  {
    key: 'late',
    stat: 'lateCount',
    label: 'Late Arrivals',
    hint: 'AM/PM late logs',
    valueClass: 'text-amber-600 dark:text-amber-400',
    activeClass: 'border-amber-500 ring-2 ring-amber-500/20 shadow-sm',
    hoverClass: 'hover:border-amber-500/40',
  },
  {
    key: 'early_out',
    stat: 'earlyOutCount',
    label: 'Early Out',
    hint: 'Early departures',
    valueClass: 'text-orange-600 dark:text-orange-400',
    activeClass: 'border-orange-500 ring-2 ring-orange-500/20 shadow-sm',
    hoverClass: 'hover:border-orange-500/40',
  },
  {
    key: 'absent',
    stat: 'absentCount',
    label: 'Absent',
    hint: 'No attendance logged',
    valueClass: 'text-destructive',
    activeClass: 'border-destructive ring-2 ring-destructive/20 shadow-sm',
    hoverClass: 'hover:border-destructive/40',
  },
]

/** Time and status badge for one punch cell; a day marked absent shows "Absent" in empty cells. */
export function getPunchCell(record: MyAttendanceRecord, slot: PunchSlot): PunchCell {
  const punches: Record<PunchSlot, [string | null, string | null]> = {
    amIn: [record.amCheckIn, record.amInStatus],
    amOut: [record.amCheckOut, record.amOutStatus],
    pmIn: [record.pmCheckIn, record.pmInStatus],
    pmOut: [record.pmCheckOut, record.pmOutStatus],
  }
  const [time, status] = punches[slot]
  if (time) return { time: formatTimeDisplay(time), status }
  if (status) return { time: null, status }
  if (isRecordAbsent(record)) return { time: null, status: 'absent' }
  return { time: null, status: null }
}

/** Search over the date (ISO and MM/DD/YYYY), punch times and punch statuses. */
export function myRecordMatchesSearch(record: MyAttendanceRecord, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  if (record.attendanceDate.toLowerCase().includes(q)) return true
  if (formatDisplayDate(record.attendanceDate).includes(q)) return true
  if (formatDisplayDateLong(record.attendanceDate).toLowerCase().includes(q)) return true
  const statusMatch = getRecordStatuses(record).some(
    (s) => s.includes(q) || formatPunchStatusLabel(s).toLowerCase().includes(q),
  )
  if (statusMatch) return true
  return [record.amCheckIn, record.amCheckOut, record.pmCheckIn, record.pmCheckOut]
    .filter((t): t is string => Boolean(t))
    .some((t) => formatTimeDisplay(t).toLowerCase().includes(q))
}
