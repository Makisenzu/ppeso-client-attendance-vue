import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useOfficeStore } from '@/stores/officeStore'
import { getPageRange } from '@/helpers/common/paginationHelper'
import { directoryService } from '@/services/peso/directoryService'
import type { OfficeFormData, OfficeRecord } from '@/types/peso/office'
import type { DirectoryOption } from '@/types/peso/directory'
import { exportOfficesToCsv, validateOfficeForm } from '@/helpers/peso/officeHelper'

export type OfficeTab = 'offices' | 'directory'

export function useOffice() {
  const officeStore = useOfficeStore()
  const route = useRoute()
  const router = useRouter()

  // ─── Filter & Search State ───
  const searchQuery = ref<string>('')
  const selectedStatusFilter = ref<'ALL' | 'active' | 'inactive'>('ALL')

  // ─── Pagination State ───
  const currentPage = ref<number>(1)
  const pageSize = ref<number>(10)

  // ─── Modal / Dialog States ───
  const isAddEditOpen = ref<boolean>(false)
  const isEditMode = ref<boolean>(false)
  const editingId = ref<string | null>(null)
  const isSubmitting = ref<boolean>(false)
  const formErrors = ref<Record<string, string>>({})

  const formData = ref<OfficeFormData>({
    directoryId: null,
    name: '',
    code: '',
    isActive: true,
  })

  // ─── Directory Picker (public.directories) ───
  const directories = ref<DirectoryOption[]>([])
  const isLoadingDirectories = ref<boolean>(false)
  const directoryLoadError = ref<string | null>(null)
  const directorySearch = ref<string>('')
  const isDirectoryPickerOpen = ref<boolean>(false)

  const selectedDirectory = computed<DirectoryOption | null>(() => {
    if (!formData.value.directoryId) return null
    return directories.value.find((d) => d.id === formData.value.directoryId) || null
  })

  const filteredDirectories = computed<DirectoryOption[]>(() => {
    const q = directorySearch.value.trim().toLowerCase()
    if (!q) return directories.value
    return directories.value.filter(
      (d) =>
        d.officeName.toLowerCase().includes(q) ||
        (d.officeCode || '').toLowerCase().includes(q) ||
        (d.officeHead || '').toLowerCase().includes(q),
    )
  })

  /** An entry is taken when another office (not the one being edited) was created from it. */
  const isDirectoryTaken = (directory: DirectoryOption) =>
    !!directory.linkedOfficeId && directory.linkedOfficeId !== editingId.value

  const loadDirectories = async () => {
    isLoadingDirectories.value = true
    directoryLoadError.value = null
    try {
      directories.value = await directoryService.getActiveDirectories()
    } catch (err) {
      console.error('Failed to load directories:', err)
      directoryLoadError.value = 'Failed to load the office directory. Please try again.'
    } finally {
      isLoadingDirectories.value = false
    }
  }

  const selectDirectory = (directory: DirectoryOption) => {
    if (isDirectoryTaken(directory)) return
    formData.value = {
      ...formData.value,
      directoryId: directory.id,
      name: directory.officeName,
      code: directory.officeCode || '',
    }
    delete formErrors.value.directoryId
    delete formErrors.value.name
    isDirectoryPickerOpen.value = false
    directorySearch.value = ''
  }

  const clearDirectory = () => {
    formData.value = { ...formData.value, directoryId: null }
  }

  // Delete Modal
  const isDeleteDialogOpen = ref<boolean>(false)
  const officeToDelete = ref<OfficeRecord | null>(null)
  const isDeleting = ref<boolean>(false)

  // Feedback banner
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

  // ─── Computed Filtered Records ───
  const filteredOffices = computed<OfficeRecord[]>(() => {
    const q = searchQuery.value.trim().toLowerCase()
    const status = selectedStatusFilter.value

    return officeStore.offices.filter((office) => {
      // Search filter
      if (q) {
        const nameMatch = office.name.toLowerCase().includes(q)
        const codeMatch = office.code ? office.code.toLowerCase().includes(q) : false
        const headMatch = office.officeHead ? office.officeHead.toLowerCase().includes(q) : false
        const idMatch = office.id.toLowerCase().includes(q)

        if (!nameMatch && !codeMatch && !headMatch && !idMatch) {
          return false
        }
      }

      // Status filter
      if (status !== 'ALL') {
        const isActiveExpected = status === 'active'
        if (office.isActive !== isActiveExpected) {
          return false
        }
      }

      return true
    })
  })

  // ─── Pagination Computeds ───
  const totalPages = computed<number>(() => {
    const pages = Math.ceil(filteredOffices.value.length / pageSize.value)
    return pages > 0 ? pages : 1
  })

  const paginatedOffices = computed<OfficeRecord[]>(() => {
    const start = (currentPage.value - 1) * pageSize.value
    return filteredOffices.value.slice(start, start + pageSize.value)
  })

  watch([filteredOffices, totalPages], () => {
    if (currentPage.value > totalPages.value) {
      currentPage.value = 1
    }
  })

  const setPage = (page: number) => {
    if (page >= 1 && page <= totalPages.value) {
      currentPage.value = page
    }
  }

  const prevPage = () => {
    if (currentPage.value > 1) {
      currentPage.value--
    }
  }

  const nextPage = () => {
    if (currentPage.value < totalPages.value) {
      currentPage.value++
    }
  }

  const resetFilters = () => {
    searchQuery.value = ''
    selectedStatusFilter.value = 'ALL'
    currentPage.value = 1
  }

  const clearSearch = () => {
    searchQuery.value = ''
  }

  const filterByStatus = (status: 'ALL' | 'active' | 'inactive') => {
    selectedStatusFilter.value = selectedStatusFilter.value === status ? 'ALL' : status
    currentPage.value = 1
  }

  // ─── Add / Edit Actions ───
  const openCreate = () => {
    isEditMode.value = false
    editingId.value = null
    formData.value = {
      directoryId: null,
      name: '',
      code: '',
      isActive: true,
    }
    formErrors.value = {}
    directorySearch.value = ''
    isDirectoryPickerOpen.value = false
    isAddEditOpen.value = true
    loadDirectories()
  }

  const openEdit = (office: OfficeRecord) => {
    isEditMode.value = true
    editingId.value = office.id
    formData.value = {
      id: office.id,
      directoryId: office.directoryId,
      name: office.name,
      code: office.code || '',
      isActive: office.isActive,
    }
    formErrors.value = {}
    directorySearch.value = ''
    isDirectoryPickerOpen.value = false
    isAddEditOpen.value = true
    loadDirectories()
  }

  const resetAddEdit = () => {
    isAddEditOpen.value = false
    isDirectoryPickerOpen.value = false
    formErrors.value = {}
    editingId.value = null
  }

  /** Cancel / dismiss — ignored while a save is in progress. */
  const closeAddEdit = () => {
    if (isSubmitting.value) return
    resetAddEdit()
  }

  const handleSubmit = async (): Promise<boolean> => {
    // New offices must come from the directory; older offices may stay unlinked when edited.
    const validation = validateOfficeForm(formData.value, { requireDirectory: !isEditMode.value })
    if (!validation.isValid) {
      formErrors.value = validation.errors
      return false
    }

    formErrors.value = {}
    isSubmitting.value = true

    try {
      if (isEditMode.value && editingId.value) {
        const res = await officeStore.updateOffice(editingId.value, formData.value)
        if (!res.success) {
          showFeedback(res.error || 'Failed to update office', 'error')
          return false
        }
        showFeedback(`Office "${formData.value.name}" updated successfully.`, 'success')
      } else {
        const res = await officeStore.addOffice(formData.value)
        if (!res.success) {
          showFeedback(res.error || 'Failed to create office', 'error')
          return false
        }
        showFeedback(`Office "${formData.value.name}" created successfully.`, 'success')
      }

      // Close directly: closeAddEdit() is a no-op while isSubmitting is still true.
      resetAddEdit()
      return true
    } catch (err: any) {
      showFeedback(err?.message || 'An unexpected error occurred', 'error')
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  // ─── View: opens the Office Details page (GIP beneficiaries table) ───
  const openView = (office: OfficeRecord) => {
    router.push({ name: 'office-details', params: { id: office.id } })
  }

  // ─── Delete Actions ───
  const openDeleteDialog = (office: OfficeRecord) => {
    officeToDelete.value = office
    isDeleteDialogOpen.value = true
  }

  const resetDeleteDialog = () => {
    isDeleteDialogOpen.value = false
    officeToDelete.value = null
  }

  /** Cancel / dismiss — ignored while a delete is in progress. */
  const closeDeleteDialog = () => {
    if (isDeleting.value) return
    resetDeleteDialog()
  }

  const confirmDelete = async (): Promise<boolean> => {
    if (!officeToDelete.value) return false
    const id = officeToDelete.value.id
    const officeName = officeToDelete.value.name
    isDeleting.value = true

    try {
      const res = await officeStore.deleteOffice(id)
      if (!res.success) {
        showFeedback(res.error || 'Failed to delete office', 'error')
        return false
      }

      // Close directly: closeDeleteDialog() is a no-op while isDeleting is still true.
      resetDeleteDialog()
      showFeedback(`Office "${officeName}" was successfully deleted.`, 'success')
      return true
    } catch (err: any) {
      showFeedback(err?.message || 'Failed to delete office', 'error')
      return false
    } finally {
      isDeleting.value = false
    }
  }

  // ─── Toggle Status ───
  const handleToggleStatus = async (office: OfficeRecord) => {
    const newStatus = !office.isActive
    const res = await officeStore.toggleStatus(office.id, newStatus)
    if (res.success) {
      showFeedback(
        `Office "${office.name}" set to ${newStatus ? 'Active' : 'Inactive'}.`,
        'success',
      )
    } else {
      showFeedback(res.error || 'Failed to change office status', 'error')
    }
  }

  // ─── Export CSV ───
  const exportCsv = () => {
    exportOfficesToCsv(filteredOffices.value)
  }

  // ─── Refresh ───
  const refreshOffices = async () => {
    await officeStore.fetchOffices()
  }

  // ─── Pagination display ───
  const pageRange = computed(() =>
    getPageRange(currentPage.value, pageSize.value, filteredOffices.value.length),
  )

  // ─── Tabs (kept in the URL as ?tab=directory so a reload stays on the same tab) ───
  const tabs: { key: OfficeTab; label: string }[] = [
    { key: 'offices', label: 'Offices' },
    { key: 'directory', label: 'Directory' },
  ]

  const activeTab = computed<OfficeTab>(() => (route.query.tab === 'directory' ? 'directory' : 'offices'))

  const setTab = (tab: OfficeTab) => {
    if (tab === activeTab.value) return
    router.replace({ query: { ...route.query, tab: tab === 'offices' ? undefined : tab } })
  }

  onMounted(() => {
    officeStore.fetchOffices()
  })

  return {
    pageRange,
    tabs,
    activeTab,
    setTab,
    offices: computed(() => officeStore.offices),
    filteredOffices,
    paginatedOffices,
    statsSummary: computed(() => officeStore.statsSummary),
    isLoading: computed(() => officeStore.isLoading),
    error: computed(() => officeStore.error),
    searchQuery,
    selectedStatusFilter,
    currentPage,
    pageSize,
    totalPages,
    isAddEditOpen,
    isEditMode,
    isSubmitting,
    formErrors,
    formData,
    directories,
    isLoadingDirectories,
    directoryLoadError,
    directorySearch,
    isDirectoryPickerOpen,
    selectedDirectory,
    filteredDirectories,
    isDirectoryTaken,
    loadDirectories,
    selectDirectory,
    clearDirectory,
    isDeleteDialogOpen,
    officeToDelete,
    isDeleting,
    feedbackMessage,
    dismissFeedback,
    setPage,
    prevPage,
    nextPage,
    resetFilters,
    clearSearch,
    filterByStatus,
    openCreate,
    openEdit,
    closeAddEdit,
    handleSubmit,
    openView,
    openDeleteDialog,
    closeDeleteDialog,
    confirmDelete,
    handleToggleStatus,
    exportCsv,
    refreshOffices,
  }
}
