import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { myAttendanceService } from '@/services/beneficiary/myAttendanceService'
import type {
  MyAttendanceDateFilter,
  MyAttendanceRecord,
  MyAttendanceStatusFilter,
} from '@/types/beneficiary/myAttendance'
import type { AttendanceStatsSummary } from '@/types/peso/attendance'
import {
  computeAttendanceStats,
  formatPunchStatusLabel,
  getPunchStatusBadgeClass,
  isRecordAbsent,
  recordMatchesDate,
  recordMatchesStatus,
} from '@/helpers/peso/attendanceHelper'
import {
  getPunchCell,
  MY_DATE_OPTIONS,
  MY_PAGE_SIZE_OPTIONS,
  MY_STAT_CARDS,
  MY_STATUS_OPTIONS,
  myRecordMatchesSearch,
  PUNCH_SLOTS,
  type MyAttendanceStatCard,
} from '@/helpers/beneficiary/myAttendanceHelper'
import { formatDisplayDateLong, formatDisplayDateTime } from '@/helpers/common/dateFormatHelper'
import { getPageRange, getVisiblePages } from '@/helpers/common/paginationHelper'
import { useToastAlert } from '@/composables/common/useToastAlert'

/**
 * My Attendance (beneficiary): the signed-in user's own DTR logs, with the same stats, filters
 * and table as the admin Attendance Records screen. Read-only — DTRs are government records
 * that only admins may change, so there is no selection or delete (DESIGN.md §11.1 exemption).
 */
