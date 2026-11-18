import type {
  AccomplishmentReport,
  AccomplishmentReportRow,
  ReportActivity,
  ReportDay,
  ReportDayStatus,
  ReportFunding,
  ReportStatus,
} from '@/types/common/accomplishment'
import type { SearchSelectOption } from '@/types/common/searchSelect'
import { formatDisplayDate } from '@/helpers/common/dateFormatHelper'

/**
 * Accomplishment reports: dates, labels and amounts. Pure functions; all dates are ISO yyyy-MM-dd read as the
 * local calendar day (never `new Date('yyyy-mm-dd')`, which parses as UTC).
 */

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WEEKDAYS_LONG = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']

const pad = (n: number) => String(n).padStart(2, '0')

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function todayIso(): string {
  return toIsoDate(new Date())
}

function addDaysIso(iso: string, days: number): string {
  const date = parseIsoDate(iso)
  date.setDate(date.getDate() + days)
  return toIsoDate(date)
}

export const minIso = (a: string, b: string) => (a < b ? a : b)

export function isWeekendIso(iso: string): boolean {
  const day = parseIsoDate(iso).getDay()
  return day === 0 || day === 6
}

/** Every date from `from` to `to`, inclusive */
export function daysBetween(from: string, to: string): string[] {
  const days: string[] = []
  if (!from || !to || to < from) return days
  for (let day = from; day <= to; day = addDaysIso(day, 1)) days.push(day)
  return days
}

/** Monday–Friday dates from `from` to `to`, inclusive */
export function weekdaysBetween(from: string, to: string): string[] {
  return daysBetween(from, to).filter((day) => !isWeekendIso(day))
}

/** The first and last day of `today`'s month (reports may only be created for this month) */
export function currentMonthRange(today = todayIso()): { from: string; to: string } {
  const date = parseIsoDate(today)
  return {
    from: toIsoDate(new Date(date.getFullYear(), date.getMonth(), 1)),
    to: toIsoDate(new Date(date.getFullYear(), date.getMonth() + 1, 0)),
  }
}

/** This half of the month: the 1st–15th, or the 16th–last day */
export function currentHalfMonth(today = todayIso()): { from: string; to: string } {
  const date = parseIsoDate(today)
  const y = date.getFullYear()
  const m = date.getMonth()
  if (date.getDate() <= 15) return { from: toIsoDate(new Date(y, m, 1)), to: toIsoDate(new Date(y, m, 15)) }
  return { from: toIsoDate(new Date(y, m, 16)), to: toIsoDate(new Date(y, m + 1, 0)) }
}

// ─── Display ───

/** A report's dates in words for tables and lists: "November 1-15, 2026" (DESIGN.md §3.1) */
export function formatPeriodRange(from: string, to: string): string {
  return formatReportPeriod(from, to)
}

/** "Mon 11/03/2026" */
export function formatWeekday(iso: string): string {
  return `${WEEKDAYS_SHORT[parseIsoDate(iso).getDay()]} ${formatDisplayDate(iso, iso)}`
}

/** "SATURDAY" */
export function weekdayName(iso: string): string {
  return WEEKDAYS_LONG[parseIsoDate(iso).getDay()]
}

/**
 * The period as the official forms print it: "August 1-15, 2026"; across months "October 28 - November 5, 2026";
 * across years "December 29, 2026 - January 9, 2027"; a single day "August 15, 2026".
 */
export function formatReportPeriod(from: string, to: string): string {
  const s = parseIsoDate(from)
  const e = parseIsoDate(to)
  const long = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
  if (from === to) return long(s)
  if (s.getFullYear() !== e.getFullYear()) return `${long(s)} - ${long(e)}`
  if (s.getMonth() !== e.getMonth()) return `${MONTHS[s.getMonth()]} ${s.getDate()} - ${long(e)}`
  return `${MONTHS[s.getMonth()]} ${s.getDate()}-${e.getDate()}, ${s.getFullYear()}`
}

/** "August 1 TO 15 2026", as the PGAS payment receipt words it */
export function formatReceiptPeriod(from: string, to: string): string {
  const s = parseIsoDate(from)
  const e = parseIsoDate(to)
  const long = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getDate()} ${d.getFullYear()}`
  if (from === to) return long(s)
  if (s.getFullYear() !== e.getFullYear()) return `${long(s)} TO ${long(e)}`
  if (s.getMonth() !== e.getMonth()) return `${MONTHS[s.getMonth()]} ${s.getDate()} TO ${long(e)}`
  return `${MONTHS[s.getMonth()]} ${s.getDate()} TO ${e.getDate()} ${s.getFullYear()}`
}

/** "AUGUST 3, 2026" (the DOLE form's date column) */
export function formatLongDate(iso: string): string {
  const d = parseIsoDate(iso)
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`.toUpperCase()
}

/** One accomplishment per line → bullet items */
export function bulletLines(text: string | null | undefined): string[] {
  return (text ?? '')
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*•➢]\s*)?/, '').trim())
    .filter(Boolean)
}

