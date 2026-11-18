import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { myAccomplishmentService } from '@/services/beneficiary/myAccomplishmentService'
import type { AccomplishmentReport, ReportAuthorContext } from '@/types/common/accomplishment'
import {
  formatPeriodRange,
  fundingFormTitle,
  getReportStatusBadgeClass,
  REPORT_STATUS_FILTER_OPTIONS,
} from '@/helpers/common/accomplishmentHelper'
import { buildAccomplishmentDocument } from '@/helpers/common/accomplishmentPrintHelper'
import { formatDisplayDate, formatDisplayDateTimeLong } from '@/helpers/common/dateFormatHelper'
import { getPageRange, getVisiblePages } from '@/helpers/common/paginationHelper'
import { usePrintDocument } from '@/composables/common/usePrintDocument'
import { useToastAlert } from '@/composables/common/useToastAlert'

/** My Accomplishments (beneficiary): the user's own reports, with bulk remove of unreviewed ones. */
export function useMyAccomplishments() {
  const router = useRouter()
  const toast = useToastAlert()
  const { printHtml } = usePrintDocument()

  const reports = ref<AccomplishmentReport[]>([])
  const context = ref<ReportAuthorContext | null>(null)
  const isLoading = ref(false)
  const statusFilter = ref<string>('ALL')

  const currentPage = ref(1)
  const pageSize = 10

  const fetchReports = async () => {
    isLoading.value = true
    try {
      const [list, ctx] = await Promise.all([
        myAccomplishmentService.getMyReports(),
        myAccomplishmentService.getMyContext(),
      ])
      reports.value = list
      context.value = ctx
    } catch (err) {
      console.error('Failed to load my accomplishment reports.')
      toast.show(err instanceof Error ? err.message : 'Failed to load your reports.', 'error')
    } finally {
      isLoading.value = false
    }
  }

  /** Without a funding the database refuses new reports, so the page says who can fix it */
  const hasFunding = computed(() => !!context.value?.funding)
  const canAddReport = computed(() => !isLoading.value && hasFunding.value)

  const filteredReports = computed(() =>
    statusFilter.value === 'ALL' ? reports.value : reports.value.filter((r) => r.status === statusFilter.value),
  )

  // ─── Pagination ───
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
  watch(statusFilter, () => {
    currentPage.value = 1
  })
  watch(totalPages, (total) => {
    if (currentPage.value > total) currentPage.value = 1
  })

  // ─── Bulk selection & remove (Reviewed reports are kept: the database refuses them) ───
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
  const toggleSelectPage = () => {
    const next = new Set(selectedIds.value)
    if (isAllPageSelected.value) paginatedReports.value.forEach((r) => next.delete(r.id))
    else paginatedReports.value.forEach((r) => next.add(r.id))
    selectedIds.value = next
  }
  const clearSelection = () => {
    selectedIds.value = new Set()
  }
  // Never keep hidden rows selected
  watch(filteredReports, (rows) => {
    if (selectedIds.value.size === 0) return
    const visible = new Set(rows.map((r) => r.id))
    const pruned = new Set([...selectedIds.value].filter((id) => visible.has(id)))
    if (pruned.size !== selectedIds.value.size) selectedIds.value = pruned
  })

  const selectedReports = computed(() => filteredReports.value.filter((r) => selectedIds.value.has(r.id)))
  const reportsToRemove = ref<AccomplishmentReport[]>([])
  const removableToRemove = computed(() => reportsToRemove.value.filter((r) => r.status !== 'Reviewed'))
  const keptCount = computed(() => reportsToRemove.value.length - removableToRemove.value.length)
  /** First 50 in the confirmation list */
  const removePreview = computed(() => reportsToRemove.value.slice(0, 50))
  const isRemoveDialogOpen = ref(false)
  const isRemoving = ref(false)

  const requestRemove = (report: AccomplishmentReport) => {
    reportsToRemove.value = [report]
    isRemoveDialogOpen.value = true
  }
  const requestBulkRemove = () => {
    if (selectedReports.value.length === 0) return
    reportsToRemove.value = [...selectedReports.value]
    isRemoveDialogOpen.value = true
  }
  const closeRemoveDialog = () => {
    if (isRemoving.value) return
    isRemoveDialogOpen.value = false
  }
  const onRemoveDialogChange = (open: boolean) => {
    if (!open) closeRemoveDialog()
  }

  const confirmRemove = async () => {
    const ids = removableToRemove.value.map((r) => r.id)
    if (ids.length === 0) return
    isRemoving.value = true
    try {
      const removed = new Set(await myAccomplishmentService.deleteMyReports(ids))
      reports.value = reports.value.filter((r) => !removed.has(r.id))
      clearSelection()
      isRemoveDialogOpen.value = false
      if (removed.size < ids.length) {
        toast.show(`Removed ${removed.size} of ${ids.length} reports. Reviewed reports are kept.`, 'error')
      } else {
        toast.show(`${removed.size} report${removed.size === 1 ? '' : 's'} removed.`, 'success')
      }
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Failed to remove the reports.', 'error')
      await fetchReports()
    } finally {
      isRemoving.value = false
    }
  }

  // ─── Navigation & print ───
  const addReport = () => router.push({ name: 'beneficiary-accomplishment-new' })
  const openReport = (report: AccomplishmentReport) =>
    router.push({ name: 'beneficiary-accomplishment', params: { id: report.id } })

  const printReport = (report: AccomplishmentReport) => {
    printHtml(
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
        {
          name: context.value?.fullName ?? '',
          office: context.value?.officeName ?? '',
          from: report.periodStart,
          to: report.periodEnd,
        },
        window.location.origin,
      ),
    )
  }

  onMounted(() => {
    void fetchReports()
  })

  return {
    reports,
    context,
    isLoading,
    hasFunding,
    canAddReport,
    fetchReports,
    statusFilter,
    statusOptions: REPORT_STATUS_FILTER_OPTIONS,
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
    toggleSelectPage,
    clearSelection,
    reportsToRemove,
    removePreview,
    removableToRemove,
    keptCount,
    isRemoveDialogOpen,
    isRemoving,
    requestRemove,
    requestBulkRemove,
    onRemoveDialogChange,
    closeRemoveDialog,
    confirmRemove,
    addReport,
    openReport,
    printReport,
    formatPeriodRange,
    formatDisplayDate,
    formatDisplayDateTimeLong,
    fundingFormTitle,
    getReportStatusBadgeClass,
  }
}
