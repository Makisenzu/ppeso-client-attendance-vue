import type { HolidayRecord } from '@/types/peso/holiday'
import type { SpecialDay, SpecialDayType } from '@/types/common/specialDay'

/** Special day types in the order the Fix DTR form lists them */
export const SPECIAL_DAY_OPTIONS: { value: SpecialDayType; label: string }[] = [
  { value: 'office_activity', label: 'Office Activity' },
  { value: 'official_business', label: 'Official Business / Travel' },
  { value: 'training', label: 'Training / Seminar' },
  { value: 'leave', label: 'Leave' },
]

export function formatSpecialDayLabel(type: SpecialDayType): string {
  return SPECIAL_DAY_OPTIONS.find((o) => o.value === type)?.label ?? 'Special Day'
}

/** One special day per date: the person's own wins over their office's (the service lists their own first) */
export function specialDaysByDate(specialDays: SpecialDay[]): Map<string, SpecialDay> {
  const byDate = new Map<string, SpecialDay>()
  for (const day of specialDays) if (!byDate.has(day.date)) byDate.set(day.date, day)
  return byDate
}

/**
 * Holidays plus special days for the printed DTR: a special day prints its label across the row exactly like a
 * holiday (dtrHelper), and replaces a holiday on the same date.
 */
export function withSpecialDays(holidays: HolidayRecord[], specialDays: SpecialDay[]): HolidayRecord[] {
  const special = specialDaysByDate(specialDays)
  return [
    ...holidays.filter((h) => !special.has(h.date)),
    ...[...special.values()].map((s) => ({ id: s.id, date: s.date, name: formatSpecialDayLabel(s.dayType) })),
  ]
}
