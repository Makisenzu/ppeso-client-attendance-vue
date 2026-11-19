import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { teamService } from '@/services/supervisor/teamService'
import { supervisorEvaluationService } from '@/services/supervisor/evaluationService'
import type { TeamOffice } from '@/types/supervisor/team'
import type { TeamEvaluationRow, TeamEvaluationStatusFilter } from '@/types/supervisor/teamEvaluation'
import {
  formatEvaluationStatusLabel,
  formatPeriodMonth,
  formatScore,
  formatScoreLabel,
  getCurrentPeriodMonth,
  getEvaluationStatusBadgeClass,
} from '@/helpers/common/evaluationHelper'
import {
  buildEvaluationRows,
  EVALUATION_STATUS_OPTIONS,
  evaluationRowMatches,
  getEvaluateActionLabel,
  summarizeEvaluationRows,
} from '@/helpers/supervisor/teamEvaluationHelper'
import { getInitials } from '@/helpers/peso/attendanceHelper'
import { formatDisplayDateLong } from '@/helpers/common/dateFormatHelper'
import { useToastAlert } from '@/composables/common/useToastAlert'

/**
 * Evaluation (supervisor): the active GIPs of the supervisor's office and this month's evaluation of each.
 * Evaluate / Continue / View opens the evaluation page (useTeamEvaluationForm).
 * A list of people, not records — nothing to bulk delete here (DESIGN.md §11.1).
 */
export function useTeamEvaluations() {
  const toast = useToastAlert()
  const router = useRouter()

  const office = ref<TeamOffice | null>(null)
  const rows = ref<TeamEvaluationRow[]>([])
  const hasQuestions = ref(true)
  const isLoading = ref(false)
  const hasLoaded = ref(false)
  const periodMonth = ref(getCurrentPeriodMonth())

  const searchQuery = ref('')
  const statusFilter = ref<TeamEvaluationStatusFilter>('ALL')

  const hasOffice = computed(() => office.value !== null)
  const officeLabel = computed(() =>
    office.value ? (office.value.code ? `${office.value.name} (${office.value.code})` : office.value.name) : '',
  )
  const periodLabel = computed(() => formatPeriodMonth(periodMonth.value))

  const fetchAll = async () => {
    isLoading.value = true
    try {
      periodMonth.value = getCurrentPeriodMonth()
      office.value = await teamService.getMyOffice()
      if (!office.value) {
        rows.value = []
        return
      }
      const [members, evaluations, activeQuestions] = await Promise.all([
        teamService.getTeamMembers(office.value.id),
        supervisorEvaluationService.getMonthEvaluations(periodMonth.value),
        supervisorEvaluationService.getActiveQuestions(),
      ])
      hasQuestions.value = activeQuestions.length > 0
      rows.value = buildEvaluationRows(members, evaluations)
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Failed to load the GIPs in your office.', 'error')
    } finally {
      isLoading.value = false
      hasLoaded.value = true
    }
  }

  const filteredRows = computed(() =>
    rows.value.filter((row) => evaluationRowMatches(row, searchQuery.value, statusFilter.value)),
  )
  const summary = computed(() => summarizeEvaluationRows(rows.value))
  const hasActiveFilters = computed(() => searchQuery.value.trim() !== '' || statusFilter.value !== 'ALL')
  const resetFilters = () => {
    searchQuery.value = ''
    statusFilter.value = 'ALL'
  }
  const clearSearch = () => {
    searchQuery.value = ''
  }

  const openEvaluation = (row: TeamEvaluationRow) => {
    void router.push({ name: 'supervisor-evaluation-form', params: { profileId: row.member.id } })
  }

  // ─── Row display ───
  const getRowStatus = (row: TeamEvaluationRow) => row.evaluation?.status ?? null
  const getRowScore = (row: TeamEvaluationRow) =>
    row.evaluation?.status === 'Submitted' ? formatScore(row.evaluation.scores.overall) : '—'
  const getRowScoreLabel = (row: TeamEvaluationRow) =>
    row.evaluation?.status === 'Submitted' ? formatScoreLabel(row.evaluation.scores.overall) : ''
  /** Written date of the submission, or of the draft's last save (DESIGN.md §3.1). */
  const getRowUpdatedLabel = (row: TeamEvaluationRow) =>
    row.evaluation ? formatDisplayDateLong(row.evaluation.submittedAt ?? row.evaluation.updatedAt) : '—'
  /** Starting needs questions; drafts and submitted ones can always be opened. */
  const canOpenRow = (row: TeamEvaluationRow) => hasQuestions.value || row.evaluation !== null

  onMounted(() => {
    void fetchAll()
  })

  return {
    officeLabel,
    periodLabel,
    hasOffice,
    hasQuestions,
    hasLoaded,
    isLoading,
    fetchAll,
    rows,
    filteredRows,
    summary,
    searchQuery,
    statusFilter,
    statusOptions: EVALUATION_STATUS_OPTIONS,
    hasActiveFilters,
    resetFilters,
    clearSearch,
    openEvaluation,
    canOpenRow,
    getRowStatus,
    getRowScore,
    getRowScoreLabel,
    getRowUpdatedLabel,
    getEvaluateActionLabel,
    formatEvaluationStatusLabel,
    getEvaluationStatusBadgeClass,
    getInitials,
  }
}
