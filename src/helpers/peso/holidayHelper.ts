import type { CalendarDayCell, HolidayRecord } from '@/types/peso/holiday'

const pad = (n: number) => String(n).padStart(2, '0')

/** ISO yyyy-mm-dd for a local date. */
export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Holidays keyed by ISO date, for quick lookups. */
export function toHolidayMap(holidays: HolidayRecord[]): Map<string, HolidayRecord> {
  return new Map(holidays.map((h) => [h.date, h]))
}

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** "November 2026" */
export function formatMonthTitle(year: number, monthIndex: number): string {
  return new Date(year, monthIndex, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

/** "Friday" for an ISO date (parsed as a local date). */
export function formatWeekday(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long' })
}

/**
 * Six-week grid (42 cells, Sunday first) for a month, with the days of the neighbouring
 * months filling the first and last rows.
 */
export function buildMonthGrid(
  year: number,
  monthIndex: number,
  holidaysByDate: Map<string, HolidayRecord>,
  today: Date = new Date(),
): CalendarDayCell[] {
  const first = new Date(year, monthIndex, 1)
  const gridStart = new Date(year, monthIndex, 1 - first.getDay())
  const todayIso = toIsoDate(today)

  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i)
    const iso = toIsoDate(date)
    const weekday = date.getDay()
    return {
      date: iso,
      day: date.getDate(),
      inMonth: date.getMonth() === monthIndex,
      isToday: iso === todayIso,
      isWeekend: weekday === 0 || weekday === 6,
      holiday: holidaysByDate.get(iso) ?? null,
    }
  })
}
