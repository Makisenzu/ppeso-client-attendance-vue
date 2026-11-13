import type { Database } from '../database.types'

type Enums = Database['public']['Enums']

/** The signed-in user's own account, for the Account page (every role). */
export interface MyAccount {
  id: string
  email: string
  emailVerified: boolean
  firstname: string
  middlename: string | null
  lastname: string
  position: Enums['profile_position']
  role: Enums['profile_roles'] | null
  status: Enums['profile_status']
  /** Kiosk passcode; null for admins and supervisors. */
  passcode: string | null
  officeName: string | null
  officeCode: string | null
  createdAt: string
  updatedAt: string | null
}

/** Fields a user may change on their own profile (RLS + trg_guard_profile_update). */
export interface MyNameFormData {
  firstname: string
  middlename: string
  lastname: string
}

export interface ChangePasswordFormData {
  newPassword: string
  confirmPassword: string
}
