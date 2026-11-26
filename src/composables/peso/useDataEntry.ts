import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { dataEntryService } from '@/services/peso/dataEntryService'
import { usePsgc } from '@/composables/common/usePsgc'
import { useToastAlert } from '@/composables/common/useToastAlert'
import { getPageRange } from '@/helpers/common/paginationHelper'
import { BENEFICIARY_TYPE_OPTIONS, formatEntryName } from '@/helpers/peso/dataEntryHelper'
import { downloadAnnexDXlsx } from '@/helpers/peso/annexDExportHelper'
import type {
  AnnexDEntry,
  AnnexDEntryInsert,
  AnnexDFilters,
  AnnexDSelection,
  BeneficiaryType,
} from '@/types/peso/dataEntry'
import type { SearchSelectOption } from '@/types/common/searchSelect'

const SEARCH_DEBOUNCE_MS = 300
const DELETE_PREVIEW_LIMIT = 50

/**
 * Data Entry page (admin): ANNEX D — Profile of TUPAD Beneficiaries. Lists `core.annex_d_entries` one page at a
 * time from the server (BACKEND.md §15), adds / edits / deletes entries, and exports the filtered or selected
 * entries as the ANNEX D Excel file.
 */
export function useDataEntry() {
  const toast = useToastAlert()
  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => toast.show(text, type)

  // ─── Data ───
  const entries = ref<AnnexDEntry[]>([])
  const total = ref(0)
  const isLoading = ref(false)
  const loadError = ref<string | null>(null)

  // ─── Search, Filters & Pagination ───
  const searchQuery = ref('')
  const debouncedSearch = ref('')
  const typeFilter = ref<BeneficiaryType | 'ALL'>('ALL')
  const municipalityFilter = ref('')
  const currentPage = ref(1)
  const pageSize = ref(10)

  const filters = computed<AnnexDFilters>(() => ({
    search: debouncedSearch.value,
    beneficiaryType: typeFilter.value,
    municipality: municipalityFilter.value,
  }))
  const hasActiveFilters = computed(() => typeFilter.value !== 'ALL' || municipalityFilter.value !== '')
  const hasAnyFilter = computed(() => hasActiveFilters.value || debouncedSearch.value.trim() !== '')

  let searchTimer: ReturnType<typeof setTimeout> | null = null
  watch(searchQuery, (value) => {
    if (searchTimer) clearTimeout(searchTimer)
    searchTimer = setTimeout(() => {
      debouncedSearch.value = value
    }, SEARCH_DEBOUNCE_MS)
  })

  const typeFilterOptions: SearchSelectOption[] = [
    { value: 'ALL', label: 'All beneficiary types' },
    ...BENEFICIARY_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
  ]

  // Municipalities of Agusan del Sur (PSGC reference data) for the filter
  const { cities, initialize: initPsgc } = usePsgc()
  const municipalityFilterOptions = computed<SearchSelectOption[]>(() => [
    { value: '', label: 'All municipalities' },
    ...cities.value.map((c) => ({ value: c.name, label: c.name })),
  ])

  let requestId = 0
  const fetchEntries = async () => {
    const current = ++requestId
    isLoading.value = true
    loadError.value = null
    try {
      const { rows, total: count } = await dataEntryService.listEntries(filters.value, currentPage.value, pageSize.value)
      if (current !== requestId) return
      entries.value = rows
      total.value = count
    } catch (err) {
      if (current !== requestId) return
      console.error('Failed to load data entries')
      loadError.value = err instanceof Error ? err.message : 'Failed to load data entries.'
    } finally {
      if (current === requestId) isLoading.value = false
    }
  }

  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
  const pageRange = computed(() => getPageRange(currentPage.value, pageSize.value, total.value))

  // New filters → page 1, a fresh selection (it never holds hidden rows), and a reload
  watch(
    filters,
    () => {
      selected.value = new Map()
      if (currentPage.value !== 1) currentPage.value = 1
      else void fetchEntries()
    },
    { deep: true },
  )
  watch(pageSize, () => {
    if (currentPage.value !== 1) currentPage.value = 1
    else void fetchEntries()
  })
  watch(currentPage, () => {
    void fetchEntries()
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
  const resetFilters = () => {
    searchQuery.value = ''
    debouncedSearch.value = ''
    typeFilter.value = 'ALL'
    municipalityFilter.value = ''
  }

  // ─── Bulk Selection (kept across pages; cleared when the filters change) ───
  const selected = ref<Map<string, AnnexDSelection>>(new Map())
  const isSelectingAll = ref(false)
  const selectedCount = computed(() => selected.value.size)
  const isSelected = (id: string) => selected.value.has(id)
  const isAllPageSelected = computed(
    () => entries.value.length > 0 && entries.value.every((e) => selected.value.has(e.id)),
  )
  const isPagePartiallySelected = computed(
    () => !isAllPageSelected.value && entries.value.some((e) => selected.value.has(e.id)),
  )
  const isAllFilteredSelected = computed(() => total.value > 0 && selected.value.size >= total.value)

  const toggleSelect = (entry: AnnexDEntry) => {
    const next = new Map(selected.value)
    if (next.has(entry.id)) next.delete(entry.id)
    else next.set(entry.id, entry)
    selected.value = next
  }

  const toggleSelectPage = () => {
    const next = new Map(selected.value)
    if (isAllPageSelected.value) entries.value.forEach((e) => next.delete(e.id))
    else entries.value.forEach((e) => next.set(e.id, e))
    selected.value = next
  }

  const selectAllFiltered = async () => {
    isSelectingAll.value = true
    try {
      const rows = await dataEntryService.listSelection(filters.value)
      selected.value = new Map(rows.map((r) => [r.id, r]))
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : 'Failed to select the entries.', 'error')
    } finally {
      isSelectingAll.value = false
    }
  }

  const clearSelection = () => {
    selected.value = new Map()
  }

  // ─── Add / Edit Sheet ───
  const isSheetOpen = ref(false)
  const editingEntry = ref<AnnexDEntry | null>(null)
  const isSubmitting = ref(false)

  const openCreate = () => {
    editingEntry.value = null
    isSheetOpen.value = true
  }

  const openEdit = (entry: AnnexDEntry) => {
    editingEntry.value = entry
    isSheetOpen.value = true
  }

  const onSheetOpenChange = (value: boolean) => {
    if (!value && isSubmitting.value) return
    isSheetOpen.value = value
  }

  const handleSubmit = async (payload: AnnexDEntryInsert) => {
    isSubmitting.value = true
    try {
      if (editingEntry.value) {
        await dataEntryService.updateEntry(editingEntry.value.id, payload)
        showFeedback('Entry updated.')
      } else {
        await dataEntryService.createEntry(payload)
        showFeedback('Entry added.')
      }
      isSheetOpen.value = false
      await fetchEntries()
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : 'Failed to save the entry.', 'error')
    } finally {
      isSubmitting.value = false
    }
  }

  // ─── Delete (single + bulk share one confirmation dialog) ───
  const isDeleteDialogOpen = ref(false)
  const isDeleting = ref(false)
  const recordsToDelete = ref<AnnexDSelection[]>([])
  const deletePreview = computed(() =>
    recordsToDelete.value.slice(0, DELETE_PREVIEW_LIMIT).map((r) => ({ id: r.id, name: formatEntryName(r) })),
  )
  const deleteOverflow = computed(() => Math.max(0, recordsToDelete.value.length - DELETE_PREVIEW_LIMIT))

  const openDeleteDialog = (entry: AnnexDEntry) => {
    recordsToDelete.value = [entry]
    isDeleteDialogOpen.value = true
  }

  const openBulkDeleteDialog = () => {
    if (selected.value.size === 0) return
    recordsToDelete.value = [...selected.value.values()]
    isDeleteDialogOpen.value = true
  }

  const closeDeleteDialog = () => {
    if (isDeleting.value) return
    isDeleteDialogOpen.value = false
    recordsToDelete.value = []
  }

  const confirmDelete = async () => {
    const ids = recordsToDelete.value.map((r) => r.id)
    if (ids.length === 0) return
    isDeleting.value = true
    try {
      const deletedIds = await dataEntryService.deleteEntries(ids)
      const deleted = new Set(deletedIds)
      selected.value = new Map([...selected.value].filter(([id]) => !deleted.has(id)))
      isDeleteDialogOpen.value = false
      recordsToDelete.value = []
      const skipped = ids.length - deletedIds.length
      if (skipped > 0) {
        showFeedback(`Deleted ${deletedIds.length} of ${ids.length} entries. ${skipped} could not be deleted.`, 'error')
      } else {
        showFeedback(`${deletedIds.length} ${deletedIds.length === 1 ? 'entry' : 'entries'} deleted.`)
      }
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : 'Failed to delete. Please try again.', 'error')
    } finally {
      isDeleting.value = false
      await fetchEntries()
    }
  }

  // ─── Export ANNEX D (.xlsx): the selection if any, otherwise every filtered entry ───
  const isExporting = ref(false)
  const exportLabel = computed(() =>
    selectedCount.value > 0 ? `Export ${selectedCount.value} to Excel` : 'Export to Excel',
  )

  const exportAnnexD = async () => {
    isExporting.value = true
    try {
      const rows =
        selected.value.size > 0
          ? await dataEntryService.listByIds([...selected.value.keys()])
          : await dataEntryService.listForExport(filters.value)
      if (rows.length === 0) {
        showFeedback('There are no entries to export.', 'error')
        return
      }
      await downloadAnnexDXlsx(rows)
      showFeedback(`ANNEX D exported with ${rows.length} ${rows.length === 1 ? 'entry' : 'entries'}.`)
    } catch (err) {
      console.error('Failed to export ANNEX D')
      showFeedback(err instanceof Error ? err.message : 'Failed to export. Please try again.', 'error')
    } finally {
      isExporting.value = false
    }
  }

  onMounted(() => {
    void fetchEntries()
    void initPsgc('Region XIII (Caraga)', 'Agusan del Sur')
  })

  onUnmounted(() => {
    if (searchTimer) clearTimeout(searchTimer)
  })

  return {
    entries,
    total,
    isLoading,
    loadError,
    searchQuery,
    typeFilter,
    municipalityFilter,
    typeFilterOptions,
    municipalityFilterOptions,
    hasActiveFilters,
    hasAnyFilter,
    currentPage,
    pageSize,
    totalPages,
    pageRange,
    prevPage,
    nextPage,
    resetFilters,
    fetchEntries,
    selectedCount,
    isSelectingAll,
    isSelected,
    isAllPageSelected,
    isPagePartiallySelected,
    isAllFilteredSelected,
    toggleSelect,
    toggleSelectPage,
    selectAllFiltered,
    clearSelection,
    isSheetOpen,
    editingEntry,
    isSubmitting,
    openCreate,
    openEdit,
    onSheetOpenChange,
    handleSubmit,
    isDeleteDialogOpen,
    isDeleting,
    recordsToDelete,
    deletePreview,
    deleteOverflow,
    openDeleteDialog,
    openBulkDeleteDialog,
    closeDeleteDialog,
    confirmDelete,
    isExporting,
    exportLabel,
    exportAnnexD,
  }
}
