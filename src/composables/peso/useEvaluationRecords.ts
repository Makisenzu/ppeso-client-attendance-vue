import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { evaluationService } from '@/services/peso/evaluationService'
import type { EvaluationRecord } from '@/types/common/evaluation'
import type { OfficeEvaluationRow } from '@/types/peso/evaluation'
import { buildOfficeEvaluationRows, getOfficeKey, NO_OFFICE_KEY } from '@/helpers/peso/evaluationRecordHelper'
import {
  buildMonthOptions,
  formatPeriodMonth,
  formatRatingLabel,
  formatScore,
  formatScoreLabel,
  groupQuestionsByCategory,
} from '@/helpers/common/evaluationHelper'
import { getPageRange } from '@/helpers/common/paginationHelper'
import { formatDisplayDateLong, formatDisplayDateTimeLong } from '@/helpers/common/dateFormatHelper'
import { useToastAlert } from '@/composables/common/useToastAlert'

/** Submitted tab of the admin Evaluations page: every submitted GIP evaluation (read, view, delete). */
export function useEvaluationRecords() {
  const toast = useToastAlert()
  const route = useRoute()
  const router = useRouter()
  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    toast.show(text, type)
  }

  // ─── Data ───
  const records = ref<EvaluationRecord[]>([])
  const isLoading = ref(false)
  const loadError = ref<string | null>(null)

  const fetchRecords = async () => {
    isLoading.value = true
    loadError.value = null
    try {
      records.value = await evaluationService.getSubmittedEvaluations()
    } catch (err) {
      console.error('Failed to load evaluations')
      loadError.value = err instanceof Error ? err.message : 'Failed to load the evaluations.'
    } finally {
      isLoading.value = false
    }
  }

  // ─── Search, Filter & Pagination ───
  const searchQuery = ref('')
  const monthFilter = ref('ALL')
  const currentPage = ref(1)
  const pageSize = ref(10)

  const monthOptions = computed(() => buildMonthOptions(records.value.map((r) => r.periodMonth)))

  /** Evaluations of the chosen month (or all months) — what both the office list and the table are built from */
  const monthRecords = computed(() =>
    monthFilter.value === 'ALL' ? records.value : records.value.filter((r) => r.periodMonth === monthFilter.value),
  )

  // ─── Office list (first view) — kept in the URL as ?office=<id> so a reload stays on the office ───
  const selectedOfficeKey = computed(() => (typeof route.query.office === 'string' ? route.query.office : null))
  const isOfficeView = computed(() => selectedOfficeKey.value !== null)

  const officeSearch = ref('')
  const officeRows = computed(() => buildOfficeEvaluationRows(monthRecords.value))
  const filteredOfficeRows = computed(() => {
    const q = officeSearch.value.trim().toLowerCase()
    return q ? officeRows.value.filter((o) => o.officeName.toLowerCase().includes(q)) : officeRows.value
  })

  const OFFICE_PAGE_SIZE = 10
  const officePage = ref(1)
  const officeTotalPages = computed(() => Math.max(1, Math.ceil(filteredOfficeRows.value.length / OFFICE_PAGE_SIZE)))
  const paginatedOfficeRows = computed(() => {
    const start = (officePage.value - 1) * OFFICE_PAGE_SIZE
    return filteredOfficeRows.value.slice(start, start + OFFICE_PAGE_SIZE)
  })
  const officePageRange = computed(() =>
    getPageRange(officePage.value, OFFICE_PAGE_SIZE, filteredOfficeRows.value.length),
  )
  watch([officeSearch, monthFilter], () => {
    officePage.value = 1
  })
  watch(officeTotalPages, (pages) => {
    if (officePage.value > pages) officePage.value = pages
  })
  const prevOfficePage = () => {
    if (officePage.value > 1) officePage.value--
  }
  const nextOfficePage = () => {
    if (officePage.value < officeTotalPages.value) officePage.value++
  }
  const clearOfficeSearch = () => {
    officeSearch.value = ''
  }

  const selectedOfficeName = computed(() => {
    const key = selectedOfficeKey.value
    if (!key) return ''
    if (key === NO_OFFICE_KEY) return 'No office'
    return records.value.find((r) => r.officeId === key)?.officeName ?? 'Office'
  })

  const openOffice = (row: OfficeEvaluationRow) => {
    void router.push({ query: { ...route.query, office: row.key } })
  }
  const backToOffices = () => {
    void router.push({ query: { ...route.query, office: undefined } })
  }

  const getOfficeAverage = (row: OfficeEvaluationRow) => formatScore(row.averageOverall)
  const getOfficeAverageLabel = (row: OfficeEvaluationRow) => formatScoreLabel(row.averageOverall)

  // ─── Evaluations of the selected office (the table) ───
  const filteredRecords = computed(() => {
    const key = selectedOfficeKey.value
    if (!key) return []
    const q = searchQuery.value.trim().toLowerCase()
    return monthRecords.value.filter((r) => {
      if (getOfficeKey(r) !== key) return false
      if (!q) return true
      return r.gipName.toLowerCase().includes(q) || r.evaluatorName.toLowerCase().includes(q)
    })
  })
  const officeRecordCount = computed(
    () => monthRecords.value.filter((r) => getOfficeKey(r) === selectedOfficeKey.value).length,
  )

  const totalPages = computed(() => Math.max(1, Math.ceil(filteredRecords.value.length / pageSize.value)))
  const paginatedRecords = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value
    return filteredRecords.value.slice(start, start + pageSize.value)
  })
  const pageRange = computed(() => getPageRange(currentPage.value, pageSize.value, filteredRecords.value.length))

  watch([searchQuery, monthFilter, pageSize, selectedOfficeKey], () => {
    currentPage.value = 1
  })
  // A new office starts with an empty search
  watch(selectedOfficeKey, () => {
    searchQuery.value = ''
  })
  watch(totalPages, (pages) => {
    if (currentPage.value > pages) currentPage.value = pages
  })

  const prevPage = () => {
    if (currentPage.value > 1) currentPage.value--
  }
  const nextPage = () => {
    if (currentPage.value < totalPages.value) currentPage.value++
  }

  const hasActiveFilters = computed(() =>
    (isOfficeView.value ? searchQuery.value : officeSearch.value).trim() !== '' || monthFilter.value !== 'ALL',
  )
  const resetFilters = () => {
    searchQuery.value = ''
    officeSearch.value = ''
    monthFilter.value = 'ALL'
  }
  const clearSearch = () => {
    searchQuery.value = ''
  }

  // ─── Bulk Selection ───
  const selectedIds = ref<Set<string>>(new Set())
  const selectedCount = computed(() => selectedIds.value.size)
  const selectedRecords = computed(() => filteredRecords.value.filter((r) => selectedIds.value.has(r.id)))
  const isAllPageSelected = computed(
    () => paginatedRecords.value.length > 0 && paginatedRecords.value.every((r) => selectedIds.value.has(r.id)),
  )
  const isPagePartiallySelected = computed(
    () => !isAllPageSelected.value && paginatedRecords.value.some((r) => selectedIds.value.has(r.id)),
  )
  const isAllFilteredSelected = computed(
    () => filteredRecords.value.length > 0 && selectedIds.value.size === filteredRecords.value.length,
  )

  const isSelected = (id: string) => selectedIds.value.has(id)
  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds.value)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    selectedIds.value = next
  }
  const toggleSelectPage = () => {
    const next = new Set(selectedIds.value)
    if (isAllPageSelected.value) paginatedRecords.value.forEach((r) => next.delete(r.id))
    else paginatedRecords.value.forEach((r) => next.add(r.id))
    selectedIds.value = next
  }
  const selectAllFiltered = () => {
    selectedIds.value = new Set(filteredRecords.value.map((r) => r.id))
  }
  const clearSelection = () => {
    selectedIds.value = new Set()
  }

  // Never keep hidden rows selected.
  watch(filteredRecords, (items) => {
    if (selectedIds.value.size === 0) return
    const visible = new Set(items.map((r) => r.id))
    const pruned = new Set([...selectedIds.value].filter((id) => visible.has(id)))
    if (pruned.size !== selectedIds.value.size) selectedIds.value = pruned
  })

  // ─── View ───
  const isViewOpen = ref(false)
  const viewedRecord = ref<EvaluationRecord | null>(null)
  const viewedGroups = computed(() => groupQuestionsByCategory(viewedRecord.value?.answers ?? []))
  const viewedDescription = computed(() =>
    viewedRecord.value
      ? `${formatPeriodMonth(viewedRecord.value.periodMonth)} · ${viewedRecord.value.officeName}`
      : '',
  )
  const viewedSubmittedLabel = computed(() =>
    viewedRecord.value
      ? `Submitted by ${viewedRecord.value.evaluatorName} on ${formatDisplayDateTimeLong(viewedRecord.value.submittedAt)}`
      : '',
  )

  const openView = (record: EvaluationRecord) => {
    viewedRecord.value = record
    isViewOpen.value = true
  }
  const closeView = () => {
    isViewOpen.value = false
    viewedRecord.value = null
  }
  const onViewOpenChange = (open: boolean) => {
    if (!open) closeView()
  }

  // ─── Delete (single + bulk share one confirmation dialog) ───
  const isDeleteDialogOpen = ref(false)
  const isDeleting = ref(false)
  const recordsToDelete = ref<EvaluationRecord[]>([])

  const openDeleteDialog = (record: EvaluationRecord) => {
    recordsToDelete.value = [record]
    isDeleteDialogOpen.value = true
  }
  const openBulkDeleteDialog = () => {
    if (selectedRecords.value.length === 0) return
    recordsToDelete.value = [...selectedRecords.value]
    isDeleteDialogOpen.value = true
  }
  const resetDeleteDialog = () => {
    isDeleteDialogOpen.value = false
    recordsToDelete.value = []
  }
  const closeDeleteDialog = () => {
    if (isDeleting.value) return
    resetDeleteDialog()
  }
  const onDeleteDialogOpenChange = (open: boolean) => {
    if (!open) closeDeleteDialog()
  }

  const confirmDelete = async (): Promise<boolean> => {
    const ids = recordsToDelete.value.map((r) => r.id)
    if (ids.length === 0) return false
    isDeleting.value = true
    try {
      const deletedIds = await evaluationService.deleteEvaluations(ids)
      const deleted = new Set(deletedIds)
      records.value = records.value.filter((r) => !deleted.has(r.id))
      selectedIds.value = new Set([...selectedIds.value].filter((id) => !deleted.has(id)))
      resetDeleteDialog()
      const skipped = ids.length - deletedIds.length
      if (skipped > 0) {
        showFeedback(`Deleted ${deletedIds.length} of ${ids.length} evaluations. ${skipped} could not be deleted.`, 'error')
      } else {
        showFeedback(`${deletedIds.length} ${deletedIds.length === 1 ? 'evaluation' : 'evaluations'} deleted.`)
      }
      return true
    } catch (err) {
      console.error('Failed to delete evaluations')
      showFeedback(err instanceof Error ? err.message : 'Failed to delete. Please try again.', 'error')
      await fetchRecords()
      return false
    } finally {
      isDeleting.value = false
    }
  }

  const DELETE_PREVIEW_LIMIT = 50
  const deletePreview = computed(() => recordsToDelete.value.slice(0, DELETE_PREVIEW_LIMIT))
  const deleteOverflow = computed(() => Math.max(0, recordsToDelete.value.length - DELETE_PREVIEW_LIMIT))

  onMounted(() => {
    void fetchRecords()
  })

  return {
    // office list
    isOfficeView,
    officeRows,
    filteredOfficeRows,
    paginatedOfficeRows,
    officeSearch,
    clearOfficeSearch,
    officePage,
    officeTotalPages,
    officePageRange,
    prevOfficePage,
    nextOfficePage,
    openOffice,
    backToOffices,
    selectedOfficeName,
    officeRecordCount,
    getOfficeAverage,
    getOfficeAverageLabel,
    // evaluations of one office
    records,
    filteredRecords,
    paginatedRecords,
    isLoading,
    loadError,
    fetchRecords,
    searchQuery,
    monthFilter,
    monthOptions,
    currentPage,
    pageSize,
    totalPages,
    pageRange,
    prevPage,
    nextPage,
    hasActiveFilters,
    resetFilters,
    clearSearch,
    selectedCount,
    isAllPageSelected,
    isPagePartiallySelected,
    isAllFilteredSelected,
    isSelected,
    toggleSelect,
    toggleSelectPage,
    selectAllFiltered,
    clearSelection,
    isViewOpen,
    viewedRecord,
    viewedGroups,
    viewedDescription,
    viewedSubmittedLabel,
    openView,
    closeView,
    onViewOpenChange,
    isDeleteDialogOpen,
    isDeleting,
    recordsToDelete,
    deletePreview,
    deleteOverflow,
    openDeleteDialog,
    openBulkDeleteDialog,
    closeDeleteDialog,
    onDeleteDialogOpenChange,
    confirmDelete,
    formatPeriodMonth,
    formatScore,
    formatScoreLabel,
    formatRatingLabel,
    formatDisplayDateLong,
  }
}
