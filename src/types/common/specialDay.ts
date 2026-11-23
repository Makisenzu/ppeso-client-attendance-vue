import type { Database } from '@/types/database.types'

export type SpecialDayType = Database['core']['Enums']['special_day_type']

/** A special day (core.special_days) that applies to one person, directly or through their office */
export interface SpecialDay {
  id: string
  /** ISO date, yyyy-mm-dd */
  date: string
  dayType: SpecialDayType
  note: string | null
  /** Set for the whole office (true) or for this person only (false) */
  isOffice: boolean
}

export type SpecialDayScope = 'beneficiary' | 'office'
