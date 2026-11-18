import type { AttendancePunches } from '@/types/peso/attendance'

/** One of the signed-in user's own daily time records (no profile or office data needed). */
export interface MyAttendanceRecord extends AttendancePunches {
  id: string
  attendanceDate: string
  createdAt: string
}

export type MyAttendanceStatusFilter = 'ALL' | 'ontime' | 'late' | 'early_out' | 'absent'
export type MyAttendanceDateFilter = 'ALL' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom'

export type PunchSlot = 'amIn' | 'amOut' | 'pmIn' | 'pmOut'

/** What a punch cell shows: the formatted time (if punched) and the status badge (if any). */
export interface PunchCell {
  time: string | null
  status: string | null
}