export function useMyAttendance() {
  const toast = useToastAlert()
  const router = useRouter()

  /** "Generate DTR" button: opens the My DTR page. */
  const openMyDtr = () => {
    router.push({ name: 'beneficiary-dtr' })
  }

  const records = ref<MyAttendanceRecord[]>([])
  const isLoading = ref<boolean>(false)

  const searchQuery = ref<string>('')
  const statusFilter = ref<MyAttendanceStatusFilter>('ALL')
  const dateFilter = ref<MyAttendanceDateFilter>('ALL')
  const customDate = ref<string>('')

  const currentPage = ref<number>(1)
  const pageSizeValue = ref<string>('10')
  const pageSize = computed<number>(() => Number(pageSizeValue.value) || 10)

  const selectedRecord = ref<MyAttendanceRecord | null>(null)
  const isDetailsOpen = ref<boolean>(false)

  // ─── Fetch ───
  const fetchRecords = async () => {
    isLoading.value = true
    try {
      records.value = await myAttendanceService.getMyAttendances()
    } catch (err) {
      console.error('Failed to load my attendance records.')
      toast.show(err instanceof Error ? err.message : 'Failed to load your attendance records.', 'error')
    } finally {
      isLoading.value = false
    }
  }

  // ─── Filters ───
  const filteredRecords = computed<MyAttendanceRecord[]>(() =>
    records.value.filter(
      (record) =>
        myRecordMatchesSearch(record, searchQuery.value) &&
        recordMatchesStatus(record, statusFilter.value) &&
        recordMatchesDate(record.attendanceDate, dateFilter.value, customDate.value),
    ),
  )

  const hasActiveFilters = computed<boolean>(
    () =>
      searchQuery.value.trim() !== '' ||
      statusFilter.value !== 'ALL' ||
      dateFilter.value !== 'ALL' ||
      customDate.value.trim() !== '',
  )

  const statsSummary = computed<AttendanceStatsSummary>(() => computeAttendanceStats(records.value))

  const resetFilters = () => {
    searchQuery.value = ''
    statusFilter.value = 'ALL'
    dateFilter.value = 'ALL'
    customDate.value = ''
    currentPage.value = 1
  }
  const clearSearch = () => {
    searchQuery.value = ''
  }
  const clearStatusFilter = () => {
    statusFilter.value = 'ALL'
  }
  const clearDateFilter = () => {
    dateFilter.value = 'ALL'
    customDate.value = ''
  }
  const clearCustomDate = () => {
    customDate.value = ''
  }

  /** Stat cards: "Total" clears every filter; the others toggle their status filter. */
  const selectStatCard = (card: MyAttendanceStatCard) => {
    if (card.key === 'ALL') {
      resetFilters()
      return
    }
    statusFilter.value = statusFilter.value === card.key ? 'ALL' : card.key
  }
  const isStatCardActive = (card: MyAttendanceStatCard) =>
    card.key === 'ALL' ? !hasActiveFilters.value : statusFilter.value === card.key

  const activeStatusLabel = computed(() => formatPunchStatusLabel(statusFilter.value))
  const activeDateLabel = computed(() => {
    if (dateFilter.value === 'custom') return formatDisplayDateLong(customDate.value, 'Custom Date')
    return MY_DATE_OPTIONS.find((o) => o.value === dateFilter.value)?.label ?? ''
  })

  // ─── Pagination ───
  const totalPages = computed<number>(() =>
    Math.max(1, Math.ceil(filteredRecords.value.length / pageSize.value)),
  )
  const paginatedRecords = computed<MyAttendanceRecord[]>(() => {
    const start = (currentPage.value - 1) * pageSize.value
    return filteredRecords.value.slice(start, start + pageSize.value)
  })

  watch([searchQuery, statusFilter, dateFilter, customDate, pageSizeValue], () => {
    currentPage.value = 1
  })
  watch(totalPages, (total) => {
    if (currentPage.value > total) currentPage.value = 1
  })

  const visiblePages = computed(() => getVisiblePages(currentPage.value, totalPages.value))
  const pageRange = computed(() =>
    getPageRange(currentPage.value, pageSize.value, filteredRecords.value.length),
  )
  const firstVisiblePage = computed(() => visiblePages.value[0] ?? 1)
  const lastVisiblePage = computed(() => visiblePages.value[visiblePages.value.length - 1] ?? 1)
  const showFirstPageButton = computed(() => firstVisiblePage.value > 1)
  const showLeadingEllipsis = computed(() => firstVisiblePage.value > 2)
  const showTrailingEllipsis = computed(() => lastVisiblePage.value < totalPages.value - 1)
  const showLastPageButton = computed(() => lastVisiblePage.value < totalPages.value)

  const setPage = (page: number) => {
    if (page >= 1 && page <= totalPages.value) currentPage.value = page
  }
  const prevPage = () => setPage(currentPage.value - 1)
  const nextPage = () => setPage(currentPage.value + 1)

  // ─── Details dialog ───
  // Details shows only the selected day's punches; the whole month is on the My DTR page
  const openDetails = (record: MyAttendanceRecord) => {
    selectedRecord.value = record
    isDetailsOpen.value = true
  }
  const closeDetails = () => {
    isDetailsOpen.value = false
    selectedRecord.value = null
  }
  const onDetailsOpenChange = (open: boolean) => {
    if (!open) closeDetails()
  }

  onMounted(() => {
    void fetchRecords()
  })

  return {
    openMyDtr,
    // data
    records,
    filteredRecords,
    paginatedRecords,
    isLoading,
    statsSummary,
    fetchRecords,
    // filters
    searchQuery,
    statusFilter,
    dateFilter,
    customDate,
    hasActiveFilters,
    activeStatusLabel,
    activeDateLabel,
    resetFilters,
    clearSearch,
    clearStatusFilter,
    clearDateFilter,
    clearCustomDate,
    statCards: MY_STAT_CARDS,
    selectStatCard,
    isStatCardActive,
    statusOptions: MY_STATUS_OPTIONS,
    dateOptions: MY_DATE_OPTIONS,
    pageSizeOptions: MY_PAGE_SIZE_OPTIONS,
    // pagination
    currentPage,
    pageSizeValue,
    totalPages,
    visiblePages,
    pageRange,
    showFirstPageButton,
    showLeadingEllipsis,
    showTrailingEllipsis,
    showLastPageButton,
    setPage,
    prevPage,
    nextPage,
    // details
    selectedRecord,
    isDetailsOpen,
    openDetails,
    onDetailsOpenChange,
    closeDetails,
    // display helpers
    punchSlots: PUNCH_SLOTS,
    getPunchCell,
    isRecordAbsent,
    // Attendance dates read as words ("November 13, 2026") on this page, at the user's request.
    formatAttendanceDate: formatDisplayDateLong,
    formatDisplayDateTime,
    formatPunchStatusLabel,
    getPunchStatusBadgeClass,
  }
}
