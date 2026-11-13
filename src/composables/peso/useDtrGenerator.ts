import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { ProfileRecord } from '@/types/peso/userManagement'
import type { DtrGenerationResult, DtrOptions } from '@/types/peso/dtr'
import { attendanceService } from '@/services/peso/attendanceService'
import { userManagementService } from '@/services/peso/userManagementService'
import {
  generateDtrData,
  getDefaultDtrDateRange,
  getDtrPresetDateRange,
  type DtrPresetType,
} from '@/helpers/peso/dtrHelper'

/**
 * State and actions for the Generate DTR page (Civil Service Form No. 48).
 * The selected employee is kept in the `profileId` query param so the page can be
 * opened for a specific person and survives a reload.
 */
export function useDtrGenerator() {
  const route = useRoute()
  const router = useRouter()

  // ─── Loading State ───
  const isLoadingProfiles = ref(false)
  const isGenerating = ref(false)

  // ─── Employee State ───
  const profiles = ref<ProfileRecord[]>([])
  const selectedProfileId = ref<string>(
    typeof route.query.profileId === 'string' ? route.query.profileId : '',
  )
  const employeeSearch = ref('')
  const isEmployeeDropdownOpen = ref(false)

  // ─── Dates ───
  const defaultDates = getDefaultDtrDateRange()
  const startDate = ref<string>(defaultDates.startDate)
  const endDate = ref<string>(defaultDates.endDate)

  // ─── Form 48 Layout & Signatories ───
  const regularHours = ref<string>('')
  const saturdayHours = ref<string>('')
  const supervisorName = ref<string>('PAULINE J. ANG')
  const supervisorTitle = ref<string>('PGDH / PESO Manager')
  const dualCopy = ref<boolean>(true)
  const rightCopyHasName = ref<boolean>(false)

  // ─── Output & Errors ───
  const generatedData = ref<DtrGenerationResult | null>(null)
  const fetchError = ref<string | null>(null)

  const selectedEmployee = computed<ProfileRecord | null>(() => {
    if (!selectedProfileId.value) return null
    return profiles.value.find((p) => p.id === selectedProfileId.value) || null
  })

  const filteredEmployees = computed(() => {
    const q = employeeSearch.value.trim().toLowerCase()
    if (!q) return profiles.value
    return profiles.value.filter((p) => {
      return (
        p.fullName.toLowerCase().includes(q) ||
        (p.position || '').toLowerCase().includes(q) ||
        (p.firstname || '').toLowerCase().includes(q) ||
        (p.lastname || '').toLowerCase().includes(q)
      )
    })
  })

  // ─── Load Profiles ───
  const loadProfiles = async () => {
    isLoadingProfiles.value = true
    try {
      const list = await userManagementService.getProfiles()
      profiles.value = list
      const requestedExists = list.some((p) => p.id === selectedProfileId.value)
      if (!requestedExists && list.length > 0) {
        selectedProfileId.value = list[0].id
      }
    } catch (e) {
      console.error('Failed to load profiles for DTR generation:', e)
      fetchError.value = 'Failed to load employees. Please refresh the page.'
    } finally {
      isLoadingProfiles.value = false
    }
  }

  // Keep the selected employee in the URL; a new selection invalidates the preview.
  watch(selectedProfileId, (id, previousId) => {
    if (id !== route.query.profileId) {
      router.replace({ query: { ...route.query, profileId: id || undefined } })
    }
    if (previousId && id !== previousId) {
      generatedData.value = null
    }
  })

  // ─── Presets ───
  const applyPreset = (preset: DtrPresetType) => {
    const baseDate = new Date(startDate.value || new Date())
    const range = getDtrPresetDateRange(preset, baseDate)
    startDate.value = range.startDate
    endDate.value = range.endDate
  }

  // ─── Generate DTR ───
  const handleGenerate = async () => {
    if (!selectedProfileId.value) {
      fetchError.value = 'Please select an employee first.'
      return
    }
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
      const records = await attendanceService.getAttendancesByProfileAndDateRange(
        selectedProfileId.value,
        startDate.value,
        endDate.value,
      )

      const options: DtrOptions = {
        employee: selectedEmployee.value,
        startDate: startDate.value,
        endDate: endDate.value,
        regularHours: regularHours.value,
        saturdayHours: saturdayHours.value,
        supervisorName: supervisorName.value || 'PGDH',
        supervisorTitle: supervisorTitle.value || '(PESO Manager)',
        duplicateLayout: dualCopy.value,
      }

      generatedData.value = generateDtrData(options, records)
    } catch (err: unknown) {
      console.error('Error generating DTR:', err)
      fetchError.value =
        err instanceof Error && err.message ? err.message : 'Failed to generate DTR. Please try again.'
    } finally {
      isGenerating.value = false
    }
  }

  // ─── Actions ───
  const handlePrint = () => {
    window.print()
  }

  const goBack = () => {
    router.push({ name: 'attendance' })
  }

  const selectEmployee = (id: string) => {
    selectedProfileId.value = id
    isEmployeeDropdownOpen.value = false
    employeeSearch.value = ''
  }

  const clearFetchError = () => {
    fetchError.value = null
  }

  onMounted(() => {
    loadProfiles()
  })

  /** Quick date-range buttons. */
  const presets: { key: DtrPresetType; label: string }[] = [
    { key: 'firstHalf', label: '1st Half (1-15)' },
    { key: 'secondHalf', label: '2nd Half (16-End)' },
    { key: 'wholeMonth', label: 'Full Month' },
    { key: 'toCurrentDay', label: 'Month to Date' },
  ]

  return {
    presets,
    isLoadingProfiles,
    isGenerating,
    profiles,
    selectedProfileId,
    employeeSearch,
    isEmployeeDropdownOpen,
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
    selectedEmployee,
    filteredEmployees,
    applyPreset,
    handleGenerate,
    handlePrint,
    goBack,
    selectEmployee,
    clearFetchError,
  }
}
