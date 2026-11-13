/** A holiday set on the Calendar page (public.holidays). */
export interface HolidayRecord {
  id: string
  /** ISO date, yyyy-mm-dd */
  date: string
  name: string
}

export interface HolidayFormData {
  /** ISO date, yyyy-mm-dd */
  date: string
  name: string
}

/** One cell of the month grid on the Calendar page. */
export interface CalendarDayCell {
  /** ISO date, yyyy-mm-dd */
  date: string
  day: number
  inMonth: boolean
  isToday: boolean
  isWeekend: boolean
  holiday: HolidayRecord | null
}
