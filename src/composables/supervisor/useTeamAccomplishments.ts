import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { teamService } from '@/services/supervisor/teamService'
import { accomplishmentReviewService } from '@/services/common/accomplishmentReviewService'
import type { TeamGipRow, TeamGipStatusFilter, TeamOffice } from '@/types/supervisor/team'
import {
  buildGipRows,
  formatMemberStatusLabel,
  getMemberStatusBadgeClass,
  GIP_STATUS_OPTIONS,
  gipRowMatches,
} from '@/helpers/supervisor/teamHelper'
import { getInitials } from '@/helpers/peso/attendanceHelper'
import { formatPeriodRange } from '@/helpers/common/accomplishmentHelper'
import { formatDisplayDateLong } from '@/helpers/common/dateFormatHelper'
import { useToastAlert } from '@/composables/common/useToastAlert'

/**
 * Accomplishment Reports (supervisor): the GIPs assigned to the supervisor's office, each with their report
 * counts; View opens that person's reports. Read-only list — people aren't deleted here (DESIGN.md §11.1).
 */
export function useTeamAccomplishments() {
  const toast = useToastAlert()
  const router = useRouter()

  const office = ref<TeamOffice | null>(null)
  const rows = ref<TeamGipRow[]>([])
  const isLoading = ref(false)
  const hasLoaded = ref(false)

  const searchQuery = ref('')
  const statusFilter = ref<TeamGipStatusFilter>('active')

  const hasOffice = computed(() => office.value !== null)
  const officeLabel = computed(() =>
    office.value ? (office.value.code ? `${office.value.name} (${office.value.code})` : office.value.name) : '',
  )

  const fetchGips = async () => {
    isLoading.value = true
    try {
      office.value = await teamService.getMyOffice()
      if (!office.value) {
        rows.value = []
        return
      }
      const [members, reports] = await Promise.all([
        teamService.getTeamMembers(office.value.id),
        accomplishmentReviewService.getReports(),
      ])
      rows.value = buildGipRows(members, reports)
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Failed to load the GIPs in your office.', 'error')
    } finally {
      isLoading.value = false
      hasLoaded.value = true
    }
  }

  const filteredRows = computed(() => rows.value.filter((row) => gipRowMatches(row, searchQuery.value, statusFilter.value)))
  const hasActiveFilters = computed(() => searchQuery.value.trim() !== '' || statusFilter.value !== 'active')
  const resetFilters = () => {
    searchQuery.value = ''
    statusFilter.value = 'active'
  }
  const clearSearch = () => {
    searchQuery.value = ''
  }

  /** Counts for the current GIPs (active accounts) */
  const summary = computed(() => {
    const current = rows.value.filter((r) => (r.member.status ?? 'active') === 'active')
    return {
      gips: current.length,
      toReview: current.reduce((sum, r) => sum + r.toReview, 0),
      waiting: current.filter((r) => r.toReview > 0).length,
    }
  })

  const viewReports = (row: TeamGipRow) => {
    void router.push({ name: 'supervisor-accomplishment-member', params: { profileId: row.member.id } })
  }

  const formatLatestPeriod = (row: TeamGipRow) =>
    row.latestPeriodStart ? formatPeriodRange(row.latestPeriodStart, row.latestPeriodEnd) : '—'

  onMounted(() => {
    void fetchGips()
  })

  return {
    officeLabel,
    hasOffice,
    hasLoaded,
    isLoading,
    rows,
    filteredRows,
    summary,
    fetchGips,
    searchQuery,
    statusFilter,
    statusOptions: GIP_STATUS_OPTIONS,
    hasActiveFilters,
    resetFilters,
    clearSearch,
    viewReports,
    formatLatestPeriod,
    formatDisplayDateLong,
    formatMemberStatusLabel,
    getMemberStatusBadgeClass,
    getInitials,
  }
}
