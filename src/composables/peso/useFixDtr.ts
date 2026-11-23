import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { attendanceService } from '@/services/peso/attendanceService'
import { holidayService } from '@/services/peso/holidayService'
import { getPageRange } from '@/helpers/common/paginationHelper'
import { formatDisplayDateLong } from '@/helpers/common/dateFormatHelper'
import {
  getMonthDates,
  formatTimeDisplay,
  isRecordAbsent,
  isWeekendDate,
  manilaToday,
  toManilaTimeInput,
  validatePunchTimes,
} from '@/helpers/peso/attendanceHelper'
import { useToastAlert } from '@/composables/common/useToastAlert'
import type { AttendancePunchTimes, FixDtrDay, GipBeneficiary, PunchStatus } from '@/types/peso/attendance'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/**
 * Fix DTR (admin): every GIP beneficiary → Edit → pick a month → the month's dates → fix one date's punches.
 * Saving goes through core.admin_set_attendance (creates the day's record when there is none).
 */
export function useFixDtr() {
  const router = useRouter()
  const toast = useToastAlert()

  // ─── GIP list ───
  const gips = ref<GipBeneficiary[]>([])
  const isLoading = ref(false)
  const loadError = ref('')
  const searchQuery = ref('')
  const currentPage = ref(1)
  const pageSize = 10

  const loadGips = async () => {
    isLoading.value = true
    loadError.value = ''
    try {
      gips.value = await attendanceService.getGipBeneficiaries()
    } catch (err) {
      loadError.value = err instanceof Error ? err.message : 'Failed to load the GIP beneficiaries.'
    } finally {
      isLoading.value = false
    }
  }

  const filteredGips = computed(() => {
    const q = searchQuery.value.trim().toLowerCase()
    if (!q) return gips.value
    return gips.value.filter(
      (g) => g.fullName.toLowerCase().includes(q) || (g.officeName ?? '').toLowerCase().includes(q),
    )
  })
  const totalPages = computed(() => Math.max(1, Math.ceil(filteredGips.value.length / pageSize)))
  const paginatedGips = computed(() =>
    filteredGips.value.slice((currentPage.value - 1) * pageSize, currentPage.value * pageSize),
  )
  const pageRange = computed(() => getPageRange(currentPage.value, pageSize, filteredGips.value.length))
  watch(searchQuery, () => (currentPage.value = 1))
  const prevPage = () => (currentPage.value = Math.max(1, currentPage.value - 1))
  const nextPage = () => (currentPage.value = Math.min(totalPages.value, currentPage.value + 1))
  const clearSearch = () => (searchQuery.value = '')

  const goBack = () => router.push({ name: 'attendance' })

  // ─── Month view of one beneficiary ───
  const today = manilaToday()
  const [todayYear, todayMonth] = today.split('-').map(Number)
  const selectedGip = ref<GipBeneficiary | null>(null)
  const isMonthDialogOpen = ref(false)
  const selectedYear = ref(todayYear)
  /** 0-11; null until a month is picked */
  const selectedMonth = ref<number | null>(null)
  const days = ref<FixDtrDay[]>([])
  const isLoadingMonth = ref(false)
  const monthError = ref('')

  const yearOptions = Array.from({ length: 5 }, (_, i) => todayYear - i)
  const monthOptions = computed(() =>
    MONTH_NAMES.map((name, index) => ({
      index,
      name,
      // a month after the current one has nothing to fix yet
      disabled: selectedYear.value > todayYear || (selectedYear.value === todayYear && index + 1 > todayMonth),
    })),
  )
  const selectedMonthLabel = computed(() =>
    selectedMonth.value === null ? '' : `${MONTH_NAMES[selectedMonth.value]} ${selectedYear.value}`,
  )

  const loadMonth = async () => {
    const gip = selectedGip.value
    const month = selectedMonth.value
    if (!gip || month === null) return
    const dates = getMonthDates(selectedYear.value, month, today)
    if (dates.length === 0) {
      days.value = []
      return
    }
    const startDate = dates[0]
    const endDate = dates[dates.length - 1]
    isLoadingMonth.value = true
    monthError.value = ''
    try {
      const [records, holidays] = await Promise.all([
        attendanceService.getAttendancesByProfileAndDateRange(gip.id, startDate, endDate),
        holidayService.getHolidaysInRange(startDate, endDate).catch(() => []),
      ])
      // ignore a slower answer for a month or person no longer shown
      if (selectedGip.value?.id !== gip.id || selectedMonth.value !== month) return
      const byDate = new Map(records.map((r) => [r.attendanceDate, r]))
      const holidayByDate = new Map(holidays.map((h) => [h.date, h.name]))
      days.value = dates.map((date) => ({
        date,
        isWeekend: isWeekendDate(date),
        holidayName: holidayByDate.get(date) ?? null,
        record: byDate.get(date) ?? null,
      }))
    } catch {
      monthError.value = 'Failed to load the attendance for this month.'
    } finally {
      isLoadingMonth.value = false
    }
  }

  const openMonthDialog = (gip: GipBeneficiary) => {
    selectedGip.value = gip
    selectedYear.value = todayYear
    selectedMonth.value = null
    days.value = []
    monthError.value = ''
    isMonthDialogOpen.value = true
  }
  const closeMonthDialog = () => {
    isMonthDialogOpen.value = false
    selectedGip.value = null
    selectedMonth.value = null
    days.value = []
  }
  const selectMonth = (index: number) => {
    selectedMonth.value = index
    void loadMonth()
  }
  const setYear = (year: number) => {
    selectedYear.value = year
    selectedMonth.value = null
    days.value = []
  }
  const changeMonth = () => {
    selectedMonth.value = null
    days.value = []
  }

  /** The day's four punches for the table; a missing punch on an absent day reads as absent, as elsewhere */
  const dayPunches = (day: FixDtrDay) => {
    const r = day.record
    const absentDay = r ? isRecordAbsent(r) : false
    const cell = (key: string, time: string | null | undefined, status: PunchStatus | null | undefined) => ({
      key,
      time: time ? formatTimeDisplay(time) : null,
      status: time ? (status ?? null) : (status ?? (absentDay ? 'absent' : null)),
    })
    return [
      cell('amIn', r?.amCheckIn, r?.amInStatus),
      cell('amOut', r?.amCheckOut, r?.amOutStatus),
      cell('pmIn', r?.pmCheckIn, r?.pmInStatus),
      cell('pmOut', r?.pmCheckOut, r?.pmOutStatus),
    ]
  }

  // ─── Edit one date ───
  const dayToEdit = ref<FixDtrDay | null>(null)
  const isEditDialogOpen = ref(false)
  const isSavingEdit = ref(false)
  const editError = ref('')
  const editForm = ref<Record<keyof AttendancePunchTimes, string>>({ amIn: '', amOut: '', pmIn: '', pmOut: '' })
  const editSlots: { key: keyof AttendancePunchTimes; label: string }[] = [
    { key: 'amIn', label: 'AM Check In' },
    { key: 'amOut', label: 'AM Check Out' },
    { key: 'pmIn', label: 'PM Check In' },
    { key: 'pmOut', label: 'PM Check Out' },
  ]
  const editDescription = computed(() =>
    selectedGip.value && dayToEdit.value
      ? `${selectedGip.value.fullName} · ${formatDisplayDateLong(dayToEdit.value.date)}`
      : '',
  )

  const openEditDialog = (day: FixDtrDay) => {
    dayToEdit.value = day
    editForm.value = {
      amIn: toManilaTimeInput(day.record?.amCheckIn),
      amOut: toManilaTimeInput(day.record?.amCheckOut),
      pmIn: toManilaTimeInput(day.record?.pmCheckIn),
      pmOut: toManilaTimeInput(day.record?.pmCheckOut),
    }
    editError.value = ''
    isEditDialogOpen.value = true
  }
  const closeEditDialog = () => {
    if (isSavingEdit.value) return
    isEditDialogOpen.value = false
    dayToEdit.value = null
    editError.value = ''
  }
  const clearEditSlot = (key: keyof AttendancePunchTimes) => {
    editForm.value[key] = ''
  }

  const confirmEdit = async (): Promise<boolean> => {
    const gip = selectedGip.value
    const day = dayToEdit.value
    if (!gip || !day) return false
    const f = editForm.value
    const times: AttendancePunchTimes = {
      amIn: f.amIn || null,
      amOut: f.amOut || null,
      pmIn: f.pmIn || null,
      pmOut: f.pmOut || null,
    }
    const problem = validatePunchTimes(times)
    if (problem) {
      editError.value = problem
      return false
    }
    isSavingEdit.value = true
    editError.value = ''
    try {
      await attendanceService.setAttendancePunches(gip.id, day.date, times)
      isEditDialogOpen.value = false
      dayToEdit.value = null
      toast.show(`DTR for ${gip.fullName} on ${formatDisplayDateLong(day.date)} was updated.`, 'success')
      await loadMonth()
      return true
    } catch (err) {
      editError.value = err instanceof Error ? err.message : 'Failed to update the DTR. Please try again.'
      return false
    } finally {
      isSavingEdit.value = false
    }
  }

  onMounted(loadGips)

  return {
    // list
    gips,
    isLoading,
    loadError,
    loadGips,
    searchQuery,
    clearSearch,
    filteredGips,
    paginatedGips,
    currentPage,
    totalPages,
    pageRange,
    prevPage,
    nextPage,
    goBack,
    // month view
    selectedGip,
    isMonthDialogOpen,
    openMonthDialog,
    closeMonthDialog,
    selectedYear,
    selectedMonth,
    selectedMonthLabel,
    yearOptions,
    monthOptions,
    setYear,
    selectMonth,
    changeMonth,
    days,
    isLoadingMonth,
    monthError,
    loadMonth,
    dayPunches,
    // edit
    isEditDialogOpen,
    isSavingEdit,
    editError,
    editForm,
    editSlots,
    editDescription,
    openEditDialog,
    closeEditDialog,
    clearEditSlot,
    confirmEdit,
  }
}
