import { computed, onMounted, ref, watch } from 'vue'
import type {
  ClientRecordDateFilter,
  ClientRecordItem,
  ClientRecordStats,
  WalkinAttendanceInsert,
} from '@/types/peso/clientRecord'
import { clientRecordService } from '@/services/peso/clientRecordService'
import {
  computeClientRecordStats,
  exportClientRecordsToCsv,
} from '@/helpers/peso/clientRecordHelper'

export function useClientRecords() {
  const records = ref<ClientRecordItem[]>([])
  const isLoading = ref<boolean>(false)
  const isSubmitting = ref<boolean>(false)

  // Filters
  const searchQuery = ref<string>('')
  const selectedPurposeFilter = ref<string>('ALL')
  const selectedGenderFilter = ref<string>('ALL')
  const selectedDateFilter = ref<ClientRecordDateFilter>('ALL')

  // Pagination
  const currentPage = ref<number>(1)
  const pageSize = ref<number>(10)

  // Modals / Sheet
  const isSheetOpen = ref<boolean>(false)
  const selectedRecord = ref<ClientRecordItem | null>(null)
  const isDetailsOpen = ref<boolean>(false)

  // Fetch from service
  const fetchRecords = async () => {
    isLoading.value = true
    try {
      records.value = await clientRecordService.getWalkinAttendances()
    } catch (err) {
      console.error('Failed to fetch walkin attendance records:', err)
    } finally {
      isLoading.value = false
    }
  }

  const refreshRecords = async () => {
    await fetchRecords()
  }

  // Stats
  const statsSummary = computed<ClientRecordStats>(() => {
    return computeClientRecordStats(records.value)
  })

  // Filtered
  const filteredRecords = computed<ClientRecordItem[]>(() => {
    const q = searchQuery.value.trim().toLowerCase()
    const purpose = selectedPurposeFilter.value
    const gender = selectedGenderFilter.value
    const dateFilter = selectedDateFilter.value

    const now = new Date()
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    return records.value.filter((item) => {
      // 1. Text Search Filter (name, contact, purok, barangay, geographic, purpose)
      if (q) {
        const nameMatch = item.fullName.toLowerCase().includes(q)
        const contactMatch = item.contact_number ? item.contact_number.toLowerCase().includes(q) : false
        const addressMatch = item.formattedAddress.toLowerCase().includes(q)
        const purposeMatch = item.purpose ? item.purpose.toLowerCase().includes(q) : false
        const idMatch = item.id.toLowerCase().includes(q)

        if (!nameMatch && !contactMatch && !addressMatch && !purposeMatch && !idMatch) {
          return false
        }
      }

      // 2. Purpose Filter
      if (purpose !== 'ALL') {
        if (item.purpose !== purpose) {
          return false
        }
      }

      // 3. Gender Filter
      if (gender !== 'ALL') {
        if (item.gender !== gender) {
          return false
        }
      }

      // 4. Date Filter
      if (dateFilter !== 'ALL' && item.check_in) {
        const recDate = new Date(item.check_in)
        const recDateStr = `${recDate.getFullYear()}-${String(recDate.getMonth() + 1).padStart(2, '0')}-${String(recDate.getDate()).padStart(2, '0')}`

        if (dateFilter === 'today' && recDateStr !== todayStr) {
          return false
        }

        if (dateFilter === 'this_week') {
          const startOfWeek = new Date(now)
          startOfWeek.setDate(now.getDate() - now.getDay())
          startOfWeek.setHours(0, 0, 0, 0)
          if (recDate < startOfWeek) return false
        }

        if (dateFilter === 'this_month') {
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
          if (recDate < startOfMonth) return false
        }
      }

      return true
    })
  })

  // Pagination calculations
  const totalPages = computed(() => {
    return Math.max(1, Math.ceil(filteredRecords.value.length / pageSize.value))
  })

  const paginatedRecords = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value
    return filteredRecords.value.slice(start, start + pageSize.value)
  })

  // Keep page in bound when filtering
  watch([searchQuery, selectedPurposeFilter, selectedGenderFilter, selectedDateFilter, pageSize], () => {
    currentPage.value = 1
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

  // Filter actions
  const resetFilters = () => {
    searchQuery.value = ''
    selectedPurposeFilter.value = 'ALL'
    selectedGenderFilter.value = 'ALL'
    selectedDateFilter.value = 'ALL'
    currentPage.value = 1
  }

  const clearSearch = () => {
    searchQuery.value = ''
  }

  // Details
  const openDetails = (record: ClientRecordItem) => {
    selectedRecord.value = record
    isDetailsOpen.value = true
  }

  const closeDetails = () => {
    isDetailsOpen.value = false
    selectedRecord.value = null
  }

  // Sheet Controls
  const openAddSheet = () => {
    isSheetOpen.value = true
  }

  const closeAddSheet = () => {
    isSheetOpen.value = false
  }

  // Submit new client record
  const submitNewRecord = async (payload: WalkinAttendanceInsert): Promise<boolean> => {
    isSubmitting.value = true
    try {
      const created = await clientRecordService.createWalkinAttendance(payload)
      if (created) {
        records.value.unshift(created)
        closeAddSheet()
        return true
      }
      return false
    } catch (err) {
      console.error('Failed to insert walkin record:', err)
      throw err
    } finally {
      isSubmitting.value = false
    }
  }

  // Check-out client
  const markCheckOut = async (id: string): Promise<boolean> => {
    try {
      const nowIso = new Date().toISOString()
      const updated = await clientRecordService.updateWalkinAttendance(id, {
        check_out: nowIso,
      })
      if (updated) {
        const idx = records.value.findIndex((r) => r.id === id)
        if (idx !== -1) {
          records.value[idx] = updated
        }
        if (selectedRecord.value?.id === id) {
          selectedRecord.value = updated
        }
        return true
      }
      return false
    } catch (err) {
      console.error('Failed to checkout client:', err)
      return false
    }
  }

  // Feedback / Notification banner
  const feedbackMessage = ref<{ type: 'success' | 'error'; text: string } | null>(null)

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    feedbackMessage.value = { type, text }
    setTimeout(() => {
      feedbackMessage.value = null
    }, 4000)
  }

  const dismissFeedback = () => {
    feedbackMessage.value = null
  }

  const handleAddClient = async (payload: WalkinAttendanceInsert) => {
    try {
      const success = await submitNewRecord(payload)
      if (success) {
        showFeedback(`Client record for ${payload.firstname} ${payload.lastname} successfully saved!`)
      }
    } catch (err: any) {
      showFeedback(err?.message || 'Failed to save client record. Please try again.', 'error')
    }
  }

  const handleCheckOut = async (id: string) => {
    const success = await markCheckOut(id)
    if (success) {
      showFeedback('Client successfully marked as checked out.')
    } else {
      showFeedback('Failed to update client check-out time.', 'error')
    }
  }

  // ─── Delete State & Actions ───
  const recordToDelete = ref<ClientRecordItem | null>(null)
  const isDeleteDialogOpen = ref<boolean>(false)
  const isDeleting = ref<boolean>(false)

  const openDeleteDialog = (record: ClientRecordItem) => {
    recordToDelete.value = record
    isDeleteDialogOpen.value = true
  }

  const closeDeleteDialog = () => {
    if (isDeleting.value) return
    isDeleteDialogOpen.value = false
    recordToDelete.value = null
  }

  const confirmDelete = async (): Promise<boolean> => {
    if (!recordToDelete.value) return false
    const id = recordToDelete.value.id
    const clientName = recordToDelete.value.fullName || 'Client'
    isDeleting.value = true
    try {
      await clientRecordService.deleteWalkinAttendance(id)
      records.value = records.value.filter((r) => r.id !== id)
      if (selectedRecord.value?.id === id) {
        closeDetails()
      }
      isDeleteDialogOpen.value = false
      recordToDelete.value = null
      showFeedback(`Client record for ${clientName} was deleted successfully.`, 'success')
      return true
    } catch (err: any) {
      console.error('Failed to delete client record:', err)
      showFeedback(err?.message || 'Failed to delete client record. Please try again.', 'error')
      return false
    } finally {
      isDeleting.value = false
    }
  }

  // CSV Export
  const exportCsv = () => {
    const listToExport = filteredRecords.value.length > 0 ? filteredRecords.value : records.value
    exportClientRecordsToCsv(listToExport)
  }

  onMounted(() => {
    fetchRecords()
  })

  return {
    records,
    filteredRecords,
    paginatedRecords,
    isLoading,
    isSubmitting,
    searchQuery,
    selectedPurposeFilter,
    selectedGenderFilter,
    selectedDateFilter,
    currentPage,
    pageSize,
    totalPages,
    statsSummary,
    isSheetOpen,
    selectedRecord,
    isDetailsOpen,
    recordToDelete,
    isDeleteDialogOpen,
    isDeleting,
    feedbackMessage,
    dismissFeedback,
    openDeleteDialog,
    closeDeleteDialog,
    confirmDelete,
    fetchRecords,
    refreshRecords,
    resetFilters,
    clearSearch,
    setPage,
    prevPage,
    nextPage,
    openAddSheet,
    closeAddSheet,
    openDetails,
    closeDetails,
    submitNewRecord,
    markCheckOut,
    handleAddClient,
    handleCheckOut,
    exportCsv,
  }
}
