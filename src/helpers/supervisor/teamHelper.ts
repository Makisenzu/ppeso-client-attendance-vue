import type { SearchSelectOption } from '@/types/common/searchSelect'
import type {
  TeamAttendanceRecord,
  TeamMember,
  TeamTodayRow,
  TeamTodaySummary,
  TodayStatus,
} from '@/types/supervisor/team'
import { getRecordStatuses, isRecordAbsent } from '@/helpers/peso/attendanceHelper'
import {
  MY_STAT_CARDS,
  myRecordMatchesSearch,
  type MyAttendanceStatCard,
} from '@/helpers/beneficiary/myAttendanceHelper'

/** Stat cards of Team Attendance: the My Attendance cards, worded for a whole office. */
export const TEAM_STAT_CARDS: MyAttendanceStatCard[] = MY_STAT_CARDS.map((card) =>
  card.key === 'ALL' ? { ...card, label: 'Total DTR Logs', hint: 'All team entries' } : card,
)

/** "All team members" + one option per member (with their position as the second line). */
export function buildMemberOptions(members: TeamMember[], includeAll = true): SearchSelectOption[] {
  const options = members.map((m) => ({
    value: m.id,
    label: m.fullName,
    description: formatPositionLabel(m.position),
  }))
  return includeAll ? [{ value: 'ALL', label: 'All Team Members' }, ...options] : options
}

export function formatPositionLabel(position?: string | null): string {
  switch (position) {
    case 'gip':
      return 'GIP'
    case 'tupad':
      return 'TUPAD'
    case 'employee':
      return 'Employee'
    default:
      return position ? position.charAt(0).toUpperCase() + position.slice(1) : '—'
  }
}

/** Search over the member's name plus everything My Attendance searches (date, times, statuses). */
export function teamRecordMatchesSearch(record: TeamAttendanceRecord, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return record.fullName.toLowerCase().includes(q) || myRecordMatchesSearch(record, q)
}

/** Today's standing: no record yet → not in; marked absent → absent; any late punch → late; else present. */
export function getTodayStatus(record: TeamAttendanceRecord | null): TodayStatus {
  if (!record) return 'not_in'
  if (isRecordAbsent(record)) return 'absent'
  if (getRecordStatuses(record).includes('late')) return 'late'
  if (record.amCheckIn || record.pmCheckIn || record.amCheckOut || record.pmCheckOut) return 'present'
  return 'not_in'
}

const TODAY_ORDER: Record<TodayStatus, number> = { late: 0, present: 1, not_in: 2, absent: 3 }

/** One row per active member with today's record (if any); late first, then present, not in, absent. */
export function buildTodayRows(members: TeamMember[], todayRecords: TeamAttendanceRecord[]): TeamTodayRow[] {
  const byMember = new Map(todayRecords.map((r) => [r.profileId, r]))
  return members
    .filter((m) => m.status === 'active')
    .map((member) => {
      const record = byMember.get(member.id) ?? null
      return { member, record, status: getTodayStatus(record) }
    })
    .sort((a, b) => TODAY_ORDER[a.status] - TODAY_ORDER[b.status] || a.member.fullName.localeCompare(b.member.fullName))
}

export function summarizeToday(rows: TeamTodayRow[]): TeamTodaySummary {
  return {
    members: rows.length,
    present: rows.filter((r) => r.status === 'present' || r.status === 'late').length,
    late: rows.filter((r) => r.status === 'late').length,
    notIn: rows.filter((r) => r.status === 'not_in' || r.status === 'absent').length,
  }
}

export function formatTodayStatusLabel(status: TodayStatus): string {
  switch (status) {
    case 'present':
      return 'Present'
    case 'late':
      return 'Late'
    case 'absent':
      return 'Absent'
    default:
      return 'Not In Yet'
  }
}

/** Badge classes for today's status (status colors live in helpers — DESIGN.md §2 rule 5). */
export function getTodayStatusBadgeClass(status: TodayStatus): string {
  switch (status) {
    case 'present':
      return 'bg-success/10 text-success border-success/30'
    case 'late':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
    case 'absent':
      return 'bg-destructive/10 text-destructive border-destructive/30'
    default:
      return 'bg-muted text-muted-foreground border-border'
  }
}

export interface TeamTodayStatCard {
  key: keyof TeamTodaySummary
  label: string
  hint: string
  valueClass: string
}

export const TEAM_TODAY_STAT_CARDS: TeamTodayStatCard[] = [
  { key: 'members', label: 'Team Members', hint: 'Active in your office', valueClass: 'text-foreground' },
  { key: 'present', label: 'Present Today', hint: 'Checked in at the kiosk', valueClass: 'text-success' },
  { key: 'late', label: 'Late Today', hint: 'Late AM or PM check-in', valueClass: 'text-amber-600 dark:text-amber-400' },
  { key: 'notIn', label: 'Not In', hint: 'No check-in or absent', valueClass: 'text-destructive' },
]
