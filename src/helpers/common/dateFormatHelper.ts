/**
 * Display-only date formatting: MM/DD/YYYY, and MM/DD/YYYY h:mm AM/PM with time.
 * The database, payloads and date inputs keep ISO values (see .agents/DESIGN.md §3.1).
 */

const pad = (n: number) => String(n).padStart(2, '0')

/** Parses `yyyy-mm-dd` as a local date (not UTC) and anything else with `new Date`. */
function toDate(value: string | Date): Date | null {
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value
  const trimmed = value.trim()
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed)
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(trimmed)
  return isNaN(date.getTime()) ? null : date
}

/** `11/13/2026` */
export function formatDisplayDate(value?: string | Date | null, fallback = '—'): string {
  if (!value) return fallback
  const date = toDate(value)
  if (!date) return fallback
  return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${date.getFullYear()}`
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** `November 13, 2026` — written-out date for places that ask for text instead of numbers. */
export function formatDisplayDateLong(value?: string | Date | null, fallback = '—'): string {
  if (!value) return fallback
  const date = toDate(value)
  if (!date) return fallback
  return `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
}

/** `11/13/2026 2:05 PM` */
export function formatDisplayDateTime(value?: string | Date | null, fallback = '—'): string {
  if (!value) return fallback
  const date = toDate(value)
  if (!date) return fallback
  const hours = date.getHours()
  const hour12 = hours % 12 || 12
  const meridiem = hours < 12 ? 'AM' : 'PM'
  return `${formatDisplayDate(date)} ${hour12}:${pad(date.getMinutes())} ${meridiem}`
}