export function fundingFormTitle(funding: ReportFunding): string {
  return funding === 'DOLE' ? 'GIP Work Accomplishment Report' : 'Accomplishment Report'
}

// ─── Badges (status colors live here, never in components — DESIGN.md §2 rule 5) ───

export function getReportStatusBadgeClass(status: ReportStatus | string): string {
  switch (status) {
    case 'Submitted':
      return 'bg-primary/10 text-primary border-primary/30'
    case 'Reviewed':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
    case 'Returned':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
    default:
      return 'bg-muted text-muted-foreground border-border'
  }
}

export function getReportDayBadgeClass(status: ReportDayStatus): string {
  switch (status) {
    case 'Holiday':
      return 'bg-primary/10 text-primary border-primary/30'
    case 'Leave':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
    default:
      return 'border-border text-foreground'
  }
}

// ─── Filter options ───

export const REPORT_STATUS_FILTER_OPTIONS: SearchSelectOption[] = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'Draft', label: 'Draft' },
  { value: 'Submitted', label: 'Submitted' },
  { value: 'Returned', label: 'Returned' },
  { value: 'Reviewed', label: 'Reviewed' },
]

export const REVIEW_STATUS_FILTER_OPTIONS: SearchSelectOption[] = REPORT_STATUS_FILTER_OPTIONS.filter(
  (option) => option.value !== 'Draft',
)

export const REPORT_FUNDING_FILTER_OPTIONS: SearchSelectOption[] = [
  { value: 'ALL', label: 'All Forms' },
  { value: 'DOLE', label: 'DOLE' },
  { value: 'PGAS', label: 'PGAS' },
]

// ─── Rows → screen records ───

function asDays(value: unknown): ReportDay[] {
  return Array.isArray(value) ? (value as ReportDay[]) : []
}

function asActivities(value: unknown): ReportActivity[] {
  return Array.isArray(value) ? (value as ReportActivity[]) : []
}

export function toAccomplishmentReport(row: AccomplishmentReportRow): AccomplishmentReport {
  return {
    id: row.id,
    profileId: row.profile_id,
    funding: row.funding as ReportFunding,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    dailyEntries: asDays(row.daily_entries),
    activities: asActivities(row.activities),
    designation: row.designation,
    supervisorName: row.supervisor_name,
    approverName: row.approver_name,
    approverPosition: row.approver_position,
    amount: row.amount,
    amountInWords: row.amount_in_words,
    status: row.status as ReportStatus,
    reviewRemarks: row.review_remarks,
    reviewedAt: row.reviewed_at,
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// ─── Amounts (PGAS payment receipt) ───

const ONES = [
  '', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN',
  'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN',
]
const TENS = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY']
const SCALES = [
  { value: 1_000_000_000, label: 'BILLION' },
  { value: 1_000_000, label: 'MILLION' },
  { value: 1_000, label: 'THOUSAND' },
]

function belowThousand(n: number): string {
  const parts: string[] = []
  const hundreds = Math.floor(n / 100)
  const rest = n % 100
  if (hundreds) parts.push(`${ONES[hundreds]} HUNDRED`)
  if (rest >= 20) parts.push(rest % 10 ? `${TENS[Math.floor(rest / 10)]}-${ONES[rest % 10]}` : TENS[Math.floor(rest / 10)])
  else if (rest) parts.push(ONES[rest])
  return parts.join(' ')
}

function integerInWords(value: number): string {
  let n = Math.floor(Math.abs(value))
  if (n === 0) return 'ZERO'
  const groups: string[] = []
  for (const scale of SCALES) {
    if (n >= scale.value) {
      groups.push(`${belowThousand(Math.floor(n / scale.value))} ${scale.label}`)
      n %= scale.value
    }
  }
  if (n) groups.push(belowThousand(n))
  return groups.join(', ')
}

function toAmountNumber(amount: number | string | null | undefined): number | null {
  const value = typeof amount === 'string' ? Number(amount.replace(/,/g, '').trim() || NaN) : amount
  return value == null || !Number.isFinite(value) ? null : value
}

/** "FIVE THOUSAND, THREE HUNDRED PESOS ONLY"; empty when the amount is not a positive number */
export function pesoAmountInWords(amount: number | string | null | undefined): string {
  const value = toAmountNumber(amount)
  if (value == null || value <= 0) return ''
  const cents = Math.round(value * 100)
  const pesos = Math.floor(cents / 100)
  const centavos = cents % 100
  const pesoPart = pesos ? `${integerInWords(pesos)} ${pesos === 1 ? 'PESO' : 'PESOS'}` : ''
  const centavoPart = centavos ? `${integerInWords(centavos)} ${centavos === 1 ? 'CENTAVO' : 'CENTAVOS'}` : ''
  return `${[pesoPart, centavoPart].filter(Boolean).join(' AND ')} ONLY`
}

/** "5,300.00" */
export function formatPesoAmount(amount: number | string | null | undefined): string {
  const value = toAmountNumber(amount)
  if (value == null) return ''
  return value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function parseAmount(text: string): number | null {
  return text.trim() ? toAmountNumber(text) : null
}
