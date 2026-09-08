import { computed, onMounted, ref, watch } from 'vue'
import type { AttendanceRecord, AttendanceStatsSummary } from '@/types/peso/attendance'
import { attendanceService } from '@/services/peso/attendanceService'
import { computeAttendanceStats, exportAttendanceToCsv } from '@/helpers/peso/attendanceHelper'

export function useAttendance() {
  const attendances = ref<AttendanceRecord[]>([])
  const isLoading = ref<boolean>(false)
  const searchQuery = ref<string>('')
  const selectedTypeFilter = ref<'ALL' | 'registered' | 'walkin'>('ALL')
  const selectedStatusFilter = ref<'ALL' | 'active' | 'completed'>('ALL')
  const selectedCategoryFilter = ref<string>('ALL')
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

  // ─── Available Categories for Filter ───
  const availableCategories = computed<string[]>(() => {
    const set = new Set<string>()
    for (const r of attendances.value) {
      if (r.position) set.add(r.position.toUpperCase())
      if (r.purpose) set.add(r.purpose.toUpperCase())
    }
    return Array.from(set).sort()
  })

  // ─── Filtered Records ───
  const filteredAttendances = computed<AttendanceRecord[]>(() => {
    const q = searchQuery.value.trim().toLowerCase()
    const type = selectedTypeFilter.value
    const status = selectedStatusFilter.value
    const category = selectedCategoryFilter.value
    const dateFilter = selectedDateFilter.value

    const now = new Date()
    const todayStr = now.toISOString().slice(0, 10)

    return attendances.value.filter((record) => {
      // 1. Text Search Filter
      if (q) {
        const nameMatch = record.fullName.toLowerCase().includes(q)
        const contactMatch = record.contactNumber ? record.contactNumber.toLowerCase().includes(q) : false
        const posMatch = record.position ? record.position.toLowerCase().includes(q) : false
        const purposeMatch = record.purpose ? record.purpose.toLowerCase().includes(q) : false
        const addressMatch = record.address?.fullAddress
          ? record.address.fullAddress.toLowerCase().includes(q)
          : false

        if (!nameMatch && !contactMatch && !posMatch && !purposeMatch && !addressMatch) {
          return false
        }
      }

      // 2. Attendance Type Filter
      if (type !== 'ALL' && record.attendanceType !== type) {
        return false
      }

      // 3. Status Filter (active vs completed)
      if (status !== 'ALL') {
        if (status === 'active' && record.status !== 'active') return false
        if (status === 'completed' && record.status !== 'completed') return false
      }

      // 4. Classification / Purpose Filter
      if (category !== 'ALL') {
        const pos = (record.position || '').toUpperCase()
        const pur = (record.purpose || '').toUpperCase()
        if (pos !== category && pur !== category) {
          return false
        }
      }

      // 5. Date Filter
      if (dateFilter !== 'ALL' && record.checkIn) {
        const checkInDate = new Date(record.checkIn)
        const checkInDateStr = record.checkIn.slice(0, 10)

        if (dateFilter === 'today' && checkInDateStr !== todayStr) {
          return false
        }

        if (dateFilter === 'this_week') {
          const startOfWeek = new Date(now)
          startOfWeek.setDate(now.getDate() - now.getDay())
          startOfWeek.setHours(0, 0, 0, 0)
          if (checkInDate < startOfWeek) return false
        }

        if (dateFilter === 'this_month') {
          if (
            checkInDate.getFullYear() !== now.getFullYear() ||
            checkInDate.getMonth() !== now.getMonth()
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
    selectedTypeFilter.value = 'ALL'
    selectedStatusFilter.value = 'ALL'
    selectedCategoryFilter.value = 'ALL'
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
    if (selectedTypeFilter.value !== 'ALL') filterSummary = selectedTypeFilter.value
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
    availableCategories,
    totalPages,
    statsSummary,
    isLoading,
    searchQuery,
    selectedTypeFilter,
    selectedStatusFilter,
    selectedCategoryFilter,
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
