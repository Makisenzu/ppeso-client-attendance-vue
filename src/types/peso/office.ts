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
  isActive: boolean
  totalBeneficiaries: number
  beneficiaries?: OfficeBeneficiary[]
  createdAt: string | null
  updatedAt: string | null
}

export interface OfficeFormData {
  id?: string
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
