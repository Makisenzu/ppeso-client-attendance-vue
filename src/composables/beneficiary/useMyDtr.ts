import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { DtrGenerationResult, DtrOptions } from '@/types/peso/dtr'
import { myDtrService } from '@/services/beneficiary/myDtrService'
// Holidays are readable by every signed-in user (RLS "holidays: authenticated read").
import { holidayService } from '@/services/peso/holidayService'
import {
  DTR_DEFAULT_SUPERVISOR_NAME,
  DTR_DEFAULT_SUPERVISOR_TITLE,
  formatMonthHeader,
  generateDtrData,
  getDefaultDtrDateRange,
  getDtrPresetDateRange,
  type DtrPresetType,
} from '@/helpers/peso/dtrHelper'

/**
 * My DTR (beneficiary): Civil Service Form No. 48 for the signed-in user only.
 * Same options as the admin Generate DTR page, minus the employee picker.
 */
export function useMyDtr() {
  const router = useRouter()

  const myName = ref<string>('')
  const isLoadingName = ref(false)
  const isGenerating = ref(false)

  // ─── Dates ───
  const defaultDates = getDefaultDtrDateRange()
  const startDate = ref<string>(defaultDates.startDate)
  const endDate = ref<string>(defaultDates.endDate)

  // ─── Form 48 layout & signatory ───
  const regularHours = ref<string>('')
  const saturdayHours = ref<string>('')
  const supervisorName = ref<string>(DTR_DEFAULT_SUPERVISOR_NAME)
  const supervisorTitle = ref<string>(DTR_DEFAULT_SUPERVISOR_TITLE)
  const dualCopy = ref<boolean>(true)
  const rightCopyHasName = ref<boolean>(false)

  // ─── Output & errors ───
  const generatedData = ref<DtrGenerationResult | null>(null)
  const fetchError = ref<string | null>(null)

  const loadMyName = async () => {
    isLoadingName.value = true
    try {
      myName.value = await myDtrService.getMyFullName()
    } catch (err) {
      console.error('Failed to load my name for the DTR.')
      fetchError.value = err instanceof Error ? err.message : 'Failed to load your profile.'
    } finally {
      isLoadingName.value = false
    }
  }

  const applyPreset = (preset: DtrPresetType) => {
    const baseDate = new Date(startDate.value || new Date())
    const range = getDtrPresetDateRange(preset, baseDate)
    startDate.value = range.startDate
    endDate.value = range.endDate
  }

  const handleGenerate = async () => {
    if (!startDate.value || !endDate.value) {
      fetchError.value = 'Please provide both start date and end date.'
      return
    }
    if (startDate.value > endDate.value) {
      fetchError.value = 'Start date cannot be after end date.'
      return
    }

    fetchError.value = null
    isGenerating.value = true
    try {
      const [records, holidays] = await Promise.all([
        myDtrService.getMyAttendancesInRange(startDate.value, endDate.value),
        holidayService.getHolidaysInRange(startDate.value, endDate.value),
      ])

      const options: DtrOptions = {
        employee: myName.value ? { fullName: myName.value } : null,
        startDate: startDate.value,
        endDate: endDate.value,
        regularHours: regularHours.value,
        saturdayHours: saturdayHours.value,
        supervisorName: supervisorName.value || 'PGDH',
        supervisorTitle: supervisorTitle.value || '(PESO Manager)',
        duplicateLayout: dualCopy.value,
      }
      generatedData.value = generateDtrData(options, records, holidays)
    } catch (err) {
      console.error('Failed to generate my DTR.')
      fetchError.value =
        err instanceof Error && err.message ? err.message : 'Failed to generate DTR. Please try again.'
    } finally {
      isGenerating.value = false
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const goBack = () => {
    router.push({ name: 'beneficiary-attendance' })
  }

  const clearFetchError = () => {
    fetchError.value = null
  }

  /** Quick date-range buttons (same as the admin page). */
  const presets: { key: DtrPresetType; label: string }[] = [
    { key: 'firstHalf', label: '1st Half (1-15)' },
    { key: 'secondHalf', label: '2nd Half (16-End)' },
    { key: 'wholeMonth', label: 'Full Month' },
    { key: 'toCurrentDay', label: 'Month to Date' },
  ]

  onMounted(() => {
    void loadMyName()
  })

  return {
    myName,
    isLoadingName,
    isGenerating,
    startDate,
    endDate,
    regularHours,
    saturdayHours,
    supervisorName,
    supervisorTitle,
    dualCopy,
    rightCopyHasName,
    generatedData,
    fetchError,
    presets,
    formatMonthHeader,
    applyPreset,
    handleGenerate,
    handlePrint,
    goBack,
    clearFetchError,
  }
}
