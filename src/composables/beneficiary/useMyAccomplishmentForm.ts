import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { myAccomplishmentService } from '@/services/beneficiary/myAccomplishmentService'
import {
  REPORT_ACTIVITIES_MAX,
  REPORT_ACTIVITY_MAX,
  REPORT_ACTIVITY_REMARKS_MAX,
  REPORT_DAY_STATUSES,
  REPORT_DEFAULT_ACTIVITY_REMARKS,
  REPORT_DEFAULT_DESIGNATION,
  REPORT_ENTRY_MAX,
  REPORT_NAME_MAX,
  REPORT_OUTPUT_MAX,
  REPORT_WORDS_MAX,
  type AccomplishmentReport,
  type ReportActivity,
  type ReportAuthorContext,
  type ReportDay,
  type ReportDayStatus,
  type ReportDetails,
  type ReportFunding,
} from '@/types/common/accomplishment'
import {
  currentHalfMonth,
  currentMonthRange,
  formatPesoAmount,
  formatWeekday,
  fundingFormTitle,
  getReportStatusBadgeClass,
  minIso,
  parseAmount,
  pesoAmountInWords,
  todayIso,
  weekdaysBetween,
} from '@/helpers/common/accomplishmentHelper'
import { buildAccomplishmentDocument } from '@/helpers/common/accomplishmentPrintHelper'
import { formatDisplayDate } from '@/helpers/common/dateFormatHelper'
import { usePrintDocument } from '@/composables/common/usePrintDocument'
import { useToastAlert } from '@/composables/common/useToastAlert'

interface DayDraft {
  date: string
  status: ReportDayStatus
  entry: string
}

interface ActivityDraft {
  key: number
  activity: string
  output: string
  remarks: string
}

type DetailErrorKey = keyof ReportDetails | 'activities' | 'period'

let activityKey = 0
const newActivity = (row?: ReportActivity): ActivityDraft => ({
  key: ++activityKey,
  activity: row?.activity ?? '',
  output: row?.output ?? '',
  remarks: row?.remarks ?? REPORT_DEFAULT_ACTIVITY_REMARKS,
})

/**
 * Add / edit one accomplishment report (beneficiary). The form follows the funding: DOLE asks what was done each
 * weekday; PGAS asks for Activities / Output / Remarks and the payment (no daily entries).
 * Client checks mirror the database trigger so mistakes show on the right field.
 */
