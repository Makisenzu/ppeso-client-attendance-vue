import { computed, onMounted, ref, shallowRef, watch, type Ref } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/authStore'
import { accomplishmentReviewService } from '@/services/common/accomplishmentReviewService'
import { REPORT_REVIEW_REMARKS_MAX, type ReviewReport } from '@/types/common/accomplishment'
import {
  formatPeriodRange,
  formatPesoAmount,
  formatWeekday,
  fundingFormTitle,
  getReportDayBadgeClass,
  getReportStatusBadgeClass,
  formatReviewStatusLabel,
  REPORT_FUNDING_FILTER_OPTIONS,
  REVIEW_STATUS_FILTER_OPTIONS,
  SUPERVISOR_REVIEW_STATUS_FILTER_OPTIONS,
} from '@/helpers/common/accomplishmentHelper'
import { buildAccomplishmentDocument } from '@/helpers/common/accomplishmentPrintHelper'
import { formatDisplayDateTimeLong } from '@/helpers/common/dateFormatHelper'
import { getPageRange, getVisiblePages } from '@/helpers/common/paginationHelper'
import { usePrintDocument } from '@/composables/common/usePrintDocument'
import { useToastAlert } from '@/composables/common/useToastAlert'

type ReviewAction = 'Reviewed' | 'Returned' | 'Submitted'

/** Narrows the loaded reports (the admin's open office and GIP — see useAccomplishmentOffices) */
export type ReportScope = (report: ReviewReport) => boolean

/**
 * Accomplishment Reports review screen, shared by admins (every office) and supervisors (their own office —
 * RLS decides which rows load). Only admins delete; supervisors get no selection column (DESIGN.md §11.1
 * exemption: they cannot delete reports).
 *
 * With `profileId` it lists one person's reports (supervisor → GIP list → View); the header then shows their
 * name with a way back to the list, and every status is shown at first.
 *
 * Without it (admins), the page first lists offices; `reportScope` then narrows the table to one office.
 */
