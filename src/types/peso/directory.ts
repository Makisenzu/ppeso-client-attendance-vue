import type { Database } from '../database.types'

export type DirectoryRow = Database['public']['Tables']['directories']['Row']

/** A directory entry as shown in the Add / Edit Office picker. */
export interface DirectoryOption {
  id: string
  officeName: string
  officeCode: string | null
  officeHead: string | null
  /** ID of the office already created from this entry, if any. */
  linkedOfficeId: string | null
}
