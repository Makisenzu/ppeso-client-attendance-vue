import type { Database } from '../database.types'

export type PunchStatus = Database['core']['Enums']['punch_status']
export type ProfilePosition = Database['public']['Enums']['profile_position']
export type ProfileStatus = Database['public']['Enums']['profile_status']

export interface AttendanceRecord {
  id: string
  profileId: string
  attendanceDate: string

  // Personnel Info (from public.profiles)
  fullName: string
  firstName: string
  lastName: string
  middleName?: string | null
  position?: ProfilePosition | string | null

  // Columns from core.attendances
  amCheckIn: string | null
  amInStatus: PunchStatus | null
  amCheckOut: string | null
  amOutStatus: PunchStatus | null
  pmCheckIn: string | null
  pmInStatus: PunchStatus | null
  pmCheckOut: string | null
  pmOutStatus: PunchStatus | null

  status?: PunchStatus | string | null
  createdAt: string
}

export interface AttendanceStatsSummary {
  total: number
  onTimeCount: number
  lateCount: number
  earlyOutCount: number
  absentCount: number
}

export interface AttendanceFilterState {
  searchQuery: string
  positionFilter: string
  statusFilter: string
  dateFilter: 'ALL' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom'
  customDateFilter?: string
}
