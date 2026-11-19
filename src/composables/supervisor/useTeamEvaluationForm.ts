import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { teamService } from '@/services/supervisor/teamService'
import { supervisorEvaluationService } from '@/services/supervisor/evaluationService'
import type { TeamMember } from '@/types/supervisor/team'
import type { EvaluationQuestion, EvaluationStatus, GipEvaluation } from '@/types/common/evaluation'
import {
  countUnanswered,
  formatEvaluationStatusLabel,
  formatPeriodMonth,
  formatScore,
  formatScoreLabel,
  getCurrentPeriodMonth,
  getEvaluationStatusBadgeClass,
  RATING_SCALE,
  ratingsFromEvaluation,
  REMARKS_MAX_LENGTH,
  sortQuestions,
} from '@/helpers/common/evaluationHelper'
import { buildFormGroups } from '@/helpers/supervisor/teamEvaluationHelper'
import { formatPositionLabel } from '@/helpers/supervisor/teamHelper'
import { getInitials } from '@/helpers/peso/attendanceHelper'
import { formatDisplayDateTimeLong } from '@/helpers/common/dateFormatHelper'
import { useToastAlert } from '@/composables/common/useToastAlert'

/**
 * Evaluation form page (supervisor): one active GIP of the supervisor's office, rated on every active
 * question for this month. Saved as a draft or submitted (then read-only). RLS keeps it to their own office.
 */
