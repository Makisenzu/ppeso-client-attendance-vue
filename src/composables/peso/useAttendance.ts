import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type { AttendanceRecord, AttendanceStatsSummary } from '@/types/peso/attendance'
import { attendanceService } from '@/services/peso/attendanceService'
import {
  computeAttendanceStats,
  exportAttendanceToCsv,
  formatDateDisplay,
  formatPunchStatusLabel,
  formatTimeDisplay,
  getRecordStatuses,
  recordMatchesDate,
  recordMatchesStatus,
} from '@/helpers/peso/attendanceHelper'

export function useAttendance() {
  const attendances = ref<AttendanceRecord[]>([])
  const isLoading = ref<boolean>(false)
  const searchQuery = ref<string>('')
  const selectedPositionFilter = ref<string>('ALL')
  const selectedStatusFilter = ref<string>('ALL')
  const selectedDateFilter = ref<'ALL' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom'>('ALL')
  const customDateFilter = ref<string>('')

  const currentPage = ref<number>(1)
  const pageSize = ref<number>(10)

  const selectedRecord = ref<AttendanceRecord | null>(null)
  const isDetailsOpen = ref<boolean>(false)

  const fetchAttendances = async () => {
    isLoading.value = true
    try {
      attendances.value = await attendanceService.getAttendances()
    } catch (err) {
      console.error('Failed to fetch attendance data:', err)
    } finally {
      isLoading.value = false
    }
  }

  const refreshAttendances = async () => {
    await fetchAttendances()
  }

  // ─── Available Positions for Filter ───
  const availablePositions = computed<string[]>(() => {
    const defaultPositions = ['EMPLOYEE', 'GIP', 'TUPAD', 'CLIENT']
    const set = new Set<string>(defaultPositions)
    for (const r of attendances.value) {
      if (r.position) set.add(r.position.toUpperCase())
    }
    return Array.from(set).sort()
  })

  // ─── Filtered Records ───
  const filteredAttendances = computed<AttendanceRecord[]>(() => {
    const q = searchQuery.value.trim().toLowerCase()
    const pos = selectedPositionFilter.value
    const status = selectedStatusFilter.value
    const dateFilter = selectedDateFilter.value
    const customDate = customDateFilter.value

    return attendances.value.filter((record) => {
      // 1. Text Search Filter (name, position, date, id, punch times, statuses)
      if (q) {
        const nameMatch = record.fullName.toLowerCase().includes(q)
        const posMatch = (record.position || 'employee').toLowerCase().includes(q)
        const rawDate = (record.attendanceDate || '').toLowerCase()
        const formattedDate = formatDateDisplay(record.attendanceDate).toLowerCase()
        const idMatch =
          record.profileId.toLowerCase().includes(q) || record.id.toLowerCase().includes(q)

        // Match punch statuses (e.g. "late", "on time", "early out", "absent")
        const statusMatch = getRecordStatuses(record).some((s) => {
          return s.includes(q) || formatPunchStatusLabel(s).toLowerCase().includes(q)
        })

        // Match formatted punch times (e.g. "8:00 AM", "5:00 PM")
        const timesMatch = [
          formatTimeDisplay(record.amCheckIn),
          formatTimeDisplay(record.amCheckOut),
          formatTimeDisplay(record.pmCheckIn),
          formatTimeDisplay(record.pmCheckOut),
        ]
          .filter((t) => t !== '—')
          .some((t) => t.toLowerCase().includes(q))

        if (
          !nameMatch &&
          !posMatch &&
          !rawDate.includes(q) &&
          !formattedDate.includes(q) &&
          !idMatch &&
          !statusMatch &&
          !timesMatch
        ) {
          return false
        }
      }

      // 2. Position Filter
      if (pos !== 'ALL') {
        const recordPos = (record.position || 'employee').toUpperCase()
        if (recordPos !== pos.toUpperCase()) {
          return false
        }
      }

      // 3. Status Filter (ontime, late, early_out, absent)
      if (status !== 'ALL') {
        if (!recordMatchesStatus(record, status)) {
          return false
        }
      }

      // 4. Date Filter (today, yesterday, this_week, this_month, custom)
      if (dateFilter !== 'ALL') {
        if (!recordMatchesDate(record.attendanceDate, dateFilter, customDate)) {
          return false
        }
      }

      return true
    })
  })

  // ─── Stats Summary ───
  const statsSummary = computed<AttendanceStatsSummary>(() => {
    return computeAttendanceStats(attendances.value)
  })

  // ─── Active Filters Helper ───
  const hasActiveFilters = computed<boolean>(() => {
    return (
      searchQuery.value.trim() !== '' ||
      selectedPositionFilter.value !== 'ALL' ||
      selectedStatusFilter.value !== 'ALL' ||
      selectedDateFilter.value !== 'ALL' ||
      customDateFilter.value.trim() !== ''
    )
  })

  // ─── Pagination ───
  const totalPages = computed<number>(() => {
    const count = Math.ceil(filteredAttendances.value.length / pageSize.value)
    return count > 0 ? count : 1
  })

  const paginatedAttendances = computed<AttendanceRecord[]>(() => {
    const start = (currentPage.value - 1) * pageSize.value
    return filteredAttendances.value.slice(start, start + pageSize.value)
  })

  // Auto reset page to 1 whenever any filter changes
  watch(
    [
      searchQuery,
      selectedPositionFilter,
      selectedStatusFilter,
      selectedDateFilter,
      customDateFilter,
      pageSize,
    ],
    () => {
      currentPage.value = 1
    }
  )

  watch([filteredAttendances, totalPages], () => {
    if (currentPage.value > totalPages.value) {
      currentPage.value = 1
    }
  })

  // Sliding window visible page numbers for pagination
  const visiblePages = computed<number[]>(() => {
    const total = totalPages.value
    const current = currentPage.value
    if (total <= 5) {
      return Array.from({ length: total }, (_, i) => i + 1)
    }
    let start = Math.max(1, current - 2)
    let end = Math.min(total, current + 2)
    if (current <= 3) {
      start = 1
      end = 5
    } else if (current >= total - 2) {
      start = total - 4
      end = total
    }
    const pages: number[] = []
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    return pages
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
    selectedPositionFilter.value = 'ALL'
    selectedStatusFilter.value = 'ALL'
    selectedDateFilter.value = 'ALL'
    customDateFilter.value = ''
    currentPage.value = 1
  }

  const clearSearch = () => {
    searchQuery.value = ''
  }

  const openDetails = (record: AttendanceRecord) => {
    selectedRecord.value = record
    isDetailsOpen.value = true
  }

  const closeDetails = () => {
    isDetailsOpen.value = false
    selectedRecord.value = null
  }

  const exportCsv = () => {
    let filterSummary = 'All'
    if (selectedPositionFilter.value !== 'ALL') filterSummary = selectedPositionFilter.value
    if (selectedStatusFilter.value !== 'ALL') filterSummary += `_${selectedStatusFilter.value}`
    if (selectedDateFilter.value !== 'ALL') filterSummary += `_${selectedDateFilter.value}`
    exportAttendanceToCsv(filteredAttendances.value, filterSummary)
  }

  // ─── Real-time Subscription ───
  let realtimeSub: { unsubscribe: () => void } | null = null
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  // Debounced fetch to prevent rapid-fire re-fetches when multiple realtime
  // events arrive simultaneously (postgres_changes + BroadcastChannel + broadcast)
  const debouncedFetch = () => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      fetchAttendances()
    }, 300)
  }

  onMounted(() => {
    fetchAttendances()

    // Subscribe to real-time attendance changes (Supabase postgres_changes + broadcast + BroadcastChannel)
    realtimeSub = attendanceService.subscribeToAttendances(() => {
      debouncedFetch()
    })
  })

  onUnmounted(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
    if (realtimeSub) {
      realtimeSub.unsubscribe()
      realtimeSub = null
    }
  })

  // ─── Delete State & Actions ───
  const recordToDelete = ref<AttendanceRecord | null>(null)
  const isDeleteDialogOpen = ref<boolean>(false)
  const isDeleting = ref<boolean>(false)
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

  const openDeleteDialog = (record: AttendanceRecord) => {
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
    const empName = recordToDelete.value.fullName || 'Employee'
    isDeleting.value = true
    try {
      await attendanceService.deleteAttendance(id)
      attendances.value = attendances.value.filter((r) => r.id !== id)
      if (selectedRecord.value?.id === id) {
        closeDetails()
      }
      isDeleteDialogOpen.value = false
      recordToDelete.value = null
      showFeedback(`Attendance record for ${empName} was deleted successfully.`, 'success')
      return true
    } catch (err: any) {
      console.error('Failed to delete attendance record:', err)
      showFeedback(err?.message || 'Failed to delete attendance record. Please try again.', 'error')
      return false
    } finally {
      isDeleting.value = false
    }
  }

  return {
    attendances,
    filteredAttendances,
    paginatedAttendances,
    availablePositions,
    totalPages,
    statsSummary,
    isLoading,
    searchQuery,
    selectedPositionFilter,
    selectedStatusFilter,
    selectedDateFilter,
    customDateFilter,
    hasActiveFilters,
    visiblePages,
    currentPage,
    pageSize,
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
    fetchAttendances,
    refreshAttendances,
    resetFilters,
    clearSearch,
    setPage,
    prevPage,
    nextPage,
    openDetails,
    closeDetails,
    exportCsv,
  }
}
