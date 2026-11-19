import type { OfficeKiosk, OfficeKioskFormData, OfficeKioskFormErrors } from '@/types/peso/officeKiosk'

export const KIOSK_LABEL_MAX = 60
export const KIOSK_PASSWORD_MIN = 8
/** Pre-filled on Add Kiosk; the admin can change it */
export const KIOSK_DEFAULT_PASSWORD = '12345678'
export const KIOSK_EMAIL_DOMAIN = 'peso.ph'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** The next default computer name for an office: "PACD PC 1", "PACD PC 2", … */
export function suggestKioskLabel(existingForOffice: number): string {
  return `PACD PC ${existingForOffice + 1}`
}

/**
 * Sign-in email from the office code: "<code>.kiosk@peso.ph" (e.g. "pimo.kiosk@peso.ph"). A second kiosk of the same
 * office gets a number ("pimo.kiosk2@peso.ph") so emails never clash. Offices without a code use their name.
 */
export function suggestKioskEmail(officeCode: string | null, officeName: string, takenEmails: string[]): string {
  const base =
    (officeCode || officeName)
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '')
      .slice(0, 30) || 'office'
  const taken = new Set(takenEmails.map((e) => e.toLowerCase()))
  let n = 1
  let email = `${base}.kiosk@${KIOSK_EMAIL_DOMAIN}`
  while (taken.has(email)) {
    n++
    email = `${base}.kiosk${n}@${KIOSK_EMAIL_DOMAIN}`
  }
  return email
}

export function validateKioskForm(form: OfficeKioskFormData): OfficeKioskFormErrors {
  const errors: OfficeKioskFormErrors = {}
  if (!form.officeId) errors.officeId = 'Choose the office this computer belongs to.'
  const label = form.label.trim()
  if (!label) errors.label = 'Enter a name for this computer, e.g. "PACD PC 1".'
  else if (label.length > KIOSK_LABEL_MAX) errors.label = `Keep the name under ${KIOSK_LABEL_MAX} characters.`
  if (!EMAIL_PATTERN.test(form.email.trim())) errors.email = 'Enter a valid email address for signing in.'
  if (form.password.length < KIOSK_PASSWORD_MIN) {
    errors.password = `Use at least ${KIOSK_PASSWORD_MIN} characters.`
  }
  return errors
}

export function kioskMatches(kiosk: OfficeKiosk, query: string, status: string): boolean {
  if (status === 'active' && !kiosk.isActive) return false
  if (status === 'inactive' && kiosk.isActive) return false
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    kiosk.officeName.toLowerCase().includes(q) ||
    (kiosk.officeCode ?? '').toLowerCase().includes(q) ||
    kiosk.label.toLowerCase().includes(q) ||
    kiosk.email.toLowerCase().includes(q)
  )
}

export const KIOSK_STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Disabled' },
]
