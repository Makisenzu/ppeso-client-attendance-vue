import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { TransitionPresets, usePreferredReducedMotion, useTransition } from '@vueuse/core'
import { myAttendanceService } from '@/services/beneficiary/myAttendanceService'
import { myAccomplishmentService } from '@/services/beneficiary/myAccomplishmentService'
import { myDashboardService } from '@/services/beneficiary/myDashboardService'
import { specialDayService } from '@/services/common/specialDayService'
// Holidays are readable by every signed-in user (RLS "holidays: authenticated read").
import { holidayService } from '@/services/peso/holidayService'
import { formatDisplayDateLong } from '@/helpers/common/dateFormatHelper'
import { formatSpecialDayLabel, specialDaysByDate } from '@/helpers/common/specialDayHelper'
import { getReportStatusBadgeClass } from '@/helpers/common/accomplishmentHelper'
import {
  computeAttendanceStats,
  formatPunchStatusLabel,
  formatTimeDisplay,
  getPunchStatusBadgeClass,
  getWeekdayShort,
  isRecordAbsent,
  manilaToday,
} from '@/helpers/peso/attendanceHelper'
import type { MyAttendanceRecord } from '@/types/beneficiary/myAttendance'
import type {
  MyDashboardProfile,
  MyStreakDay,
  MyStreakDayState,
  MyTodayPunch,
  MyUpcomingDay,
} from '@/types/beneficiary/myDashboard'
import type { AccomplishmentReport } from '@/types/common/accomplishment'
import type { HolidayRecord } from '@/types/peso/holiday'
import type { SpecialDay } from '@/types/common/specialDay'

const RECENT_COUNT = 5
const UPCOMING_DAYS = 30
const STREAK_DAYS = 14
/** Streak goals the progress bar counts toward, in working days */
const STREAK_MILESTONES = [3, 5, 10, 15, 20, 30, 50, 75, 100, 150, 200, 300]
/** Friendly names for streak lengths (first match from the top wins) */
const STREAK_TIERS = [
  { min: 50, label: 'Legendary' },
  { min: 20, label: 'Unstoppable' },
  { min: 10, label: 'Blazing' },
  { min: 5, label: 'On fire' },
  { min: 3, label: 'Warming up' },
  { min: 1, label: 'Spark' },
]

