import type { Database } from '../database.types'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type AttendanceRow = Database['core']['Tables']['attendances']['Row']
export type AttendanceInsert = Database['core']['Tables']['attendances']['Insert']
export type AttendanceUpdate = Database['core']['Tables']['attendances']['Update']
export type PunchStatus = Database['core']['Enums']['punch_status']

export type PunchType = 'am_in' | 'am_out' | 'pm_in' | 'pm_out'
export type PunchMode = 'auto' | PunchType

/** The person core.record_punch() names in its answer (never their passcode or other profile data). */
export interface KioskPunchProfile {
  id: string
  firstname: string
  middlename: string | null
  lastname: string
  position: string | null
}

export interface AttendanceResult {
  success: boolean
  message: string
  profile?: KioskPunchProfile
  punchType?: PunchType
  status?: PunchStatus
  timestamp?: string
  alreadyRecorded?: boolean
}

/** What core.record_punch() returns (jsonb). */
export interface RecordPunchResponse {
  ok: boolean
  message?: string
  locked?: boolean
  already_recorded?: boolean
  punch_type?: PunchType
  status?: PunchStatus
  timestamp?: string
  profile?: KioskPunchProfile
}

export interface KioskRecentPunch {
  id: string
  profileId: string
  fullName: string
  firstName?: string
  lastName?: string
  position?: string | null
  punchType: PunchType
  status?: PunchStatus | null
  timestamp: string
}