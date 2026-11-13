import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { holidayService } from '@/services/peso/holidayService'
import {
  buildMonthGrid,
  formatMonthTitle,
  formatWeekday,
  toHolidayMap,
  toIsoDate,
  WEEKDAY_LABELS,
} from '@/helpers/peso/holidayHelper'
import { formatDisplayDate } from '@/helpers/common/dateFormatHelper'
import type { CalendarDayCell, HolidayFormData, HolidayRecord } from '@/types/peso/holiday'

const DELETE_PREVIEW_LIMIT = 50

/** Admin Calendar page: set the holidays that print on DTRs and pause absence flagging. */
export function useHolidayCalendar() {
  const today = new Date()

  // ─── Data ───
  const holidays = ref<HolidayRecord[]>([])
  const isLoading = ref(false)
  const loadError = ref<string | null>(null)

  // ─── Feedback banner ───
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

  const fetchHolidays = async () => {
    isLoading.value = true
    loadError.value = null
    try {
      holidays.value = await holidayService.getHolidays()
    } catch (err) {
      console.error('Failed to load holidays:', err)
      loadError.value = 'Failed to load holidays.'
    } finally {
      isLoading.value = false
    }
  }

  const holidaysByDate = computed(() => toHolidayMap(holidays.value))

  // ─── Month grid ───
  const viewYear = ref(today.getFullYear())
  const viewMonth = ref(today.getMonth())

  const monthTitle = computed(() => formatMonthTitle(viewYear.value, viewMonth.value))
  const weekdayLabels = WEEKDAY_LABELS
  const calendarCells = computed<CalendarDayCell[]>(() =>
    buildMonthGrid(viewYear.value, viewMonth.value, holidaysByDate.value, today),
  )

  const shiftMonth = (delta: number) => {
    const next = new Date(viewYear.value, viewMonth.value + delta, 1)
    viewYear.value = next.getFullYear()
    viewMonth.value = next.getMonth()
  }
  const prevMonth = () => shiftMonth(-1)
  const nextMonth = () => shiftMonth(1)
  const goToToday = () => {
    viewYear.value = today.getFullYear()
    viewMonth.value = today.getMonth()
  }

  // ─── Year list (follows the month grid's year) ───
  const yearHolidays = computed(() =>
    holidays.value
      .filter((h) => h.date.startsWith(`${viewYear.value}-`))
      .map((h) => ({ ...h, displayDate: formatDisplayDate(h.date), weekday: formatWeekday(h.date) })),
  )

  // ─── Bulk selection (year list) ───
  const selectedIds = ref<Set<string>>(new Set())
  const selectedCount = computed(() => selectedIds.value.size)
  const isAllSelected = computed(
    () => yearHolidays.value.length > 0 && yearHolidays.value.every((h) => selectedIds.value.has(h.id)),
  )
  const isPartiallySelected = computed(
    () => !isAllSelected.value && yearHolidays.value.some((h) => selectedIds.value.has(h.id)),
  )
  const isSelected = (id: string) => selectedIds.value.has(id)

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds.value)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    selectedIds.value = next
  }

  const toggleSelectAll = () => {
    selectedIds.value = isAllSelected.value ? new Set() : new Set(yearHolidays.value.map((h) => h.id))
  }

  const clearSelection = () => {
    selectedIds.value = new Set()
  }

  // Never keep holidays from another year selected.
  watch(yearHolidays, (list) => {
    if (selectedIds.value.size === 0) return
    const visible = new Set(list.map((h) => h.id))
    const pruned = new Set([...selectedIds.value].filter((id) => visible.has(id)))
    if (pruned.size !== selectedIds.value.size) selectedIds.value = pruned
  })

  // ─── Add / Edit ───
  const isFormOpen = ref(false)
  const editingId = ref<string | null>(null)
  const isSubmitting = ref(false)
  const formData = ref<HolidayFormData>({ date: toIsoDate(today), name: '' })
  const formErrors = ref<Record<string, string>>({})
  const isEditMode = computed(() => editingId.value !== null)

  /** Opens the Add dialog; `date` (yyyy-mm-dd) pre-fills it — ignored when called as a click handler. */
  const openCreate = (date?: unknown) => {
    editingId.value = null
    formData.value = { date: typeof date === 'string' ? date : toIsoDate(today), name: '' }
    formErrors.value = {}
    isFormOpen.value = true
  }

  const openEdit = (holiday: HolidayRecord) => {
    editingId.value = holiday.id
    formData.value = { date: holiday.date, name: holiday.name }
    formErrors.value = {}
    isFormOpen.value = true
  }

  /** Clicking a day: edit its holiday, or add one on that date. */
  const onDayClick = (cell: CalendarDayCell) => {
    if (cell.holiday) openEdit(cell.holiday)
    else openCreate(cell.date)
  }

  const resetForm = () => {
    isFormOpen.value = false
    editingId.value = null
    formErrors.value = {}
  }

  /** Cancel / dismiss — ignored while saving. */
  const closeForm = () => {
    if (isSubmitting.value) return
    resetForm()
  }

  const validate = (): boolean => {
    const errors: Record<string, string> = {}
    if (!/^\d{4}-\d{2}-\d{2}$/.test(formData.value.date)) errors.date = 'Pick a date'
    if (!formData.value.name.trim()) errors.name = 'Holiday name is required'
    else if (formData.value.name.trim().length > 60) errors.name = 'Keep the name under 60 characters'
    formErrors.value = errors
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (): Promise<boolean> => {
    if (!validate()) return false
    isSubmitting.value = true
    const label = `${formData.value.name.trim()} (${formatDisplayDate(formData.value.date)})`
    try {
      if (editingId.value) {
        await holidayService.updateHoliday(editingId.value, formData.value)
        showFeedback(`${label} updated.`)
      } else {
        await holidayService.createHoliday(formData.value)
        showFeedback(`${label} added.`)
      }
      // Show the saved date's month.
      const [y, m] = formData.value.date.split('-').map(Number)
      viewYear.value = y
      viewMonth.value = m - 1
      resetForm()
      await fetchHolidays()
      return true
    } catch (err) {
      formErrors.value = {
        ...formErrors.value,
        submit: err instanceof Error ? err.message : 'Failed to save the holiday.',
      }
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  // ─── Delete (single + bulk share one confirmation) ───
  const isDeleteDialogOpen = ref(false)
  const isDeleting = ref(false)
  const holidaysToDelete = ref<HolidayRecord[]>([])

  const deletePreview = computed(() =>
    holidaysToDelete.value
      .slice(0, DELETE_PREVIEW_LIMIT)
      .map((h) => ({ ...h, displayDate: formatDisplayDate(h.date) })),
  )
  const deleteOverflow = computed(() => Math.max(0, holidaysToDelete.value.length - DELETE_PREVIEW_LIMIT))

  const openDeleteDialog = (holiday: HolidayRecord) => {
    holidaysToDelete.value = [holiday]
    isDeleteDialogOpen.value = true
  }

  /** "Delete" inside the edit dialog: close it and confirm deleting that holiday. */
  const deleteFromForm = () => {
    const holiday = holidays.value.find((h) => h.id === editingId.value)
    if (!holiday) return
    resetForm()
    openDeleteDialog(holiday)
  }

  const openBulkDeleteDialog = () => {
    const selected = yearHolidays.value.filter((h) => selectedIds.value.has(h.id))
    if (selected.length === 0) return
    holidaysToDelete.value = selected
    isDeleteDialogOpen.value = true
  }

  const resetDeleteDialog = () => {
    isDeleteDialogOpen.value = false
    holidaysToDelete.value = []
  }

  /** Cancel / dismiss — ignored while deleting. */
  const closeDeleteDialog = () => {
    if (isDeleting.value) return
    resetDeleteDialog()
  }

  const confirmDelete = async (): Promise<boolean> => {
    const ids = holidaysToDelete.value.map((h) => h.id)
    if (ids.length === 0) return false
    isDeleting.value = true
    try {
      const deletedIds = await holidayService.deleteHolidays(ids)
      const deleted = new Set(deletedIds)
      holidays.value = holidays.value.filter((h) => !deleted.has(h.id))
      selectedIds.value = new Set([...selectedIds.value].filter((id) => !deleted.has(id)))
      resetDeleteDialog()

      const skipped = ids.length - deletedIds.length
      if (skipped > 0) {
        showFeedback(`Deleted ${deletedIds.length} of ${ids.length} holidays. ${skipped} could not be deleted.`, 'error')
      } else {
        showFeedback(`${deletedIds.length} ${deletedIds.length === 1 ? 'holiday' : 'holidays'} deleted.`)
      }
      return true
    } catch (err) {
      console.error('Failed to delete holidays:', err)
      showFeedback(err instanceof Error ? err.message : 'Failed to delete. Please try again.', 'error')
      await fetchHolidays()
      return false
    } finally {
      isDeleting.value = false
    }
  }

  onMounted(() => {
    fetchHolidays()
  })

  onUnmounted(() => {
    if (feedbackTimer) clearTimeout(feedbackTimer)
  })

  return {
    isLoading,
    loadError,
    fetchHolidays,
    feedbackMessage,
    dismissFeedback,
    viewYear,
    monthTitle,
    weekdayLabels,
    calendarCells,
    prevMonth,
    nextMonth,
    goToToday,
    onDayClick,
    yearHolidays,
    selectedCount,
    isAllSelected,
    isPartiallySelected,
    isSelected,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    isFormOpen,
    isEditMode,
    isSubmitting,
    formData,
    formErrors,
    openCreate,
    openEdit,
    closeForm,
    handleSubmit,
    deleteFromForm,
    isDeleteDialogOpen,
    isDeleting,
    holidaysToDelete,
    deletePreview,
    deleteOverflow,
    openDeleteDialog,
    openBulkDeleteDialog,
    closeDeleteDialog,
    confirmDelete,
  }
}