export function useMyAccomplishmentForm() {
  const route = useRoute()
  const router = useRouter()
  const toast = useToastAlert()
  const { printHtml } = usePrintDocument()
  const today = todayIso()
  /** New reports (or changed dates) must stay in this month — same rule as the database */
  const month = currentMonthRange(today)

  const editingId = computed(() => (typeof route.params.id === 'string' ? route.params.id : null))
  const isNew = computed(() => !editingId.value)

  const isLoading = ref(true)
  const context = ref<ReportAuthorContext | null>(null)
  const currentReport = ref<AccomplishmentReport | null>(null)
  const isNotFound = ref(false)

  const funding = computed<ReportFunding | null>(() => currentReport.value?.funding ?? context.value?.funding ?? null)
  const isDole = computed(() => funding.value === 'DOLE')
  const formTitle = computed(() => (funding.value ? fundingFormTitle(funding.value) : 'Accomplishment Report'))
  const isReadOnly = computed(() => currentReport.value?.status === 'Reviewed')

  // ─── Period ───
  const periodFrom = ref('')
  const periodTo = ref('')
  /** An older report keeps its dates (e.g. a Returned one from last month); changing them applies the month rule */
  const datesChanged = computed(
    () =>
      !currentReport.value ||
      periodFrom.value !== currentReport.value.periodStart ||
      periodTo.value !== currentReport.value.periodEnd,
  )
  /** Date picker limits: this month, unless the report already covers other dates */
  const periodMin = computed(() =>
    currentReport.value && currentReport.value.periodStart < month.from ? currentReport.value.periodStart : month.from,
  )
  const periodMax = computed(() =>
    currentReport.value && currentReport.value.periodEnd > month.to ? currentReport.value.periodEnd : month.to,
  )
  const periodFromMax = computed(() => minIso(today, periodMax.value))
  const periodError = computed(() => {
    if (!periodFrom.value || !periodTo.value) return 'Pick the dates this report covers.'
    if (periodTo.value < periodFrom.value) return 'The end date must be on or after the start date.'
    if (periodFrom.value > today) return 'The start date cannot be after today.'
    if (datesChanged.value && (periodFrom.value < month.from || periodTo.value > month.to))
      return `Reports can only cover dates in the current month (${formatDisplayDate(month.from)} to ${formatDisplayDate(month.to)}).`
    return ''
  })
  /** Submitting before the last day is allowed after a confirmation */
  const isEarly = computed(() => !periodError.value && periodTo.value > today)

  // ─── Daily entries (DOLE only) ───
  const days = ref<DayDraft[]>([])
  const dayErrors = reactive<Record<string, string>>({})

  /** Weekday rows for the picked dates (up to today), keeping whatever was typed for days still in range */
  function rebuildDays(saved: ReportDay[] = []) {
    const typed = new Map(days.value.map((d) => [d.date, d]))
    const stored = new Map(saved.map((d) => [d.date, d]))
    if (periodError.value && periodError.value !== 'The start date cannot be after today.') {
      days.value = []
      return
    }
    days.value = weekdaysBetween(periodFrom.value, minIso(periodTo.value, today)).map((date) => {
      const day = typed.get(date) ?? stored.get(date)
      return { date, status: day?.status ?? 'Worked', entry: day?.entry ?? '' }
    })
  }

  watch([periodFrom, periodTo], () => {
    delete detailErrors.period
    rebuildDays()
  })

  const missingDays = computed(() => days.value.filter((d) => d.status === 'Worked' && !d.entry.trim()).length)

  const setDayStatus = (day: DayDraft, status: ReportDayStatus) => {
    day.status = status
    delete dayErrors[day.date]
  }
  const onDayInput = (day: DayDraft) => {
    if (day.entry.trim()) delete dayErrors[day.date]
  }

  // ─── PGAS activities ───
  const activities = ref<ActivityDraft[]>([newActivity()])
  const activityErrors = reactive<Record<number, string>>({})
  const canAddActivity = computed(() => activities.value.length < REPORT_ACTIVITIES_MAX)
  const addActivity = () => {
    if (canAddActivity.value) activities.value.push(newActivity())
  }
  const removeActivity = (key: number) => {
    activities.value = activities.value.filter((row) => row.key !== key)
    delete activityErrors[key]
    if (!activities.value.length) activities.value.push(newActivity())
  }
  const onActivityInput = (row: ActivityDraft) => {
    if (row.activity.trim()) delete activityErrors[row.key]
    delete detailErrors.activities
  }

  // ─── Details (signatories + PGAS payment) ───
  const details = reactive<ReportDetails>({
    designation: '',
    supervisor_name: '',
    approver_name: '',
    approver_position: '',
    amount: '',
    amount_in_words: '',
  })
  const detailErrors = reactive<Partial<Record<DetailErrorKey, string>>>({})

  /** Words suggested from the amount; replaced automatically until edited by hand */
  let suggestedWords = ''
  const onAmountInput = () => {
    delete detailErrors.amount
    const words = pesoAmountInWords(details.amount)
    if (!details.amount_in_words.trim() || details.amount_in_words === suggestedWords) {
      details.amount_in_words = words
      if (words) delete detailErrors.amount_in_words
    }
    suggestedWords = words
  }
  const fillAmountInWords = () => {
    const words = pesoAmountInWords(details.amount)
    if (!words) {
      detailErrors.amount = 'Enter the amount first.'
      return
    }
    details.amount_in_words = words
    suggestedWords = words
    delete detailErrors.amount_in_words
  }
  const amountPreview = computed(() => formatPesoAmount(details.amount))

  // ─── Fill the form ───
  function clearErrors() {
    for (const key of Object.keys(dayErrors)) delete dayErrors[key]
    for (const key of Object.keys(activityErrors)) delete activityErrors[Number(key)]
    for (const key of Object.keys(detailErrors)) delete detailErrors[key as DetailErrorKey]
  }

  function loadEditor(previous: AccomplishmentReport | null) {
    clearErrors()
    const report = currentReport.value
    const ctx = context.value
    const period = report ? { from: report.periodStart, to: report.periodEnd } : currentHalfMonth(today)
    days.value = []
    periodFrom.value = period.from
    periodTo.value = period.to
    rebuildDays(report?.dailyEntries ?? [])

    details.designation = report?.designation ?? previous?.designation ?? REPORT_DEFAULT_DESIGNATION
    // The supervisor is usually not the office head: carried over from the last report
    details.supervisor_name = report?.supervisorName ?? previous?.supervisorName ?? ''
    // Approver: the saved report's, else the office head from the directory, else the last report's
    details.approver_name = report?.approverName || ctx?.officeHeadName || previous?.approverName || ''
    details.approver_position = report?.approverPosition || ctx?.officeHeadPosition || previous?.approverPosition || ''
    details.amount = report?.amount != null ? report.amount.toFixed(2) : ''
    details.amount_in_words = report?.amountInWords ?? ''
    suggestedWords = ''

    activities.value = report?.activities.length ? report.activities.map((row) => newActivity(row)) : [newActivity()]
  }

  async function load() {
    isLoading.value = true
    isNotFound.value = false
    try {
      const [ctx, list] = await Promise.all([
        myAccomplishmentService.getMyContext(),
        myAccomplishmentService.getMyReports(),
      ])
      context.value = ctx
      currentReport.value = editingId.value ? list.find((r) => r.id === editingId.value) ?? null : null
      isNotFound.value = !!editingId.value && !currentReport.value
      const previous = list.find((r) => r.id !== editingId.value) ?? null
      loadEditor(previous)
    } catch (err) {
      console.error('Failed to load the accomplishment report form.')
      toast.show(err instanceof Error ? err.message : 'Failed to load the report.', 'error')
    } finally {
      isLoading.value = false
    }
  }

  // ─── Collect & validate ───
  /** Blank Worked days are left out (a draft keeps filling them later) */
  function collectEntries(): ReportDay[] {
    // PGAS reports have no daily entries; saving one clears any it had
    if (!isDole.value) return []
    return days.value
      .filter((day) => day.status !== 'Worked' || day.entry.trim())
      .map((day) => ({ date: day.date, status: day.status, entry: day.entry.trim() || null }))
  }

  function collectActivities(): ReportActivity[] {
    if (isDole.value) return []
    return activities.value
      .filter((row) => row.activity.trim() || row.output.trim())
      .map((row) => ({ activity: row.activity.trim(), output: row.output.trim() || null, remarks: row.remarks.trim() || null }))
  }

  const parsedAmount = computed(() => parseAmount(details.amount))

  function validate(submit: boolean): boolean {
    clearErrors()
    if (periodError.value) detailErrors.period = periodError.value
    for (const day of days.value) {
      if (day.entry.length > REPORT_ENTRY_MAX) dayErrors[day.date] = `Keep it under ${REPORT_ENTRY_MAX} characters.`
    }
    for (const field of ['designation', 'supervisor_name', 'approver_name', 'approver_position'] as const) {
      if (details[field].length > REPORT_NAME_MAX) detailErrors[field] = `Keep it under ${REPORT_NAME_MAX} characters.`
    }
    if (!isDole.value) {
      for (const row of activities.value) {
        if (!row.activity.trim() && row.output.trim()) activityErrors[row.key] = 'Write the activity for this output.'
        else if (
          row.activity.length > REPORT_ACTIVITY_MAX ||
          row.output.length > REPORT_OUTPUT_MAX ||
          row.remarks.length > REPORT_ACTIVITY_REMARKS_MAX
        )
          activityErrors[row.key] = 'This row is too long.'
      }
      if (details.amount.trim() && (parsedAmount.value == null || parsedAmount.value < 0))
        detailErrors.amount = 'Enter the amount as a number, e.g. 5300.00.'
      if (details.amount_in_words.length > REPORT_WORDS_MAX)
        detailErrors.amount_in_words = `Keep it under ${REPORT_WORDS_MAX} characters.`
    }
    if (submit) {
      if (isDole.value) {
        for (const day of days.value) {
          if (day.status === 'Worked' && !day.entry.trim())
            dayErrors[day.date] = 'Write what you did, or mark the day as a holiday or leave.'
        }
      } else {
        if (!collectActivities().length) detailErrors.activities = 'List at least one activity you accomplished.'
        if (!parsedAmount.value || parsedAmount.value <= 0) detailErrors.amount = 'Enter your pay for these dates.'
        if (!details.amount_in_words.trim()) detailErrors.amount_in_words = 'Write the amount in words.'
      }
    }
    return (
      Object.keys(dayErrors).length === 0 &&
      Object.keys(activityErrors).length === 0 &&
      Object.keys(detailErrors).length === 0
    )
  }

  // ─── Save / submit ───
  const savingMode = ref<'draft' | 'submit' | null>(null)
  const isSaving = computed(() => savingMode.value !== null)
  const canSaveDraft = computed(() => !isReadOnly.value && currentReport.value?.status !== 'Submitted')
  const submitLabel = computed(() => (currentReport.value?.submittedAt ? 'Submit again' : 'Submit report'))

  async function save(submit: boolean): Promise<boolean> {
    if (isSaving.value || !funding.value) return false
    if (!validate(submit)) {
      toast.show(detailErrors.period ?? (submit ? 'Some required parts are missing.' : 'Some entries need fixing.'), 'error')
      return false
    }
    savingMode.value = submit ? 'submit' : 'draft'
    try {
      const saved = await myAccomplishmentService.saveReport({
        id: currentReport.value?.id ?? null,
        periodStart: periodFrom.value,
        periodEnd: periodTo.value,
        dailyEntries: collectEntries(),
        activities: collectActivities(),
        details: { ...details, amount: details.amount.replace(/,/g, '').trim() },
        submit,
      })
      toast.show(submit ? 'Report submitted for review.' : 'Draft saved.', 'success')
      if (submit) {
        void router.push({ name: 'beneficiary-accomplishments' })
        return true
      }
      currentReport.value = saved
      // A new draft now has an id: keep editing it at its own address
      if (isNew.value) void router.replace({ name: 'beneficiary-accomplishment', params: { id: saved.id } })
      return true
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Failed to save your report.', 'error')
      return false
    } finally {
      savingMode.value = null
    }
  }

  const saveDraft = () => save(false)

  const isEarlySubmitDialogOpen = ref(false)
  const submitReport = () => {
    if (isEarly.value) {
      isEarlySubmitDialogOpen.value = true
      return
    }
    void save(true)
  }
  const confirmEarlySubmit = async () => {
    await save(true)
    isEarlySubmitDialogOpen.value = false
  }
  const onEarlySubmitDialogChange = (open: boolean) => {
    if (!open && !isSaving.value) isEarlySubmitDialogOpen.value = false
  }

  // ─── Print on the official form (what is on screen, saved or not) ───
  const printCurrent = () => {
    if (!funding.value) return
    if (periodError.value && periodError.value !== 'The start date cannot be after today.') {
      toast.show('Pick the dates first. The form prints the dates this report covers.', 'error')
      return
    }
    printHtml(
      buildAccomplishmentDocument(
        {
          funding: funding.value,
          dailyEntries: days.value
            .filter((day) => day.status !== 'Worked' || day.entry.trim())
            .map((day) => ({ date: day.date, status: day.status, entry: day.entry.trim() || null })),
          activities: collectActivities(),
          designation: details.designation,
          supervisorName: details.supervisor_name,
          approverName: details.approver_name,
          approverPosition: details.approver_position,
          amount: parsedAmount.value,
          amountInWords: details.amount_in_words,
        },
        {
          name: context.value?.fullName ?? '',
          office: context.value?.officeName ?? '',
          from: periodFrom.value,
          to: periodTo.value,
        },
        window.location.origin,
      ),
    )
  }

  const goBack = () => router.push({ name: 'beneficiary-accomplishments' })

  // Opening another report (or the new-report page) while on this page reloads it
  watch(editingId, (id, previousId) => {
    if (id !== previousId && !(previousId === null && id === currentReport.value?.id)) void load()
  })

  onMounted(() => {
    void load()
  })

  return {
    today,
    isLoading,
    isNew,
    isNotFound,
    context,
    currentReport,
    funding,
    isDole,
    formTitle,
    isReadOnly,
    periodFrom,
    periodTo,
    periodMin,
    periodMax,
    periodFromMax,
    periodError,
    isEarly,
    days,
    dayErrors,
    dayStatuses: REPORT_DAY_STATUSES,
    missingDays,
    setDayStatus,
    onDayInput,
    entryMax: REPORT_ENTRY_MAX,
    activities,
    activityErrors,
    canAddActivity,
    addActivity,
    removeActivity,
    onActivityInput,
    activityMax: REPORT_ACTIVITY_MAX,
    outputMax: REPORT_OUTPUT_MAX,
    remarksMax: REPORT_ACTIVITY_REMARKS_MAX,
    details,
    detailErrors,
    onAmountInput,
    fillAmountInWords,
    amountPreview,
    nameMax: REPORT_NAME_MAX,
    wordsMax: REPORT_WORDS_MAX,
    savingMode,
    isSaving,
    canSaveDraft,
    submitLabel,
    saveDraft,
    submitReport,
    isEarlySubmitDialogOpen,
    confirmEarlySubmit,
    onEarlySubmitDialogChange,
    printCurrent,
    goBack,
    formatWeekday,
    formatDisplayDate,
    getReportStatusBadgeClass,
  }
}
