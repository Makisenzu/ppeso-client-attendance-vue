import type { Database } from '../database.types'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type AttendanceRow = Database['core']['Tables']['attendances']['Row']
export type AttendanceInsert = Database['core']['Tables']['attendances']['Insert']
export type AttendanceUpdate = Database['core']['Tables']['attendances']['Update']
export type PunchStatus = Database['core']['Enums']['punch_status']

export type PunchType = 'am_in' | 'am_out' | 'pm_in' | 'pm_out'
export type PunchMode = 'auto' | PunchType

export interface AttendanceResult {
  success: boolean
  message: string
  profile?: Profile
  punchType?: PunchType
  status?: PunchStatus
  timestamp?: string
  existingRecord?: AttendanceRow | null
}