import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { teamService } from '@/services/supervisor/teamService'
import type { TeamMember, TeamOffice, TeamTodayRow, TeamTodaySummary } from '@/types/supervisor/team'
import {
  buildTodayRows,
  formatPositionLabel,
  formatTodayStatusLabel,
  getTodayStatusBadgeClass,
  summarizeToday,
  TEAM_TODAY_STAT_CARDS,
} from '@/helpers/supervisor/teamHelper'
import { getPunchCell, PUNCH_SLOTS } from '@/helpers/beneficiary/myAttendanceHelper'
import { formatLocalDate, formatPunchStatusLabel, getInitials, getPunchStatusBadgeClass } from '@/helpers/peso/attendanceHelper'
import { formatDisplayDateLong } from '@/helpers/common/dateFormatHelper'

/**
 * Supervisor dashboard: today's attendance of the beneficiaries in the supervisor's office, and how many
 * accomplishment reports wait for their review. Read-only.
 */
export function useSupervisorDashboard() {
  const router = useRouter()

  const office = ref<TeamOffice | null>(null)
  const members = ref<TeamMember[]>([])
  const todayRows = ref<TeamTodayRow[]>([])
  const pendingReviews = ref(0)
  const isLoading = ref(false)
  const hasLoaded = ref(false)
  const loadError = ref('')

  const today = ref(formatLocalDate())
  const todayLabel = computed(() => formatDisplayDateLong(today.value))
  const summary = computed<TeamTodaySummary>(() => summarizeToday(todayRows.value))
  const hasOffice = computed(() => office.value !== null)
  const officeLabel = computed(() =>
    office.value ? (office.value.code ? `${office.value.name} (${office.value.code})` : office.value.name) : '',
  )

  const fetchDashboard = async () => {
    isLoading.value = true
    loadError.value = ''
    today.value = formatLocalDate()
    try {
      office.value = await teamService.getMyOffice()
      if (!office.value) {
        members.value = []
        todayRows.value = []
        pendingReviews.value = 0
        return
      }
      const [team, reviews] = await Promise.all([
        teamService.getTeamMembers(office.value.id),
        teamService.getPendingReviewCount(),
      ])
      members.value = team
      pendingReviews.value = reviews
      const records = await teamService.getTeamAttendances(team, today.value)
      todayRows.value = buildTodayRows(
        team,
        records.filter((r) => r.attendanceDate === today.value),
      )
    } catch (err) {
      loadError.value = err instanceof Error ? err.message : 'Failed to load your dashboard.'
    } finally {
      isLoading.value = false
      hasLoaded.value = true
    }
  }

  const openTeamAttendance = () => router.push({ name: 'supervisor-attendance' })
  const openReviews = () => router.push({ name: 'supervisor-accomplishments' })

  onMounted(() => {
    void fetchDashboard()
  })

  return {
    office,
    officeLabel,
    hasOffice,
    todayLabel,
    todayRows,
    summary,
    pendingReviews,
    isLoading,
    hasLoaded,
    loadError,
    fetchDashboard,
    openTeamAttendance,
    openReviews,
    statCards: TEAM_TODAY_STAT_CARDS,
    punchSlots: PUNCH_SLOTS,
    getPunchCell,
    getInitials,
    formatPositionLabel,
    formatTodayStatusLabel,
    getTodayStatusBadgeClass,
    formatPunchStatusLabel,
    getPunchStatusBadgeClass,
  }
}
