import type { Database } from '../database.types'

export type DirectoryRow = Database['public']['Tables']['directories']['Row']
export type DirectoryInsert = Database['public']['Tables']['directories']['Insert']
export type DirectoryUpdate = Database['public']['Tables']['directories']['Update']

export type DirectoryStatus = 'active' | 'inactive'

/** A directory entry as shown in the Add / Edit Office picker. */
export interface DirectoryOption {
  id: string
  officeName: string
  officeCode: string | null
  officeHead: string | null
  /** ID of the office already created from this entry, if any. */
  linkedOfficeId: string | null
}

/** A row of the Directory tab table. */
export interface DirectoryRecord {
  id: string
  officeName: string
  officeCode: string | null
  officeHead: string | null
  status: DirectoryStatus
  createdAt: string
  /** Name of the office created from this entry, if any. */
  linkedOfficeName: string | null
}

export interface DirectoryFormData {
  officeName: string
  officeCode: string
  officeHead: string
  status: DirectoryStatus
}
