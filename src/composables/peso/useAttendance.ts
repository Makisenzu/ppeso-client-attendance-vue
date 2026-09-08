import { computed, onMounted, ref, watch } from 'vue'
import type { AttendanceRecord, AttendanceStatsSummary } from '@/types/peso/attendance'
import { attendanceService } from '@/services/peso/attendanceService'
import { computeAttendanceStats, exportAttendanceToCsv } from '@/helpers/peso/attendanceHelper'

export function useAttendance() {
  const attendances = ref<AttendanceRecord[]>([])
  const isLoading = ref<boolean>(false)
  const searchQuery = ref<string>('')
  const selectedPositionFilter = ref<string>('ALL')
  const selectedStatusFilter = ref<string>('ALL')
  const selectedDateFilter = ref<'ALL' | 'today' | 'this_week' | 'this_month'>('ALL')

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
    const set = new Set<string>()
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

    const now = new Date()
    const todayStr = now.toISOString().slice(0, 10)

    return attendances.value.filter((record) => {
      // 1. Text Search Filter (name, position, date, id)
      if (q) {
        const nameMatch = record.fullName.toLowerCase().includes(q)
        const posMatch = record.position ? record.position.toLowerCase().includes(q) : false
        const dateMatch = record.attendanceDate ? record.attendanceDate.toLowerCase().includes(q) : false
        const idMatch = record.profileId.toLowerCase().includes(q) || record.id.toLowerCase().includes(q)

        if (!nameMatch && !posMatch && !dateMatch && !idMatch) {
          return false
        }
      }

      // 2. Position Filter
      if (pos !== 'ALL') {
        if ((record.position || '').toUpperCase() !== pos.toUpperCase()) {
          return false
        }
      }

      // 3. Status Filter (ontime, late, early_out, absent)
      if (status !== 'ALL') {
        const statuses = [
          record.amInStatus,
          record.amOutStatus,
          record.pmInStatus,
          record.pmOutStatus,
        ]
          .filter(Boolean)
          .map((s) => s?.toLowerCase())

        if (!statuses.includes(status.toLowerCase())) {
          return false
        }
      }

      // 4. Date Filter
      if (dateFilter !== 'ALL' && record.attendanceDate) {
        const checkInDateStr = record.attendanceDate.slice(0, 10)

        if (dateFilter === 'today' && checkInDateStr !== todayStr) {
          return false
        }

        const recDate = new Date(record.attendanceDate)
        if (dateFilter === 'this_week') {
          const startOfWeek = new Date(now)
          startOfWeek.setDate(now.getDate() - now.getDay())
          startOfWeek.setHours(0, 0, 0, 0)
          if (recDate < startOfWeek) return false
        }

        if (dateFilter === 'this_month') {
          if (
            recDate.getFullYear() !== now.getFullYear() ||
            recDate.getMonth() !== now.getMonth()
          ) {
            return false
          }
        }
      }

      return true
    })
  })

  // ─── Stats Summary ───
  const statsSummary = computed<AttendanceStatsSummary>(() => {
    return computeAttendanceStats(attendances.value)
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

  watch([filteredAttendances, totalPages], () => {
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
    selectedPositionFilter.value = 'ALL'
    selectedStatusFilter.value = 'ALL'
    selectedDateFilter.value = 'ALL'
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
    exportAttendanceToCsv(filteredAttendances.value, filterSummary)
  }

  onMounted(() => {
    fetchAttendances()
  })

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
    currentPage,
    pageSize,
    selectedRecord,
    isDetailsOpen,
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
