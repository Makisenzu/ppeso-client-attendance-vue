/** Office kiosks (PACD → Office Kiosks): sign-in accounts for each office's PACD computer (role `kiosk`). */

export interface OfficeKiosk {
  id: string
  /** e.g. "PACD PC 1" (stored as the profile's first name) */
  label: string
  email: string
  officeId: string | null
  officeName: string
  officeCode: string | null
  isActive: boolean
  createdAt: string
}

export interface OfficeKioskFormData {
  officeId: string
  label: string
  email: string
  password: string
}

export interface OfficeKioskFormErrors {
  officeId?: string
  label?: string
  email?: string
  password?: string
  submit?: string
}
