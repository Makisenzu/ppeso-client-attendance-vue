import type { ProfilePosition, ProfileStatus } from '@/types/peso/attendance'
import type { MyAttendanceRecord } from '@/types/beneficiary/myAttendance'

/** The supervisor's own office (profiles.office_id → offices). */
export interface TeamOffice {
  id: string
  name: string
  code: string | null
}

/** A beneficiary assigned to the supervisor's office. */
export interface TeamMember {
  id: string
  fullName: string
  position: ProfilePosition
  status: ProfileStatus | null
  /** profiles.avatar_path: profile picture in the private avatars bucket */
  avatarPath: string | null
}

/** One daily time record of a team member (punches + who it belongs to). */
export interface TeamAttendanceRecord extends MyAttendanceRecord {
  profileId: string
  fullName: string
  avatarPath: string | null
  position: ProfilePosition | null
}

/** How a team member stands today on the dashboard. */
export type TodayStatus = 'present' | 'late' | 'absent' | 'not_in'

export interface TeamTodayRow {
  member: TeamMember
  record: TeamAttendanceRecord | null
  status: TodayStatus
}

export interface TeamTodaySummary {
  members: number
  present: number
  late: number
  notIn: number
}

/** One GIP on the supervisor's Accomplishment Reports list, with their report counts. */
export interface TeamGipRow {
  member: TeamMember
  toReview: number
  returned: number
  reviewed: number
  total: number
  /** Period of their latest submitted report ('' when none), and when it was submitted */
  latestPeriodStart: string
  latestPeriodEnd: string
  latestSubmittedAt: string | null
}

export type TeamGipStatusFilter = 'active' | 'inactive' | 'ALL'
