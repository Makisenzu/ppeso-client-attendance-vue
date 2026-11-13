import type { Database } from '../database.types'

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
  passcode: string
  officeId: string | null
  officeName?: string | null
  officeCode?: string | null
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
}

/** Edit User form. Email / password are managed by Supabase Auth and are not editable here. */
export interface EditUserFormData {
  firstname: string
  middlename: string
  lastname: string
  position: ProfilePosition
  /** '' = no role */
  role: ProfileRole | ''
  status: ProfileStatus
  officeId: string
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
