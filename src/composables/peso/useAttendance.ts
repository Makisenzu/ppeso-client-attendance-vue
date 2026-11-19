import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getPageRange } from '@/helpers/common/paginationHelper'
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
import { useToastAlert } from '@/composables/common/useToastAlert'
import { useDtrPreview } from '@/composables/common/useDtrPreview'

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
    const defaultPositions = ['ADMIN', 'EMPLOYEE', 'GIP', 'TUPAD', 'CLIENT']
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
      // 0. Only display those with role = beneficiary
      if (record.role && record.role.toLowerCase() !== 'beneficiary') {
        return false
      }

      // 1. Text Search Filter (name, office, position, date, id, punch times, statuses)
      if (q) {
        const nameMatch = record.fullName.toLowerCase().includes(q)
        const officeNameMatch = (record.officeName || '').toLowerCase().includes(q)
        const officeCodeMatch = (record.officeCode || '').toLowerCase().includes(q)
        const posMatch = (record.position || 'beneficiary').toLowerCase().includes(q)
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
          !officeNameMatch &&
          !officeCodeMatch &&
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

  // View shows the person's printed DTR (CS Form 48) for the record's month, not the raw punches
  const dtrPreview = useDtrPreview((profileId, startDate, endDate) =>
    attendanceService.getAttendancesByProfileAndDateRange(profileId, startDate, endDate),
  )

  const openDetails = (record: AttendanceRecord) => {
    selectedRecord.value = record
    isDetailsOpen.value = true
    void dtrPreview.loadPreview({ profileId: record.profileId, fullName: record.fullName, date: record.attendanceDate })
  }

  const closeDetails = () => {
    isDetailsOpen.value = false
    selectedRecord.value = null
    dtrPreview.clearPreview()
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
  // ─── Feedback: toast in the top-right corner (useToastAlert) ───
  const toast = useToastAlert()
  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    toast.show(text, type)
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

  // ─── Bulk Selection & Delete ───
  const selectedIds = ref<Set<string>>(new Set())
  const isBulkDeleteDialogOpen = ref<boolean>(false)
  const isBulkDeleting = ref<boolean>(false)

  const selectedCount = computed<number>(() => selectedIds.value.size)

  const selectedRecords = computed<AttendanceRecord[]>(() =>
    filteredAttendances.value.filter((r) => selectedIds.value.has(r.id)),
  )

  const isAllPageSelected = computed<boolean>(() =>
    paginatedAttendances.value.length > 0 &&
    paginatedAttendances.value.every((r) => selectedIds.value.has(r.id)),
  )

  const isPagePartiallySelected = computed<boolean>(() =>
    !isAllPageSelected.value &&
    paginatedAttendances.value.some((r) => selectedIds.value.has(r.id)),
  )

  const isAllFilteredSelected = computed<boolean>(() =>
    filteredAttendances.value.length > 0 &&
    selectedIds.value.size === filteredAttendances.value.length,
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
    if (isAllPageSelected.value) {
      paginatedAttendances.value.forEach((r) => next.delete(r.id))
    } else {
      paginatedAttendances.value.forEach((r) => next.add(r.id))
    }
    selectedIds.value = next
  }

  const selectAllFiltered = () => {
    selectedIds.value = new Set(filteredAttendances.value.map((r) => r.id))
  }

  const clearSelection = () => {
    selectedIds.value = new Set()
  }

  // Keep the selection limited to records that are still visible under the
  // current filters, so a bulk delete never touches hidden rows.
  watch(filteredAttendances, (records) => {
    if (selectedIds.value.size === 0) return
    const visible = new Set(records.map((r) => r.id))
    const pruned = new Set([...selectedIds.value].filter((id) => visible.has(id)))
    if (pruned.size !== selectedIds.value.size) selectedIds.value = pruned
  })

  const openBulkDeleteDialog = () => {
    if (selectedCount.value === 0) return
    isBulkDeleteDialogOpen.value = true
  }

  const closeBulkDeleteDialog = () => {
    if (isBulkDeleting.value) return
    isBulkDeleteDialogOpen.value = false
  }

  const confirmBulkDelete = async (): Promise<boolean> => {
    const ids = selectedRecords.value.map((r) => r.id)
    if (ids.length === 0) return false

    isBulkDeleting.value = true
    try {
      const deletedIds = await attendanceService.deleteAttendances(ids)
      const deleted = new Set(deletedIds)

      attendances.value = attendances.value.filter((r) => !deleted.has(r.id))
      if (selectedRecord.value && deleted.has(selectedRecord.value.id)) {
        closeDetails()
      }
      clearSelection()
      isBulkDeleteDialogOpen.value = false

      const skipped = ids.length - deletedIds.length
      if (skipped > 0) {
        showFeedback(
          `Deleted ${deletedIds.length} of ${ids.length} records. ${skipped} could not be deleted (they may have been removed already or you lack permission).`,
          'error',
        )
      } else {
        showFeedback(
          `${deletedIds.length} attendance record${deletedIds.length === 1 ? '' : 's'} deleted successfully.`,
          'success',
        )
      }
      return true
    } catch (err: any) {
      console.error('Failed to bulk delete attendance records:', err)
      showFeedback(err?.message || 'Failed to delete the selected records. Please try again.', 'error')
      await fetchAttendances()
      return false
    } finally {
      isBulkDeleting.value = false
    }
  }

  // ─── Pagination display ───
  const pageRange = computed(() =>
    getPageRange(currentPage.value, pageSize.value, filteredAttendances.value.length),
  )
  const firstVisiblePage = computed(() => visiblePages.value[0] ?? 1)
  const lastVisiblePage = computed(() => visiblePages.value[visiblePages.value.length - 1] ?? 1)
  const showFirstPageButton = computed(() => firstVisiblePage.value > 1)
  const showLeadingEllipsis = computed(() => firstVisiblePage.value > 2)
  const showTrailingEllipsis = computed(() => lastVisiblePage.value < totalPages.value - 1)
  const showLastPageButton = computed(() => lastVisiblePage.value < totalPages.value)

  // ─── Bulk delete preview (first 50 names in the confirmation) ───
  const BULK_DELETE_PREVIEW_LIMIT = 50
  const bulkDeletePreview = computed(() => selectedRecords.value.slice(0, BULK_DELETE_PREVIEW_LIMIT))
  const bulkDeleteOverflow = computed(() =>
    Math.max(0, selectedRecords.value.length - BULK_DELETE_PREVIEW_LIMIT),
  )

  // ─── Civil Service Form 48 DTR — opens the Generate DTR page ───
  const router = useRouter()

  const openDtrPage = (profileId?: string | null) => {
    router.push({ name: 'attendance-dtr', query: profileId ? { profileId } : {} })
  }

  /** "Generate DTR" in the details dialog: close it and open the page for that person. */
  const generateDtrFromDetails = () => {
    const profileId = selectedRecord.value?.profileId
    closeDetails()
    openDtrPage(profileId)
  }

  return {
    pageRange,
    showFirstPageButton,
    showLeadingEllipsis,
    showTrailingEllipsis,
    showLastPageButton,
    bulkDeletePreview,
    bulkDeleteOverflow,
    openDtrPage,
    generateDtrFromDetails,
    ...dtrPreview,
    selectedCount,
    selectedRecords,
    isAllPageSelected,
    isPagePartiallySelected,
    isAllFilteredSelected,
    isSelected,
    toggleSelect,
    toggleSelectPage,
    selectAllFiltered,
    clearSelection,
    isBulkDeleteDialogOpen,
    isBulkDeleting,
    openBulkDeleteDialog,
    closeBulkDeleteDialog,
    confirmBulkDelete,
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
