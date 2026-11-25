/**
 * Philippine mobile numbers: 11 digits starting with 09, grouped 4-3-4.
 * Stored as digits only (e.g. 09123456789); shown as `0912 345 6789` on the public walk-in form
 * and `0912-345-6789` in admin screens and exports.
 */
export const CONTACT_NUMBER_DIGITS = 11

/** Keeps the digits only, capped at 11. */
export function contactDigits(value: string | null | undefined): string {
  return (value ?? '').replace(/\D/g, '').slice(0, CONTACT_NUMBER_DIGITS)
}

/** True for an 11-digit mobile number starting with 09 (formatting characters ignored). */
export function isValidContactNumber(value: string | null | undefined): boolean {
  return /^09\d{9}$/.test((value ?? '').replace(/\D/g, ''))
}

/** Groups digits 4-3-4 with `separator` as they are typed (partial input allowed). */
export function groupContactNumber(value: string | null | undefined, separator: ' ' | '-'): string {
  const d = contactDigits(value)
  return [d.slice(0, 4), d.slice(4, 7), d.slice(7, 11)].filter(Boolean).join(separator)
}

/** Admin display: `0912-345-6789`. Older records that aren't 11 digits are shown as saved. */
export function formatContactNumber(value: string | null | undefined): string {
  if (!value) return ''
  return isValidContactNumber(value) && value.replace(/\D/g, '').length === CONTACT_NUMBER_DIGITS
    ? groupContactNumber(value, '-')
    : value
}
