import type { Database } from '../database.types'

export type ProfilePosition = Database['public']['Enums']['profile_position']
export type ProfileStatus = Database['public']['Enums']['profile_status']

export interface ProfileRecord {
  id: string
  firstname: string
  middlename: string | null
  lastname: string
  fullName: string
  position: ProfilePosition
  status: ProfileStatus
  passcode: string
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
