import { computed, ref, watch, type Ref } from 'vue'
import type { ProfileRecord } from '@/types/peso/userManagement'
import type { AttendanceRecord } from '@/types/peso/attendance'
import type { DtrGenerationResult, DtrOptions } from '@/types/peso/dtr'
import { attendanceService } from '@/services/peso/attendanceService'
import { userManagementService } from '@/services/peso/userManagementService'
import {
  generateDtrData,
  getDefaultDtrDateRange,
  getDtrPresetDateRange,
  type DtrPresetType,
} from '@/helpers/peso/dtrHelper'

export interface UseDtrModalOptions {
  open: Ref<boolean>
  initialProfileId?: Ref<string | null | undefined>
  existingAttendances?: Ref<AttendanceRecord[] | undefined>
  emit: {
    (e: 'update:open', val: boolean): void
  }
}

export function useDtrModal(options: UseDtrModalOptions) {
  const { open, initialProfileId, existingAttendances, emit } = options

  // ─── Step & Loading State ───
  const currentStep = ref<'config' | 'preview'>('config')
  const isLoadingProfiles = ref(false)
  const isGenerating = ref(false)

  // ─── Employee State ───
  const profiles = ref<ProfileRecord[]>([])
  const selectedProfileId = ref<string>('')
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

  // ─── Selected Employee Computed ───
  const selectedEmployee = computed<ProfileRecord | null>(() => {
    if (!selectedProfileId.value) return null
    return profiles.value.find((p) => p.id === selectedProfileId.value) || null
  })

  // ─── Filtered Employees for Selector Dropdown ───
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
    if (profiles.value.length > 0) return
    isLoadingProfiles.value = true
    try {
      const list = await userManagementService.getProfiles()
      profiles.value = list
      if (!selectedProfileId.value && list.length > 0) {
        if (initialProfileId?.value) {
          selectedProfileId.value = initialProfileId.value
        } else {
          selectedProfileId.value = list[0].id
        }
      }
    } catch (e) {
      console.error('Failed to load profiles for DTR modal:', e)
    } finally {
      isLoadingProfiles.value = false
    }
  }

  // ─── Watch Open Modal ───
  watch(
    open,
    (val) => {
      if (val) {
        currentStep.value = 'config'
        loadProfiles()
        if (initialProfileId?.value) {
          selectedProfileId.value = initialProfileId.value
        }
      }
    }
  )

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
      let records: AttendanceRecord[] = []
      try {
        records = await attendanceService.getAttendancesByProfileAndDateRange(
          selectedProfileId.value,
          startDate.value,
          endDate.value
        )
      } catch (e) {
        console.warn('API fetch by date range returned error, checking in-memory cache:', e)
      }

      if ((!records || records.length === 0) && existingAttendances?.value) {
        records = existingAttendances.value.filter(
          (r) =>
            r.profileId === selectedProfileId.value &&
            r.attendanceDate >= startDate.value &&
            r.attendanceDate <= endDate.value
        )
      }

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
      currentStep.value = 'preview'
    } catch (err: any) {
      console.error('Error generating DTR:', err)
      fetchError.value = err.message || 'Failed to generate DTR. Please try again.'
    } finally {
      isGenerating.value = false
    }
  }

  // ─── Actions ───
  const handlePrint = () => {
    window.print()
  }

  const handleClose = () => {
    emit('update:open', false)
  }

  const selectEmployee = (id: string) => {
    selectedProfileId.value = id
    isEmployeeDropdownOpen.value = false
  }

  const clearFetchError = () => {
    fetchError.value = null
  }

  const setStep = (step: 'config' | 'preview') => {
    currentStep.value = step
  }

  return {
    currentStep,
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
    handleClose,
    selectEmployee,
    clearFetchError,
    setStep,
  }
}
