import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { dataEntryService } from '@/services/peso/dataEntryService'
import { usePsgc } from '@/composables/common/usePsgc'
import { useToastAlert } from '@/composables/common/useToastAlert'
import { getPageRange } from '@/helpers/common/paginationHelper'
import { AGE_FILTER_OPTIONS, BENEFICIARY_TYPE_OPTIONS, formatEntryName } from '@/helpers/common/dataEntryHelper'
import { downloadAnnexDXlsx } from '@/helpers/peso/annexDExportHelper'
import { ANNEX_D_HIGHLIGHT_COLORS, HIGHLIGHT_REASON_MAX, highlightColorOption } from '@/helpers/peso/annexDHighlightHelper'
import type {
  AnnexDAgeFilter,
  AnnexDEntry,
  AnnexDEntryInsert,
  AnnexDFilters,
  AnnexDHighlightColor,
  AnnexDHighlightGroup,
  AnnexDSelection,
  BeneficiaryType,
} from '@/types/common/dataEntry'
import type { SearchSelectOption } from '@/types/common/searchSelect'

const SEARCH_DEBOUNCE_MS = 300
const DELETE_PREVIEW_LIMIT = 50

/**
 * Data Entry page (admin): ANNEX D — Profile of TUPAD Beneficiaries. Lists `core.annex_d_entries` one page at a
 * time from the server (BACKEND.md §15), adds / edits / deletes entries, and exports every entry as the ANNEX D Excel
 * file. Selected entries can be marked with a colour + reason (several groups); the export fills each group's rows
 * with its colour and adds a legend.
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
  const ageFilter = ref<AnnexDAgeFilter>('ALL')
  const currentPage = ref(1)
  const pageSize = ref(10)

  const filters = computed<AnnexDFilters>(() => ({
    search: debouncedSearch.value,
    beneficiaryType: typeFilter.value,
    municipality: municipalityFilter.value,
    age: ageFilter.value,
  }))
  const hasActiveFilters = computed(
    () => typeFilter.value !== 'ALL' || municipalityFilter.value !== '' || ageFilter.value !== 'ALL',
  )
  const ageFilterOptions: SearchSelectOption[] = AGE_FILTER_OPTIONS.map((o) => ({ value: o.value, label: o.label }))
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

  // New filters → page 1 and a reload. The selection is kept, so entries can be picked across several
  // searches (it may hold rows the current filters hide; the delete dialog lists every selected name).
  watch(
    filters,
    () => {
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
    ageFilter.value = 'ALL'
  }

  // ─── Bulk Selection (kept across pages and searches) ───
  const selected = ref<Map<string, AnnexDSelection>>(new Map())
  const isSelectingAll = ref(false)
  /** The filters "Select all matching" last ran with; cleared as soon as any row is deselected. */
  const selectedAllFor = ref<string | null>(null)
  const filtersKey = computed(() => JSON.stringify(filters.value))
  const selectedCount = computed(() => selected.value.size)
  const isSelected = (id: string) => selected.value.has(id)
  const isAllPageSelected = computed(
    () => entries.value.length > 0 && entries.value.every((e) => selected.value.has(e.id)),
  )
  const isPagePartiallySelected = computed(
    () => !isAllPageSelected.value && entries.value.some((e) => selected.value.has(e.id)),
  )
  const isAllFilteredSelected = computed(
    () =>
      total.value > 0 &&
      (selectedAllFor.value === filtersKey.value || (!hasAnyFilter.value && selected.value.size >= total.value)),
  )

  const toggleSelect = (entry: AnnexDEntry) => {
    const next = new Map(selected.value)
    if (next.has(entry.id)) {
      next.delete(entry.id)
      selectedAllFor.value = null
    } else next.set(entry.id, entry)
    selected.value = next
  }

  const toggleSelectPage = () => {
    const next = new Map(selected.value)
    if (isAllPageSelected.value) {
      entries.value.forEach((e) => next.delete(e.id))
      selectedAllFor.value = null
    } else entries.value.forEach((e) => next.set(e.id, e))
    selected.value = next
  }

  /** Adds every entry matching the current search / filters to the selection (earlier picks stay). */
  const selectAllFiltered = async () => {
    isSelectingAll.value = true
    const key = filtersKey.value
    try {
      const rows = await dataEntryService.listSelection(filters.value)
      const next = new Map(selected.value)
      rows.forEach((r) => next.set(r.id, r))
      selected.value = next
      selectedAllFor.value = key
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : 'Failed to select the entries.', 'error')
    } finally {
      isSelectingAll.value = false
    }
  }

  const clearSelection = () => {
    selected.value = new Map()
    selectedAllFor.value = null
  }

  // ─── Highlight groups (colour + reason; kept only while the page is open) ───
  const highlightGroups = ref<Map<AnnexDHighlightColor, AnnexDHighlightGroup>>(new Map())
  const highlightColorOptions = ANNEX_D_HIGHLIGHT_COLORS
  const highlightReasonMax = HIGHLIGHT_REASON_MAX

  /** entry id → its group's colour */
  const highlightOf = computed(() => {
    const map = new Map<string, AnnexDHighlightColor>()
    highlightGroups.value.forEach((g) => g.members.forEach((_m, id) => map.set(id, g.color)))
    return map
  })
  /** The colour dot + reason a row shows, if the entry is marked */
  const entryHighlight = (id: string) => {
    const color = highlightOf.value.get(id)
    if (!color) return null
    const group = highlightGroups.value.get(color)
    return { swatchClass: highlightColorOption(color).swatchClass, reason: group?.reason ?? '' }
  }
  /** The legend chips, in palette order */
  const highlightLegend = computed(() =>
    ANNEX_D_HIGHLIGHT_COLORS.filter((c) => highlightGroups.value.has(c.value)).map((c) => {
      const group = highlightGroups.value.get(c.value)!
      return { color: c.value, label: c.label, swatchClass: c.swatchClass, reason: group.reason, count: group.members.size }
    }),
  )
  const highlightedCount = computed(() => highlightOf.value.size)
  const selectedMarkedCount = computed(() => [...selected.value.keys()].filter((id) => highlightOf.value.has(id)).length)

  // Mark dialog: 'mark' assigns the selection to a colour; 'rename' only changes a group's reason
  const isMarkDialogOpen = ref(false)
  const markMode = ref<'mark' | 'rename'>('mark')
  const markColor = ref<AnnexDHighlightColor>('yellow')
  const markReason = ref('')
  const markError = ref('')
  const markTargetCount = computed(() =>
    markMode.value === 'rename' ? (highlightGroups.value.get(markColor.value)?.members.size ?? 0) : selectedCount.value,
  )

  const openMarkDialog = () => {
    if (selected.value.size === 0) return
    markMode.value = 'mark'
    const unused = ANNEX_D_HIGHLIGHT_COLORS.find((c) => !highlightGroups.value.has(c.value))
    markColor.value = unused?.value ?? 'yellow'
    markReason.value = highlightGroups.value.get(markColor.value)?.reason ?? ''
    markError.value = ''
    isMarkDialogOpen.value = true
  }

  const openRenameDialog = (color: AnnexDHighlightColor) => {
    const group = highlightGroups.value.get(color)
    if (!group) return
    markMode.value = 'rename'
    markColor.value = color
    markReason.value = group.reason
    markError.value = ''
    isMarkDialogOpen.value = true
  }

  /** Picking a colour that already has a group shows (and keeps) that group's reason */
  const pickMarkColor = (color: AnnexDHighlightColor) => {
    markColor.value = color
    const existing = highlightGroups.value.get(color)
    if (existing) markReason.value = existing.reason
    markError.value = ''
  }

  const closeMarkDialog = () => {
    isMarkDialogOpen.value = false
  }

  const applyMark = () => {
    const reason = markReason.value.trim().replace(/\s+/g, ' ')
    if (!reason) {
      markError.value = 'Enter the reason for this colour.'
      return
    }
    if (reason.length > HIGHLIGHT_REASON_MAX) {
      markError.value = `Keep the reason under ${HIGHLIGHT_REASON_MAX} characters.`
      return
    }
    const next = new Map(highlightGroups.value)
    const label = highlightColorOption(markColor.value).label
    if (markMode.value === 'rename') {
      const group = next.get(markColor.value)
      if (group) next.set(markColor.value, { ...group, reason })
      highlightGroups.value = next
      isMarkDialogOpen.value = false
      showFeedback(`${label} reason updated.`)
      return
    }

    // An entry belongs to one group: take the selection out of every other group first
    const ids = [...selected.value.keys()]
    next.forEach((group, color) => {
      const members = new Map(group.members)
      ids.forEach((id) => members.delete(id))
      if (members.size === 0) next.delete(color)
      else next.set(color, { ...group, members })
    })
    const target = next.get(markColor.value)
    const members = new Map(target?.members ?? [])
    selected.value.forEach((entry, id) => members.set(id, entry))
    next.set(markColor.value, { color: markColor.value, reason, members })
    highlightGroups.value = next

    const count = ids.length
    isMarkDialogOpen.value = false
    clearSelection()
    showFeedback(`${count} ${count === 1 ? 'entry' : 'entries'} marked ${label.toLowerCase()}: ${reason}`)
  }

  /** Removes the colour from the selected entries */
  const unmarkSelected = () => {
    const ids = new Set(selected.value.keys())
    removeFromHighlights(ids)
    showFeedback('Colour removed from the selected entries.')
  }

  function removeFromHighlights(ids: ReadonlySet<string>) {
    const next = new Map<AnnexDHighlightColor, AnnexDHighlightGroup>()
    highlightGroups.value.forEach((group, color) => {
      const members = new Map([...group.members].filter(([id]) => !ids.has(id)))
      if (members.size > 0) next.set(color, { ...group, members })
    })
    highlightGroups.value = next
  }

  const removeHighlightGroup = (color: AnnexDHighlightColor) => {
    const next = new Map(highlightGroups.value)
    next.delete(color)
    highlightGroups.value = next
  }

  /** Puts a group's entries in the selection (e.g. to delete them or move them to another colour) */
  const selectHighlightGroup = (color: AnnexDHighlightColor) => {
    const group = highlightGroups.value.get(color)
    if (!group) return
    selected.value = new Map(group.members)
    selectedAllFor.value = null
  }

  const clearHighlights = () => {
    highlightGroups.value = new Map()
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
      selectedAllFor.value = null
      removeFromHighlights(deleted)
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

  // ─── Export ANNEX D (.xlsx): every entry (search and filters ignored), each highlight group in its colour ───
  const ALL_ENTRIES: AnnexDFilters = { search: '', beneficiaryType: 'ALL', municipality: '', age: 'ALL' }
  const isExporting = ref(false)
  const exportLabel = computed(() =>
    highlightedCount.value > 0 ? `Export (${highlightedCount.value} highlighted)` : 'Export to Excel',
  )

  const exportAnnexD = async () => {
    isExporting.value = true
    try {
      const rows = await dataEntryService.listForExport(ALL_ENTRIES)
      if (rows.length === 0) {
        showFeedback('There are no entries to export.', 'error')
        return
      }
      const groups = highlightLegend.value.map((g) => ({
        argb: highlightColorOption(g.color).argb,
        reason: g.reason,
        ids: new Set(highlightGroups.value.get(g.color)?.members.keys() ?? []),
      }))
      const marked = highlightOf.value
      const highlighted = rows.filter((r) => marked.has(r.id)).length
      await downloadAnnexDXlsx(rows, groups)
      const count = `${rows.length} ${rows.length === 1 ? 'entry' : 'entries'}`
      showFeedback(`ANNEX D exported with ${count}${highlighted > 0 ? ` (${highlighted} highlighted)` : ''}.`)
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
    ageFilter,
    ageFilterOptions,
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
    highlightColorOptions,
    highlightReasonMax,
    entryHighlight,
    highlightLegend,
    highlightedCount,
    selectedMarkedCount,
    isMarkDialogOpen,
    markMode,
    markColor,
    markReason,
    markError,
    markTargetCount,
    openMarkDialog,
    openRenameDialog,
    pickMarkColor,
    closeMarkDialog,
    applyMark,
    unmarkSelected,
    removeHighlightGroup,
    selectHighlightGroup,
    clearHighlights,
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
