import type { PunchStatus } from '@/types/peso/attendance'

/** The signed-in beneficiary's greeting and office, for the dashboard header */
export interface MyDashboardProfile {
  firstName: string
  officeName: string | null
}

/** One punch on the Today card */
export interface MyTodayPunch {
  key: string
  label: string
  time: string | null
  status: PunchStatus | null
}

/** A holiday or special day coming up (next 30 days) */
export interface MyUpcomingDay {
  /** ISO date, yyyy-mm-dd */
  date: string
  label: string
  kind: 'holiday' | 'special'
  note: string | null
}

/** How one recent day reads on the streak card */
export type MyStreakDayState = 'ontime' | 'late' | 'absent' | 'pending'

/** One recent day on the streak card */
export interface MyStreakDay {
  /** ISO date, yyyy-mm-dd */
  date: string
  state: MyStreakDayState
}