export function useAccomplishmentReviews(profileId?: Ref<string | undefined>) {
  const toast = useToastAlert()
  const router = useRouter()
  const { printHtml } = usePrintDocument()
  const { isAdmin } = storeToRefs(useAuthStore())
  const canDelete = computed(() => isAdmin.value)

  const isPersonView = computed(() => Boolean(profileId?.value))
  /** Admin, every office: the page starts on the office list (useAccomplishmentOffices) */
  const isOfficeMode = computed(() => isAdmin.value && !isPersonView.value)
  const personName = ref('')
  /** Table columns: selection (admins) + beneficiary (all-people view) + period, form, status, submitted, actions */
  const columnCount = computed(() => 5 + (canDelete.value ? 1 : 0) + (isPersonView.value ? 0 : 1))

  const reports = ref<ReviewReport[]>([])
  const isLoading = ref(false)
  const searchQuery = ref('')
  const statusFilter = ref<string>('ALL')
  const fundingFilter = ref<string>('ALL')

  const reportScope = shallowRef<ReportScope | null>(null)
  /** The reports the counts and the table are built from */
  const scopedReports = computed(() => {
    const scope = reportScope.value
    return scope ? reports.value.filter(scope) : reports.value
  })

  const fetchReports = async () => {
    isLoading.value = true
    try {
      const id = profileId?.value
      const [rows, name] = await Promise.all([
        accomplishmentReviewService.getReports(id),
        id ? accomplishmentReviewService.getPersonName(id) : Promise.resolve(''),
      ])
      reports.value = rows
      personName.value = name ?? rows[0]?.fullName ?? ''
    } catch (err) {
      console.error('Failed to load accomplishment reports.')
      toast.show(err instanceof Error ? err.message : 'Failed to load reports.', 'error')
    } finally {
      isLoading.value = false
    }
  }

  // ─── Stats (also act as status filters) ───
  const counts = computed(() => {
    const c = { Submitted: 0, Returned: 0, Reviewed: 0 }
    for (const r of scopedReports.value) if (r.status in c) c[r.status as keyof typeof c]++
    return c
  })
  const statCards = computed(() => [
    { key: 'ALL', label: 'All Reports', value: scopedReports.value.length },
    { key: 'Submitted', label: isAdmin.value ? 'To Review' : 'Pending', value: counts.value.Submitted },
    { key: 'Returned', label: 'Returned', value: counts.value.Returned },
    { key: 'Reviewed', label: 'Reviewed', value: counts.value.Reviewed },
  ])
  const selectStatCard = (key: string) => {
    statusFilter.value = key
  }

  // ─── Filters ───
  const filteredReports = computed(() => {
    const q = searchQuery.value.trim().toLowerCase()
    return scopedReports.value.filter((r) => {
      if (statusFilter.value !== 'ALL' && r.status !== statusFilter.value) return false
      if (fundingFilter.value !== 'ALL' && r.funding !== fundingFilter.value) return false
      if (!q) return true
      return (
        r.fullName.toLowerCase().includes(q) ||
        (r.officeName ?? '').toLowerCase().includes(q) ||
        (r.officeCode ?? '').toLowerCase().includes(q) ||
        formatPeriodRange(r.periodStart, r.periodEnd).toLowerCase().includes(q)
      )
    })
  })
  const hasActiveFilters = computed(
    () => !!searchQuery.value.trim() || statusFilter.value !== 'ALL' || fundingFilter.value !== 'ALL',
  )
  const resetFilters = () => {
    searchQuery.value = ''
    statusFilter.value = 'ALL'
    fundingFilter.value = 'ALL'
  }

  // ─── Pagination ───
  const currentPage = ref(1)
  const pageSize = 10
  const totalPages = computed(() => Math.max(1, Math.ceil(filteredReports.value.length / pageSize)))
  const paginatedReports = computed(() => {
    const start = (currentPage.value - 1) * pageSize
    return filteredReports.value.slice(start, start + pageSize)
  })
  const pageRange = computed(() => getPageRange(currentPage.value, pageSize, filteredReports.value.length))
  const visiblePages = computed(() => getVisiblePages(currentPage.value, totalPages.value))
  const setPage = (page: number) => {
    if (page >= 1 && page <= totalPages.value) currentPage.value = page
  }
  watch([searchQuery, statusFilter, fundingFilter, reportScope], () => {
    currentPage.value = 1
  })
  watch(totalPages, (total) => {
    if (currentPage.value > total) currentPage.value = 1
  })

  // ─── Bulk selection & delete (admins) ───
  const selectedIds = ref<Set<string>>(new Set())
  const selectedCount = computed(() => selectedIds.value.size)
  const isSelected = (id: string) => selectedIds.value.has(id)
  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds.value)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    selectedIds.value = next
  }
  const isAllPageSelected = computed(
    () => paginatedReports.value.length > 0 && paginatedReports.value.every((r) => selectedIds.value.has(r.id)),
  )
  const isPagePartiallySelected = computed(
    () => !isAllPageSelected.value && paginatedReports.value.some((r) => selectedIds.value.has(r.id)),
  )
  const isAllFilteredSelected = computed(
    () => filteredReports.value.length > 0 && selectedIds.value.size === filteredReports.value.length,
  )
  const toggleSelectPage = () => {
    const next = new Set(selectedIds.value)
    if (isAllPageSelected.value) paginatedReports.value.forEach((r) => next.delete(r.id))
    else paginatedReports.value.forEach((r) => next.add(r.id))
    selectedIds.value = next
  }
  const selectAllFiltered = () => {
    selectedIds.value = new Set(filteredReports.value.map((r) => r.id))
  }
  const clearSelection = () => {
    selectedIds.value = new Set()
  }
  watch(filteredReports, (rows) => {
    if (selectedIds.value.size === 0) return
    const visible = new Set(rows.map((r) => r.id))
    const pruned = new Set([...selectedIds.value].filter((id) => visible.has(id)))
    if (pruned.size !== selectedIds.value.size) selectedIds.value = pruned
  })

  const reportsToDelete = ref<ReviewReport[]>([])
  const deletePreview = computed(() => reportsToDelete.value.slice(0, 50))
  const deleteOverflow = computed(() => Math.max(0, reportsToDelete.value.length - 50))
  const isDeleteDialogOpen = ref(false)
  const isDeleting = ref(false)

  const requestDelete = (report: ReviewReport) => {
    reportsToDelete.value = [report]
    isDeleteDialogOpen.value = true
  }
  const requestBulkDelete = () => {
    const selected = filteredReports.value.filter((r) => selectedIds.value.has(r.id))
    if (selected.length === 0) return
    reportsToDelete.value = selected
    isDeleteDialogOpen.value = true
  }
  const closeDeleteDialog = () => {
    if (isDeleting.value) return
    isDeleteDialogOpen.value = false
  }
  const onDeleteDialogChange = (open: boolean) => {
    if (!open) closeDeleteDialog()
  }
  const confirmDelete = async () => {
    const ids = reportsToDelete.value.map((r) => r.id)
    if (ids.length === 0) return
    isDeleting.value = true
    try {
      const deleted = new Set(await accomplishmentReviewService.deleteReports(ids))
      reports.value = reports.value.filter((r) => !deleted.has(r.id))
      if (selectedReport.value && deleted.has(selectedReport.value.id)) closeReview()
      clearSelection()
      isDeleteDialogOpen.value = false
      if (deleted.size < ids.length) {
        toast.show(`Deleted ${deleted.size} of ${ids.length} reports.`, 'error')
      } else {
        toast.show(`${deleted.size} report${deleted.size === 1 ? '' : 's'} deleted.`, 'success')
      }
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Failed to delete the reports.', 'error')
      await fetchReports()
    } finally {
      isDeleting.value = false
    }
  }

  // ─── Review sheet ───
  const selectedReport = ref<ReviewReport | null>(null)
  const isReviewOpen = ref(false)
  const remarks = ref('')
  const remarksError = ref('')
  const reviewingAction = ref<ReviewAction | null>(null)
  const isReviewing = computed(() => reviewingAction.value !== null)

  const openReview = (report: ReviewReport) => {
    selectedReport.value = report
    remarks.value = report.reviewRemarks ?? ''
    remarksError.value = ''
    isReviewOpen.value = true
  }
  const closeReview = () => {
    if (isReviewing.value) return
    isReviewOpen.value = false
    selectedReport.value = null
  }
  const onReviewOpenChange = (open: boolean) => {
    if (!open) closeReview()
  }
  const onRemarksInput = () => {
    remarksError.value = ''
  }

  const applyReview = async (action: ReviewAction) => {
    const report = selectedReport.value
    if (!report || isReviewing.value) return
    const text = remarks.value.trim()
    if (action === 'Returned' && !text) {
      remarksError.value = 'Write what needs to change before returning the report.'
      return
    }
    if (text.length > REPORT_REVIEW_REMARKS_MAX) {
      remarksError.value = `Keep the remarks under ${REPORT_REVIEW_REMARKS_MAX} characters.`
      return
    }
    reviewingAction.value = action
    try {
      await accomplishmentReviewService.setReviewStatus(report.id, action, action === 'Submitted' ? null : text || null)
      const messages: Record<ReviewAction, string> = {
        Reviewed: `Report of ${report.fullName} marked reviewed.`,
        Returned: `Report of ${report.fullName} returned with remarks.`,
        Submitted: `Review undone. The report is waiting for review again.`,
      }
      toast.show(messages[action], 'success')
      reviewingAction.value = null
      closeReview()
      await fetchReports()
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Failed to update the report.', 'error')
    } finally {
      reviewingAction.value = null
    }
  }
  const markReviewed = () => applyReview('Reviewed')
  const returnReport = () => applyReview('Returned')
  const undoReview = () => applyReview('Submitted')

  // ─── Print ───
  /** The report on its official form — what Print sends, and what supervisors read in the review sheet */
  const buildReportDocument = (report: ReviewReport) =>
    buildAccomplishmentDocument(
      {
        funding: report.funding,
        dailyEntries: report.dailyEntries,
        activities: report.activities,
        designation: report.designation,
        supervisorName: report.supervisorName,
        approverName: report.approverName,
        approverPosition: report.approverPosition,
        amount: report.amount,
        amountInWords: report.amountInWords,
      },
      { name: report.fullName, office: report.officeName ?? '', from: report.periodStart, to: report.periodEnd },
      window.location.origin,
    )

  /** Supervisors review the report as it will be printed; admins keep the itemised view. */
  const showPrintedForm = computed(() => !isAdmin.value)
  const selectedDocument = computed(() =>
    showPrintedForm.value && selectedReport.value ? buildReportDocument(selectedReport.value) : '',
  )

  const printReport = (report: ReviewReport) => {
    printHtml(buildReportDocument(report))
  }
  const printSelected = () => {
    if (selectedReport.value) printReport(selectedReport.value)
  }

  /** Person view: back to the supervisor's GIP list */
  const goBackToList = () => {
    void router.push({ name: 'supervisor-accomplishments' })
  }

  onMounted(() => {
    void fetchReports()
  })
  // Same page, another person (the route reuses the component): load their reports
  if (profileId) {
    watch(profileId, () => {
      personName.value = ''
      void fetchReports()
    })
  }

  return {
    isPersonView,
    isOfficeMode,
    reportScope,
    scopedReports,
    personName,
    columnCount,
    goBackToList,
    canDelete,
    reports,
    isLoading,
    fetchReports,
    statCards,
    selectStatCard,
    searchQuery,
    statusFilter,
    fundingFilter,
    statusOptions: computed(() => (isAdmin.value ? REVIEW_STATUS_FILTER_OPTIONS : SUPERVISOR_REVIEW_STATUS_FILTER_OPTIONS)),
    /** "Pending" instead of "Submitted" for supervisors */
    formatStatus: (status: string) => formatReviewStatusLabel(status, !isAdmin.value),
    fundingOptions: REPORT_FUNDING_FILTER_OPTIONS,
    hasActiveFilters,
    resetFilters,
    filteredReports,
    paginatedReports,
    currentPage,
    totalPages,
    pageRange,
    visiblePages,
    setPage,
    selectedCount,
    isSelected,
    toggleSelect,
    isAllPageSelected,
    isPagePartiallySelected,
    isAllFilteredSelected,
    toggleSelectPage,
    selectAllFiltered,
    clearSelection,
    reportsToDelete,
    deletePreview,
    deleteOverflow,
    isDeleteDialogOpen,
    isDeleting,
    requestDelete,
    requestBulkDelete,
    closeDeleteDialog,
    onDeleteDialogChange,
    confirmDelete,
    selectedReport,
    showPrintedForm,
    selectedDocument,
    isReviewOpen,
    remarks,
    remarksError,
    remarksMax: REPORT_REVIEW_REMARKS_MAX,
    reviewingAction,
    isReviewing,
    openReview,
    closeReview,
    onReviewOpenChange,
    onRemarksInput,
    markReviewed,
    returnReport,
    undoReview,
    printReport,
    printSelected,
    formatPeriodRange,
    formatWeekday,
    formatPesoAmount,
    formatDisplayDateTimeLong,
    fundingFormTitle,
    getReportStatusBadgeClass,
    getReportDayBadgeClass,
  }
}
