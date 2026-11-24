import type { Database } from '../database.types'
import type { ReportFunding } from '@/types/common/accomplishment'

export type ProfilePosition = Database['public']['Enums']['profile_position']
export type ProfileStatus = Database['public']['Enums']['profile_status']
export type ProfileRole = Database['public']['Enums']['profile_roles']

export interface ProfileRecord {
  id: string
  firstname: string
  middlename: string | null
  lastname: string
  fullName: string
  position: ProfilePosition
  role: ProfileRole | null
  status: ProfileStatus
  /** Kiosk passcode; null for admins and supervisors (they don't use the kiosk). */
  passcode: string | null
  officeId: string | null
  /** GIP / TUPAD funding: decides the accomplishment report form (admin-only). */
  funding: ReportFunding | null
  officeName?: string | null
  officeCode?: string | null
  /** profiles.avatar_path: profile picture in the private avatars bucket */
  avatarPath?: string | null
  createdAt: string
  updatedAt: string | null
}

export interface UserFormData {
  email: string
  password: string
  firstname: string
  middlename: string
  lastname: string
  position: ProfilePosition
  officeId?: string | null
  /** '' = not set */
  funding?: ReportFunding | ''
  /** Overrides the position's default role (Add Supervisor sets 'supervisor'). */
  role?: ProfileRole | null
}

/** Add Supervisor dialog: the office's chief becomes its supervisor account. */
export interface SupervisorFormData {
  officeId: string
  firstname: string
  middlename: string
  lastname: string
  email: string
  password: string
}

/** Edit User form. Email / password are managed by Supabase Auth and are not editable here. */
export interface EditUserFormData {
  /** Sign-in email (auth.users); only sent when the admin changed it */
  email: string
  firstname: string
  middlename: string
  lastname: string
  position: ProfilePosition
  /** '' = no role */
  role: ProfileRole | ''
  status: ProfileStatus
  officeId: string
  /** '' = not set */
  funding: ReportFunding | ''
}

export interface ProfileFilterState {
  searchQuery: string
  positionFilter: string
  statusFilter: string
}

export interface ProfileStatsSummary {
  total: number
  activeCount: number
  inactiveCount: number
  pendingCount: number
}