/** yyyy-mm-dd plus n days (calendar dates, no time zone involved) */
function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  const next = new Date(y, m - 1, d + days)
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`
}

/**
 * Beneficiary dashboard: today's punches, this month's attendance, this month's accomplishment report,
 * upcoming holidays / special days and the latest records. Read-only, the user's own data only (RLS).
 */
export function useMyDashboard() {
  const router = useRouter()

  const today = manilaToday()
  const monthPrefix = today.slice(0, 7)
  const todayLabel = `${formatDisplayDateLong(today)} · ${getWeekdayShort(today)}`

  const profile = ref<MyDashboardProfile | null>(null)
  const records = ref<MyAttendanceRecord[]>([])
  const reports = ref<AccomplishmentReport[]>([])
  const holidays = ref<HolidayRecord[]>([])
  const specialDays = ref<SpecialDay[]>([])
  const isLoading = ref(false)
  const hasLoaded = ref(false)
  const loadError = ref('')

  const fetchDashboard = async () => {
    isLoading.value = true
    loadError.value = ''
    const until = addDays(today, UPCOMING_DAYS)
    try {
      const [me, mine, myReports, upcomingHolidays, mySpecialDays] = await Promise.all([
        myDashboardService.getMyProfile(),
        myAttendanceService.getMyAttendances(),
        myAccomplishmentService.getMyReports(),
        holidayService.getHolidaysInRange(today, until).catch(() => []),
        specialDayService.getForProfile(null, today, until).catch(() => []),
      ])
      profile.value = me
      records.value = mine
      reports.value = myReports
      holidays.value = upcomingHolidays
      specialDays.value = mySpecialDays
      hasLoaded.value = true
    } catch (err) {
      loadError.value = err instanceof Error ? err.message : 'Failed to load your dashboard.'
    } finally {
      isLoading.value = false
    }
  }

  const greeting = computed(() => (profile.value?.firstName ? `Hi, ${profile.value.firstName}` : 'Dashboard'))
  const officeLabel = computed(() => profile.value?.officeName ?? '')

  // ─── Today ───
  const todayRecord = computed(() => records.value.find((r) => r.attendanceDate === today) ?? null)
  const todayPunches = computed<MyTodayPunch[]>(() => {
    const r = todayRecord.value
    const absentDay = r ? isRecordAbsent(r) : false
    const slot = (key: string, label: string, time: string | null | undefined, status: MyTodayPunch['status'] | undefined) => ({
      key,
      label,
      time: time ? formatTimeDisplay(time) : null,
      status: time ? (status ?? null) : (status ?? (absentDay ? 'absent' : null)),
    })
    return [
      slot('amIn', 'AM Check In', r?.amCheckIn, r?.amInStatus),
      slot('amOut', 'AM Check Out', r?.amCheckOut, r?.amOutStatus),
      slot('pmIn', 'PM Check In', r?.pmCheckIn, r?.pmInStatus),
      slot('pmOut', 'PM Check Out', r?.pmCheckOut, r?.pmOutStatus),
    ]
  })
  /** Today's special day or holiday, if any (a special day wins, as on the DTR) */
  const todayNotice = computed(() => {
    const special = specialDaysByDate(specialDays.value).get(today)
    if (special) return { label: formatSpecialDayLabel(special.dayType), note: special.note, isOffice: special.isOffice }
    const holiday = holidays.value.find((h) => h.date === today)
    return holiday ? { label: holiday.name, note: null, isOffice: false } : null
  })

  // ─── This month ───
  const monthRecords = computed(() => records.value.filter((r) => r.attendanceDate.startsWith(monthPrefix)))
  const monthStats = computed(() => computeAttendanceStats(monthRecords.value))
  const daysPresent = computed(() => monthRecords.value.filter((r) => r.amCheckIn || r.pmCheckIn).length)
  const statCards = computed(() => [
    { key: 'present', label: 'Days Present', value: daysPresent.value, hint: 'With at least one check-in', valueClass: 'text-foreground' },
    { key: 'ontime', label: 'On Time', value: monthStats.value.onTimeCount, hint: 'Days with an on-time punch', valueClass: 'text-emerald-600 dark:text-emerald-400' },
    { key: 'late', label: 'Late', value: monthStats.value.lateCount, hint: 'Days with a late check-in', valueClass: 'text-amber-600 dark:text-amber-400' },
    { key: 'early', label: 'Early Out', value: monthStats.value.earlyOutCount, hint: 'Days with an early check-out', valueClass: 'text-orange-600 dark:text-orange-400' },
    { key: 'absent', label: 'Absent', value: monthStats.value.absentCount, hint: 'Days marked absent', valueClass: 'text-rose-600 dark:text-rose-400' },
  ])
  const monthLabel = computed(() => formatDisplayDateLong(`${monthPrefix}-01`).replace(/ \d+,/, ''))

  // ─── Attendance streak ───
  // Walks the user's own records (one per working day; absent days have a record too). A day with a check-in
  // keeps the streak going; a day without one breaks it. Today only counts once punched, so an early visit
  // never shows a broken streak.
  const isPresent = (r: MyAttendanceRecord) => Boolean(r.amCheckIn || r.pmCheckIn)
  const streakRecords = computed(() => records.value.filter((r) => r.attendanceDate < today || isPresent(r)))
  const currentStreak = computed(() => {
    let count = 0
    for (const r of streakRecords.value) {
      if (!isPresent(r)) break
      count++
    }
    return count
  })
  const bestStreak = computed(() => {
    let best = 0
    let run = 0
    for (const r of streakRecords.value) {
      run = isPresent(r) ? run + 1 : 0
      best = Math.max(best, run)
    }
    return best
  })
  const streakDays = computed<MyStreakDay[]>(() => {
    const latest = records.value.slice(0, STREAK_DAYS).reverse()
    return latest.map((r) => {
      let state: MyStreakDayState = 'absent'
      if (isPresent(r)) {
        const late = [r.amInStatus, r.pmInStatus].includes('late')
        state = late ? 'late' : 'ontime'
      } else if (r.attendanceDate === today) {
        state = 'pending'
      }
      return { date: r.attendanceDate, state }
    })
  })
  const streakDayStyles: Record<MyStreakDayState, { label: string; class: string }> = {
    ontime: { label: 'On time', class: 'bg-emerald-500 border-emerald-500 dark:bg-emerald-400 dark:border-emerald-400' },
    late: { label: 'Late', class: 'bg-amber-500 border-amber-500 dark:bg-amber-400 dark:border-amber-400' },
    absent: { label: 'Absent', class: 'bg-rose-500/20 border-rose-500/50 dark:bg-rose-400/20 dark:border-rose-400/50' },
    pending: { label: 'Not yet punched', class: 'border-dashed border-muted-foreground/50 bg-transparent' },
  }
  const streakDayStyle = (state: MyStreakDayState) => streakDayStyles[state]
  const streakMessage = computed(() => {
    if (currentStreak.value === 0) return 'Check in on your next working day to start a streak.'
    if (currentStreak.value >= bestStreak.value && currentStreak.value > 1) return "That's your best streak yet. Keep it going!"
    return 'Every working day you check in keeps the streak alive.'
  })
  const isNewBest = computed(() => currentStreak.value > 1 && currentStreak.value >= bestStreak.value)
  const streakTier = computed(() => STREAK_TIERS.find((t) => currentStreak.value >= t.min)?.label ?? 'Resting')
  const nextMilestone = computed(
    () => STREAK_MILESTONES.find((m) => m > currentStreak.value) ?? currentStreak.value + 100,
  )
  const daysToMilestone = computed(() => nextMilestone.value - currentStreak.value)

  // Count-up and bar fill on load; instant when the user prefers reduced motion.
  const reducedMotion = usePreferredReducedMotion()
  const streakSource = computed(() => (hasLoaded.value ? currentStreak.value : 0))
  const animatedStreak = useTransition(streakSource, {
    duration: 1200,
    delay: 250,
    easing: TransitionPresets.easeOutCubic,
    disabled: computed(() => reducedMotion.value === 'reduce'),
  })
  const displayStreak = computed(() => Math.round(animatedStreak.value))
  const milestoneProgressStyle = computed(() => {
    const previous = [...STREAK_MILESTONES].reverse().find((m) => m <= currentStreak.value) ?? 0
    const span = nextMilestone.value - previous
    const pct = span > 0 ? ((animatedStreak.value - previous) / span) * 100 : 0
    return { width: `${Math.min(100, Math.max(0, pct))}%` }
  })
  /** Staggers the day squares' pop-in */
  const streakDayDelayStyle = (index: number) => ({ animationDelay: `${300 + index * 45}ms` })

  // ─── This month's accomplishment report ───
  const monthReport = computed(
    () => reports.value.find((r) => r.periodStart <= today && r.periodEnd >= today)
      ?? reports.value.find((r) => r.periodStart.startsWith(monthPrefix))
      ?? null,
  )
  const openReport = () => {
    if (monthReport.value) router.push({ name: 'beneficiary-accomplishment', params: { id: monthReport.value.id } })
    else router.push({ name: 'beneficiary-accomplishment-new' })
  }

  // ─── Coming up (after today) ───
  const upcomingDays = computed<MyUpcomingDay[]>(() => {
    const special = specialDaysByDate(specialDays.value)
    const days: MyUpcomingDay[] = [...special.values()]
      .filter((s) => s.date > today)
      .map((s) => ({ date: s.date, label: formatSpecialDayLabel(s.dayType) + (s.isOffice ? ' · Office' : ''), kind: 'special', note: s.note }))
    for (const h of holidays.value) {
      if (h.date > today && !special.has(h.date)) days.push({ date: h.date, label: h.name, kind: 'holiday', note: null })
    }
    return days.sort((a, b) => a.date.localeCompare(b.date))
  })

  // ─── Recent attendance ───
  const recentRecords = computed(() => records.value.slice(0, RECENT_COUNT))
  /** A record's four punches for the Recent table (missing punch on an absent day reads as absent) */
  const recordPunches = (r: MyAttendanceRecord) => {
    const absentDay = isRecordAbsent(r)
    const cell = (key: string, time: string | null, status: MyTodayPunch['status']) => ({
      key,
      time: time ? formatTimeDisplay(time) : null,
      status: time ? status : (status ?? (absentDay ? 'absent' : null)),
    })
    return [
      cell('amIn', r.amCheckIn, r.amInStatus),
      cell('amOut', r.amCheckOut, r.amOutStatus),
      cell('pmIn', r.pmCheckIn, r.pmInStatus),
      cell('pmOut', r.pmCheckOut, r.pmOutStatus),
    ]
  }

  const openAttendance = () => router.push({ name: 'beneficiary-attendance' })
  const openDtr = () => router.push({ name: 'beneficiary-dtr' })

  onMounted(fetchDashboard)

  return {
    todayLabel,
    greeting,
    officeLabel,
    isLoading,
    hasLoaded,
    loadError,
    fetchDashboard,
    todayRecord,
    todayPunches,
    todayNotice,
    statCards,
    currentStreak,
    bestStreak,
    streakDays,
    streakMessage,
    streakDayStyle,
    streakDayDelayStyle,
    isNewBest,
    streakTier,
    nextMilestone,
    daysToMilestone,
    displayStreak,
    milestoneProgressStyle,
    monthLabel,
    monthReport,
    openReport,
    upcomingDays,
    recentRecords,
    recordPunches,
    openAttendance,
    openDtr,
    formatDisplayDateLong,
    getWeekdayShort,
    formatPunchStatusLabel,
    getPunchStatusBadgeClass,
    getReportStatusBadgeClass,
  }
}
