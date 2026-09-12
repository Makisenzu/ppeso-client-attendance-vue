import { computed, onMounted, ref, watch } from 'vue'
import { useOfficeStore } from '@/stores/officeStore'
import type { OfficeFormData, OfficeRecord } from '@/types/peso/office'
import { exportOfficesToCsv, validateOfficeForm } from '@/helpers/peso/officeHelper'

export function useOffice() {
  const officeStore = useOfficeStore()

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
    name: '',
    code: '',
    isActive: true,
  })

  // View Details Modal
  const isViewOpen = ref<boolean>(false)
  const selectedOffice = ref<OfficeRecord | null>(null)

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
        const idMatch = office.id.toLowerCase().includes(q)

        if (!nameMatch && !codeMatch && !idMatch) {
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
      name: '',
      code: '',
      isActive: true,
    }
    formErrors.value = {}
    isAddEditOpen.value = true
  }

  const openEdit = (office: OfficeRecord) => {
    isEditMode.value = true
    editingId.value = office.id
    formData.value = {
      id: office.id,
      name: office.name,
      code: office.code || '',
      isActive: office.isActive,
    }
    formErrors.value = {}
    isAddEditOpen.value = true
  }

  const closeAddEdit = () => {
    if (isSubmitting.value) return
    isAddEditOpen.value = false
    formErrors.value = {}
    editingId.value = null
  }

  const handleSubmit = async (): Promise<boolean> => {
    const validation = validateOfficeForm(formData.value)
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

      closeAddEdit()
      return true
    } catch (err: any) {
      showFeedback(err?.message || 'An unexpected error occurred', 'error')
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  // ─── View Actions ───
  const openView = (office: OfficeRecord) => {
    selectedOffice.value = office
    isViewOpen.value = true
  }

  const closeView = () => {
    isViewOpen.value = false
    selectedOffice.value = null
  }

  // ─── Delete Actions ───
  const openDeleteDialog = (office: OfficeRecord) => {
    officeToDelete.value = office
    isDeleteDialogOpen.value = true
  }

  const closeDeleteDialog = () => {
    if (isDeleting.value) return
    isDeleteDialogOpen.value = false
    officeToDelete.value = null
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

      if (selectedOffice.value?.id === id) {
        closeView()
      }

      closeDeleteDialog()
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

  onMounted(() => {
    officeStore.fetchOffices()
  })

  return {
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
    isViewOpen,
    selectedOffice,
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
    closeView,
    openDeleteDialog,
    closeDeleteDialog,
    confirmDelete,
    handleToggleStatus,
    exportCsv,
    refreshOffices,
  }
}
