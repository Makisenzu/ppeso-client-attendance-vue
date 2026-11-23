import type { Database } from '../database.types'

export type OfficeRow = Database['public']['Tables']['offices']['Row']
export type OfficeInsert = Database['public']['Tables']['offices']['Insert']
export type OfficeUpdate = Database['public']['Tables']['offices']['Update']

export interface OfficeBeneficiary {
  id: string
  fullName: string
  position: Database['public']['Enums']['profile_position']
  role: Database['public']['Enums']['profile_roles'] | null
  status: Database['public']['Enums']['profile_status']
}

export interface OfficeRecord {
  id: string
  name: string
  code: string | null
  /** Directory entry this office was created from. */
  directoryId: string | null
  /** Chief / office head, read live from public.directories. */
  officeHead: string | null
  isActive: boolean
  totalBeneficiaries: number
  beneficiaries?: OfficeBeneficiary[]
  createdAt: string | null
  updatedAt: string | null
}

/** One office for the Office Details page. */
export interface OfficeSummary {
  id: string
  name: string
  code: string | null
  officeHead: string | null
  isActive: boolean
  createdAt: string | null
}

/** A GIP beneficiary assigned to an office (Office Details table). */
export interface OfficeGipRecord {
  id: string
  fullName: string
  /** profiles.avatar_path: profile picture in the private avatars bucket */
  avatarPath: string | null
  status: Database['public']['Enums']['profile_status']
  createdAt: string
}

export interface OfficeFormData {
  id?: string
  directoryId: string | null
  name: string
  code: string
  isActive: boolean
}

export interface OfficeFilterState {
  searchQuery: string
  statusFilter: 'ALL' | 'active' | 'inactive'
}

export interface OfficeStatsSummary {
  total: number
  activeCount: number
  inactiveCount: number
  totalBeneficiaries: number
}
