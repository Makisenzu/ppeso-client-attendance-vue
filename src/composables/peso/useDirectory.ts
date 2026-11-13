import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { directoryService } from '@/services/peso/directoryService'
import { useOfficeStore } from '@/stores/officeStore'
import type { DirectoryFormData, DirectoryRecord } from '@/types/peso/directory'

type StatusFilter = 'ALL' | 'active' | 'inactive'

const emptyForm = (): DirectoryFormData => ({
  officeName: '',
  officeCode: '',
  officeHead: '',
  status: 'active',
})

/** State and actions for the Directory tab of Office Management (public.directories). */
export function useDirectory() {
  const officeStore = useOfficeStore()

  // ─── Data ───
  const directories = ref<DirectoryRecord[]>([])
  const isLoading = ref(false)
  const loadError = ref<string | null>(null)

  // ─── Search, Filter & Pagination ───
  const searchQuery = ref('')
  const statusFilter = ref<StatusFilter>('ALL')
  const currentPage = ref(1)
  const pageSize = ref(10)

  // ─── Feedback Banner ───
  const feedbackMessage = ref<{ type: 'success' | 'error'; text: string } | null>(null)
  let feedbackTimer: ReturnType<typeof setTimeout> | null = null

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    if (feedbackTimer) clearTimeout(feedbackTimer)
    feedbackMessage.value = { type, text }
    feedbackTimer = setTimeout(() => {
      feedbackMessage.value = null
    }, 4000)
  }

  const dismissFeedback = () => {
    if (feedbackTimer) clearTimeout(feedbackTimer)
    feedbackMessage.value = null
  }

  const fetchDirectories = async () => {
    isLoading.value = true
    loadError.value = null
    try {
      directories.value = await directoryService.getDirectories()
    } catch (err) {
      console.error('Failed to load directories:', err)
      loadError.value = 'Failed to load the office directory.'
    } finally {
      isLoading.value = false
    }
  }

  /** Office heads and links shown on the Offices tab come from here — keep it current. */
  const refreshOffices = () => {
    void officeStore.fetchOffices()
  }

  // ─── Derived Lists ───
  const filteredDirectories = computed<DirectoryRecord[]>(() => {
    const q = searchQuery.value.trim().toLowerCase()
    return directories.value.filter((d) => {
      if (statusFilter.value !== 'ALL' && d.status !== statusFilter.value) return false
      if (!q) return true
      return (
        d.officeName.toLowerCase().includes(q) ||
        (d.officeCode || '').toLowerCase().includes(q) ||
        (d.officeHead || '').toLowerCase().includes(q)
      )
    })
  })

  const stats = computed(() => {
    const active = directories.value.filter((d) => d.status === 'active').length
    return { total: directories.value.length, active, inactive: directories.value.length - active }
  })

  const totalPages = computed(() => Math.max(1, Math.ceil(filteredDirectories.value.length / pageSize.value)))

  const paginatedDirectories = computed<DirectoryRecord[]>(() => {
    const start = (currentPage.value - 1) * pageSize.value
    return filteredDirectories.value.slice(start, start + pageSize.value)
  })

  watch([searchQuery, statusFilter, pageSize], () => {
    currentPage.value = 1
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
    statusFilter.value = 'ALL'
  }

  // ─── Bulk Selection ───
  const selectedIds = ref<Set<string>>(new Set())
  const selectedCount = computed(() => selectedIds.value.size)
  const selectedRecords = computed(() =>
    filteredDirectories.value.filter((d) => selectedIds.value.has(d.id)),
  )

  const isAllPageSelected = computed(
    () =>
      paginatedDirectories.value.length > 0 &&
      paginatedDirectories.value.every((d) => selectedIds.value.has(d.id)),
  )
  const isPagePartiallySelected = computed(
    () => !isAllPageSelected.value && paginatedDirectories.value.some((d) => selectedIds.value.has(d.id)),
  )
  const isAllFilteredSelected = computed(
    () => filteredDirectories.value.length > 0 && selectedIds.value.size === filteredDirectories.value.length,
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
    if (isAllPageSelected.value) paginatedDirectories.value.forEach((d) => next.delete(d.id))
    else paginatedDirectories.value.forEach((d) => next.add(d.id))
    selectedIds.value = next
  }

  const selectAllFiltered = () => {
    selectedIds.value = new Set(filteredDirectories.value.map((d) => d.id))
  }

  const clearSelection = () => {
    selectedIds.value = new Set()
  }

  // Never keep hidden rows selected.
  watch(filteredDirectories, (records) => {
    if (selectedIds.value.size === 0) return
    const visible = new Set(records.map((d) => d.id))
    const pruned = new Set([...selectedIds.value].filter((id) => visible.has(id)))
    if (pruned.size !== selectedIds.value.size) selectedIds.value = pruned
  })

  // ─── Add / Edit ───
  const isFormOpen = ref(false)
  const editingId = ref<string | null>(null)
  const isSubmitting = ref(false)
  const formData = ref<DirectoryFormData>(emptyForm())
  const formErrors = ref<Record<string, string>>({})
  const isEditMode = computed(() => editingId.value !== null)

  const openCreate = () => {
    editingId.value = null
    formData.value = emptyForm()
    formErrors.value = {}
    isFormOpen.value = true
  }

  const openEdit = (record: DirectoryRecord) => {
    editingId.value = record.id
    formData.value = {
      officeName: record.officeName,
      officeCode: record.officeCode || '',
      officeHead: record.officeHead || '',
      status: record.status,
    }
    formErrors.value = {}
    isFormOpen.value = true
  }

  const resetForm = () => {
    isFormOpen.value = false
    editingId.value = null
    formErrors.value = {}
  }

  /** Cancel / dismiss — ignored while a save is in progress. */
  const closeForm = () => {
    if (isSubmitting.value) return
    resetForm()
  }

  const validate = (): boolean => {
    const errors: Record<string, string> = {}
    const name = formData.value.officeName.trim()
    if (!name) errors.officeName = 'Office name is required'
    else if (name.length < 2) errors.officeName = 'Office name must be at least 2 characters'
    if (formData.value.officeCode.trim().length > 20) errors.officeCode = 'Code cannot exceed 20 characters'
    formErrors.value = errors
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (): Promise<boolean> => {
    if (!validate()) return false
    isSubmitting.value = true
    const name = formData.value.officeName.trim()
    try {
      if (editingId.value) {
        await directoryService.updateDirectory(editingId.value, formData.value)
        showFeedback(`"${name}" updated.`)
      } else {
        await directoryService.createDirectory(formData.value)
        showFeedback(`"${name}" added to the directory.`)
      }
      resetForm()
      await fetchDirectories()
      refreshOffices()
      return true
    } catch (err) {
      formErrors.value = {
        ...formErrors.value,
        submit: err instanceof Error ? err.message : 'Failed to save the directory entry.',
      }
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  // ─── Delete (single + bulk share one confirmation dialog) ───
  const isDeleteDialogOpen = ref(false)
  const isDeleting = ref(false)
  const recordsToDelete = ref<DirectoryRecord[]>([])
  const linkedToDeleteCount = computed(() => recordsToDelete.value.filter((d) => d.linkedOfficeName).length)

  const openDeleteDialog = (record: DirectoryRecord) => {
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

  /** Cancel / dismiss — ignored while a delete is in progress. */
  const closeDeleteDialog = () => {
    if (isDeleting.value) return
    resetDeleteDialog()
  }

  const confirmDelete = async (): Promise<boolean> => {
    const ids = recordsToDelete.value.map((d) => d.id)
    if (ids.length === 0) return false

    isDeleting.value = true
    try {
      const deletedIds = await directoryService.deleteDirectories(ids)
      const deleted = new Set(deletedIds)
      directories.value = directories.value.filter((d) => !deleted.has(d.id))
      selectedIds.value = new Set([...selectedIds.value].filter((id) => !deleted.has(id)))
      resetDeleteDialog()

      const skipped = ids.length - deletedIds.length
      if (skipped > 0) {
        showFeedback(`Deleted ${deletedIds.length} of ${ids.length} entries. ${skipped} could not be deleted.`, 'error')
      } else {
        showFeedback(`${deletedIds.length} directory ${deletedIds.length === 1 ? 'entry' : 'entries'} deleted.`)
      }
      refreshOffices()
      return true
    } catch (err) {
      console.error('Failed to delete directory entries:', err)
      showFeedback(err instanceof Error ? err.message : 'Failed to delete. Please try again.', 'error')
      await fetchDirectories()
      return false
    } finally {
      isDeleting.value = false
    }
  }

  onMounted(() => {
    fetchDirectories()
  })

  onUnmounted(() => {
    if (feedbackTimer) clearTimeout(feedbackTimer)
  })

  return {
    directories,
    filteredDirectories,
    paginatedDirectories,
    stats,
    isLoading,
    loadError,
    searchQuery,
    statusFilter,
    currentPage,
    pageSize,
    totalPages,
    prevPage,
    nextPage,
    resetFilters,
    fetchDirectories,
    feedbackMessage,
    dismissFeedback,
    selectedCount,
    isAllPageSelected,
    isPagePartiallySelected,
    isAllFilteredSelected,
    isSelected,
    toggleSelect,
    toggleSelectPage,
    selectAllFiltered,
    clearSelection,
    isFormOpen,
    isEditMode,
    isSubmitting,
    formData,
    formErrors,
    openCreate,
    openEdit,
    closeForm,
    handleSubmit,
    isDeleteDialogOpen,
    isDeleting,
    recordsToDelete,
    linkedToDeleteCount,
    openDeleteDialog,
    openBulkDeleteDialog,
    closeDeleteDialog,
    confirmDelete,
  }
}
