import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { teamService } from '@/services/supervisor/teamService'
import type { MyAttendanceDateFilter, MyAttendanceStatusFilter } from '@/types/beneficiary/myAttendance'
import type { AttendanceStatsSummary } from '@/types/peso/attendance'
import type { TeamAttendanceRecord, TeamMember, TeamOffice } from '@/types/supervisor/team'
import {
  computeAttendanceStats,
  formatPunchStatusLabel,
  getInitials,
  getPunchStatusBadgeClass,
  isRecordAbsent,
  recordMatchesDate,
  recordMatchesStatus,
} from '@/helpers/peso/attendanceHelper'
import {
  getPunchCell,
  MY_DATE_OPTIONS,
  MY_PAGE_SIZE_OPTIONS,
  MY_STATUS_OPTIONS,
  PUNCH_SLOTS,
  type MyAttendanceStatCard,
} from '@/helpers/beneficiary/myAttendanceHelper'
import {
  buildMemberOptions,
  formatPositionLabel,
  TEAM_STAT_CARDS,
  teamRecordMatchesSearch,
} from '@/helpers/supervisor/teamHelper'
import { formatDisplayDateLong, formatDisplayDateTime } from '@/helpers/common/dateFormatHelper'
import { getPageRange, getVisiblePages } from '@/helpers/common/paginationHelper'
import { useToastAlert } from '@/composables/common/useToastAlert'
import { useDtrPreview } from '@/composables/common/useDtrPreview'

/**
 * Team Attendance (supervisor): the daily time records of the beneficiaries in the supervisor's office.
 * Read-only — DTRs are government records only admins may change, so there is no selection or delete
 * (DESIGN.md §11.1 exemption). `?member=<id>` opens it filtered to one person.
 */