export function useTeamEvaluationForm(props: { profileId: string }) {
  const toast = useToastAlert()
  const router = useRouter()

  const member = ref<TeamMember | null>(null)
  const questions = ref<EvaluationQuestion[]>([])
  const evaluation = ref<GipEvaluation | null>(null)
  const periodMonth = ref(getCurrentPeriodMonth())
  const isLoading = ref(true)
  const loadError = ref('')

  const ratings = ref<Record<string, number>>({})
  const remarks = ref('')
  const formError = ref('')
  const savingAction = ref<EvaluationStatus | null>(null)
  const isSaving = computed(() => savingAction.value !== null)

  const fetchAll = async () => {
    isLoading.value = true
    loadError.value = ''
    try {
      periodMonth.value = getCurrentPeriodMonth()
      const office = await teamService.getMyOffice()
      if (!office) {
        loadError.value = 'You are not assigned to an office yet.'
        return
      }
      const [members, activeQuestions, saved] = await Promise.all([
        teamService.getTeamMembers(office.id),
        supervisorEvaluationService.getActiveQuestions(),
        supervisorEvaluationService.getEvaluation(props.profileId, periodMonth.value),
      ])
      const found = members.find(
        (m) => m.id === props.profileId && m.position === 'gip' && (m.status ?? 'active') === 'active',
      )
      if (!found) {
        member.value = null
        loadError.value = 'This GIP is not an active GIP in your office.'
        return
      }
      member.value = found
      questions.value = sortQuestions(activeQuestions)
      evaluation.value = saved
      ratings.value = ratingsFromEvaluation(saved)
      remarks.value = saved?.remarks ?? ''
      formError.value = ''
    } catch (err) {
      loadError.value = err instanceof Error ? err.message : 'Failed to load the evaluation.'
    } finally {
      isLoading.value = false
    }
  }

  // ─── Page ───
  const memberName = computed(() => member.value?.fullName ?? '')
  const memberInitials = computed(() => getInitials(memberName.value))
  const memberPosition = computed(() => formatPositionLabel(member.value?.position))
  const periodLabel = computed(() => formatPeriodMonth(periodMonth.value))
  const status = computed(() => evaluation.value?.status ?? null)
  const statusLabel = computed(() => formatEvaluationStatusLabel(status.value))
  const statusBadgeClass = computed(() => getEvaluationStatusBadgeClass(status.value))
  const isReadOnly = computed(() => evaluation.value?.status === 'Submitted')
  const hasQuestions = computed(() => questions.value.length > 0)
  const canEdit = computed(() => !isReadOnly.value && hasQuestions.value)

  /** While editing: the active questions. Once submitted: the answers as they were saved. */
  const formGroups = computed(() =>
    isReadOnly.value
      ? buildFormGroups((evaluation.value?.answers ?? []).map((a) => ({ ...a, id: a.questionId })))
      : buildFormGroups(questions.value),
  )
  const unansweredCount = computed(() => (isReadOnly.value ? 0 : countUnanswered(questions.value, ratings.value)))
  const answeredLabel = computed(() => {
    const total = questions.value.length
    return `${total - unansweredCount.value} of ${total} rated`
  })
  const scores = computed(() => (isReadOnly.value ? (evaluation.value?.scores ?? null) : null))
  const statusLine = computed(() => {
    if (evaluation.value?.submittedAt) return `Submitted ${formatDisplayDateTimeLong(evaluation.value.submittedAt)}`
    if (evaluation.value) return `Draft saved ${formatDisplayDateTimeLong(evaluation.value.updatedAt)}`
    return 'Not started'
  })

  // ─── Ratings ───
  const isRatingSelected = (questionId: string, value: number) => ratings.value[questionId] === value
  const setRating = (questionId: string, value: number) => {
    if (!canEdit.value || isSaving.value) return
    ratings.value = { ...ratings.value, [questionId]: value }
    formError.value = ''
  }

  const goBack = () => {
    void router.push({ name: 'supervisor-evaluation' })
  }

  const save = async (nextStatus: EvaluationStatus): Promise<boolean> => {
    if (!member.value || !canEdit.value) return false
    savingAction.value = nextStatus
    formError.value = ''
    try {
      evaluation.value = await supervisorEvaluationService.saveEvaluation({
        id: evaluation.value?.id,
        profileId: member.value.id,
        ratings: ratings.value,
        remarks: remarks.value,
        status: nextStatus,
      })
      ratings.value = ratingsFromEvaluation(evaluation.value)
      remarks.value = evaluation.value.remarks
      toast.show(
        nextStatus === 'Submitted' ? `Evaluation of ${memberName.value} submitted.` : 'Draft saved.',
      )
      return true
    } catch (err) {
      formError.value = err instanceof Error ? err.message : 'Failed to save the evaluation.'
      return false
    } finally {
      savingAction.value = null
    }
  }

  const saveDraft = () => save('Draft')

  // ─── Submit confirmation (submitted evaluations are locked) ───
  const isSubmitDialogOpen = ref(false)
  const requestSubmit = () => {
    if (unansweredCount.value > 0) {
      formError.value = `Rate every question before submitting (${unansweredCount.value} left).`
      return
    }
    isSubmitDialogOpen.value = true
  }
  const closeSubmitDialog = () => {
    if (isSaving.value) return
    isSubmitDialogOpen.value = false
  }
  const onSubmitDialogOpenChange = (open: boolean) => {
    if (!open) closeSubmitDialog()
  }
  const confirmSubmit = async () => {
    const ok = await save('Submitted')
    isSubmitDialogOpen.value = false
    if (ok) goBack()
  }

  // ─── Discard draft ───
  const isDiscardDialogOpen = ref(false)
  const isDiscarding = ref(false)
  const canDiscard = computed(() => evaluation.value?.status === 'Draft')
  const openDiscardDialog = () => {
    if (canDiscard.value) isDiscardDialogOpen.value = true
  }
  const closeDiscardDialog = () => {
    if (isDiscarding.value) return
    isDiscardDialogOpen.value = false
  }
  const onDiscardDialogOpenChange = (open: boolean) => {
    if (!open) closeDiscardDialog()
  }
  const confirmDiscard = async () => {
    const draft = evaluation.value
    if (!draft) return
    isDiscarding.value = true
    try {
      const deleted = await supervisorEvaluationService.deleteDraft(draft.id)
      isDiscardDialogOpen.value = false
      if (deleted) {
        toast.show(`Draft for ${memberName.value} discarded.`)
        goBack()
      } else {
        toast.show('This draft could not be discarded. It may have been submitted.', 'error')
        await fetchAll()
      }
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Failed to discard the draft.', 'error')
    } finally {
      isDiscarding.value = false
    }
  }

  onMounted(() => {
    void fetchAll()
  })
  // Opening another GIP from the same page (e.g. browser history) reloads the form
  watch(
    () => props.profileId,
    () => {
      void fetchAll()
    },
  )

  return {
    isLoading,
    loadError,
    fetchAll,
    goBack,
    memberName,
    memberInitials,
    memberPosition,
    periodLabel,
    statusLabel,
    statusBadgeClass,
    statusLine,
    isReadOnly,
    hasQuestions,
    canEdit,
    formGroups,
    ratingScale: RATING_SCALE,
    isRatingSelected,
    setRating,
    remarks,
    remarksMax: REMARKS_MAX_LENGTH,
    formError,
    answeredLabel,
    scores,
    formatScore,
    formatScoreLabel,
    savingAction,
    isSaving,
    saveDraft,
    isSubmitDialogOpen,
    onSubmitDialogOpenChange,
    requestSubmit,
    closeSubmitDialog,
    confirmSubmit,
    canDiscard,
    isDiscardDialogOpen,
    isDiscarding,
    onDiscardDialogOpenChange,
    openDiscardDialog,
    closeDiscardDialog,
    confirmDiscard,
  }
}