export function useTeamAttendance() {
  const toast = useToastAlert()
  const route = useRoute()
  const router = useRouter()

  const office = ref<TeamOffice | null>(null)
  const members = ref<TeamMember[]>([])
  const records = ref<TeamAttendanceRecord[]>([])
  const isLoading = ref(false)
  const hasLoaded = ref(false)

  const memberFilter = ref<string>(typeof route.query.member === 'string' ? route.query.member : 'ALL')
  const searchQuery = ref('')
  const statusFilter = ref<MyAttendanceStatusFilter>('ALL')
  const dateFilter = ref<MyAttendanceDateFilter>('ALL')
  const customDate = ref('')

  const currentPage = ref(1)
  const pageSizeValue = ref('10')
  const pageSize = computed(() => Number(pageSizeValue.value) || 10)

  const selectedRecord = ref<TeamAttendanceRecord | null>(null)
  const isDetailsOpen = ref(false)

  const hasOffice = computed(() => office.value !== null)
  const officeLabel = computed(() =>
    office.value ? (office.value.code ? `${office.value.name} (${office.value.code})` : office.value.name) : '',
  )

  // ─── Fetch ───
  const fetchRecords = async () => {
    isLoading.value = true
    try {
      office.value = await teamService.getMyOffice()
      members.value = office.value ? await teamService.getTeamMembers(office.value.id) : []
      records.value = await teamService.getTeamAttendances(members.value)
      if (memberFilter.value !== 'ALL' && !members.value.some((m) => m.id === memberFilter.value)) {
        memberFilter.value = 'ALL'
      }
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Failed to load your team’s attendance.', 'error')
    } finally {
      isLoading.value = false
      hasLoaded.value = true
    }
  }

  // ─── Filters ───
  const memberOptions = computed(() => buildMemberOptions(members.value))
  const memberRecords = computed(() =>
    memberFilter.value === 'ALL' ? records.value : records.value.filter((r) => r.profileId === memberFilter.value),
  )
  const filteredRecords = computed(() =>
    memberRecords.value.filter(
      (record) =>
        teamRecordMatchesSearch(record, searchQuery.value) &&
        recordMatchesStatus(record, statusFilter.value) &&
        recordMatchesDate(record.attendanceDate, dateFilter.value, customDate.value),
    ),
  )

  const hasActiveFilters = computed(
    () =>
      memberFilter.value !== 'ALL' ||
      searchQuery.value.trim() !== '' ||
      statusFilter.value !== 'ALL' ||
      dateFilter.value !== 'ALL' ||
      customDate.value.trim() !== '',
  )

  /** Stats follow the person filter, so picking someone shows their totals. */
  const statsSummary = computed<AttendanceStatsSummary>(() => computeAttendanceStats(memberRecords.value))

  const resetFilters = () => {
    memberFilter.value = 'ALL'
    searchQuery.value = ''
    statusFilter.value = 'ALL'
    dateFilter.value = 'ALL'
    customDate.value = ''
    currentPage.value = 1
  }
  const clearMemberFilter = () => {
    memberFilter.value = 'ALL'
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

  /** Stat cards: "Total" clears the status/date/search filters (keeps the person); the others toggle. */
  const selectStatCard = (card: MyAttendanceStatCard) => {
    if (card.key === 'ALL') {
      searchQuery.value = ''
      statusFilter.value = 'ALL'
      dateFilter.value = 'ALL'
      customDate.value = ''
      return
    }
    statusFilter.value = statusFilter.value === card.key ? 'ALL' : card.key
  }
  const isStatCardActive = (card: MyAttendanceStatCard) =>
    card.key === 'ALL'
      ? statusFilter.value === 'ALL' && dateFilter.value === 'ALL' && !searchQuery.value.trim()
      : statusFilter.value === card.key

  const activeMemberLabel = computed(
    () => members.value.find((m) => m.id === memberFilter.value)?.fullName ?? '',
  )
  const activeStatusLabel = computed(() => formatPunchStatusLabel(statusFilter.value))
  const activeDateLabel = computed(() => {
    if (dateFilter.value === 'custom') return formatDisplayDateLong(customDate.value, 'Custom Date')
    return MY_DATE_OPTIONS.find((o) => o.value === dateFilter.value)?.label ?? ''
  })

  // Keep the person in the URL so a refresh or a shared link opens the same view.
  watch(memberFilter, (member) => {
    const query = { ...route.query }
    if (member === 'ALL') delete query.member
    else query.member = member
    void router.replace({ query })
  })

  // ─── Pagination ───
  const totalPages = computed(() => Math.max(1, Math.ceil(filteredRecords.value.length / pageSize.value)))
  const paginatedRecords = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value
    return filteredRecords.value.slice(start, start + pageSize.value)
  })

  watch([memberFilter, searchQuery, statusFilter, dateFilter, customDate, pageSizeValue], () => {
    currentPage.value = 1
  })
  watch(totalPages, (total) => {
    if (currentPage.value > total) currentPage.value = 1
  })

  const visiblePages = computed(() => getVisiblePages(currentPage.value, totalPages.value))
  const pageRange = computed(() => getPageRange(currentPage.value, pageSize.value, filteredRecords.value.length))
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

  // ─── Details dialog: the member's printed DTR (CS Form 48) for the record's month ───
  const dtrPreview = useDtrPreview((profileId, startDate, endDate) =>
    teamService.getMemberDtrAttendances(profileId, startDate, endDate),
  )
  const openDetails = (record: TeamAttendanceRecord) => {
    selectedRecord.value = record
    isDetailsOpen.value = true
    void dtrPreview.loadPreview({ profileId: record.profileId, fullName: record.fullName, date: record.attendanceDate })
  }
  const closeDetails = () => {
    isDetailsOpen.value = false
    selectedRecord.value = null
    dtrPreview.clearPreview()
  }
  const onDetailsOpenChange = (open: boolean) => {
    if (!open) closeDetails()
  }

  onMounted(() => {
    void fetchRecords()
  })

  return {
    officeLabel,
    hasOffice,
    hasLoaded,
    records,
    filteredRecords,
    paginatedRecords,
    isLoading,
    statsSummary,
    fetchRecords,
    // filters
    memberFilter,
    memberOptions,
    searchQuery,
    statusFilter,
    dateFilter,
    customDate,
    hasActiveFilters,
    activeMemberLabel,
    activeStatusLabel,
    activeDateLabel,
    resetFilters,
    clearMemberFilter,
    clearSearch,
    clearStatusFilter,
    clearDateFilter,
    clearCustomDate,
    statCards: TEAM_STAT_CARDS,
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
    ...dtrPreview,
    onDetailsOpenChange,
    closeDetails,
    // display helpers
    punchSlots: PUNCH_SLOTS,
    getPunchCell,
    isRecordAbsent,
    getInitials,
    formatPositionLabel,
    formatAttendanceDate: formatDisplayDateLong,
    formatDisplayDateTime,
    formatPunchStatusLabel,
    getPunchStatusBadgeClass,
  }
}
