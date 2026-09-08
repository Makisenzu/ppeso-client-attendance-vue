import { computed, onMounted, ref, watch } from 'vue'
import type {
  ProfileRecord,
  ProfileStatsSummary,
  UserFormData,
} from '@/types/peso/userManagement'
import { userManagementService } from '@/services/peso/userManagementService'
import { exportProfilesToCsv } from '@/helpers/peso/userManagementHelper'

export function useUserManagement() {
  const profiles = ref<ProfileRecord[]>([])
  const isLoading = ref<boolean>(false)
  const searchQuery = ref<string>('')
  const selectedPositionFilter = ref<string>('ALL')
  const selectedStatusFilter = ref<string>('ALL')

  const currentPage = ref<number>(1)
  const pageSize = ref<number>(10)

  const selectedProfile = ref<ProfileRecord | null>(null)
  const isDetailsOpen = ref<boolean>(false)

  // ─── Add User Dialog State ───
  const isAddUserOpen = ref<boolean>(false)
  const isSubmitting = ref<boolean>(false)
  const submitError = ref<string>('')
  const submitSuccess = ref<boolean>(false)

  const formData = ref<UserFormData>({
    email: '',
    password: '',
    firstname: '',
    middlename: '',
    lastname: '',
    position: 'employee',
  })

  // ─── Fetch Profiles ───
  const fetchProfiles = async () => {
    isLoading.value = true
    try {
      profiles.value = await userManagementService.getProfiles()
    } catch (err) {
      console.error('Failed to fetch profiles:', err)
    } finally {
      isLoading.value = false
    }
  }

  const refreshProfiles = async () => {
    await fetchProfiles()
  }

  // ─── Available Positions for Filter ───
  const availablePositions = computed<string[]>(() => {
    const set = new Set<string>()
    for (const p of profiles.value) {
      if (p.position) set.add(p.position.toUpperCase())
    }
    return Array.from(set).sort()
  })

  // ─── Filtered Records ───
  const filteredProfiles = computed<ProfileRecord[]>(() => {
    const q = searchQuery.value.trim().toLowerCase()
    const pos = selectedPositionFilter.value
    const status = selectedStatusFilter.value

    return profiles.value.filter((profile) => {
      // 1. Text search
      if (q) {
        const nameMatch = profile.fullName.toLowerCase().includes(q)
        const firstMatch = profile.firstname.toLowerCase().includes(q)
        const lastMatch = profile.lastname.toLowerCase().includes(q)
        const posMatch = profile.position.toLowerCase().includes(q)
        const idMatch = profile.id.toLowerCase().includes(q)
        const passcodeMatch = profile.passcode.includes(q)

        if (!nameMatch && !firstMatch && !lastMatch && !posMatch && !idMatch && !passcodeMatch) {
          return false
        }
      }

      // 2. Position filter
      if (pos !== 'ALL') {
        if (profile.position.toUpperCase() !== pos.toUpperCase()) {
          return false
        }
      }

      // 3. Status filter
      if (status !== 'ALL') {
        if (profile.status.toLowerCase() !== status.toLowerCase()) {
          return false
        }
      }

      return true
    })
  })

  // ─── Stats Summary ───
  const statsSummary = computed<ProfileStatsSummary>(() => {
    let activeCount = 0
    let inactiveCount = 0
    let pendingCount = 0

    for (const p of profiles.value) {
      switch (p.status) {
        case 'active':
          activeCount++
          break
        case 'inactive':
          inactiveCount++
          break
        case 'pending':
          pendingCount++
          break
      }
    }

    return {
      total: profiles.value.length,
      activeCount,
      inactiveCount,
      pendingCount,
    }
  })

  // ─── Pagination ───
  const totalPages = computed<number>(() => {
    const count = Math.ceil(filteredProfiles.value.length / pageSize.value)
    return count > 0 ? count : 1
  })

  const paginatedProfiles = computed<ProfileRecord[]>(() => {
    const start = (currentPage.value - 1) * pageSize.value
    return filteredProfiles.value.slice(start, start + pageSize.value)
  })

  watch([filteredProfiles, totalPages], () => {
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
    currentPage.value = 1
  }

  const clearSearch = () => {
    searchQuery.value = ''
  }

  // ─── Details Dialog ───
  const openDetails = (profile: ProfileRecord) => {
    selectedProfile.value = profile
    isDetailsOpen.value = true
  }

  const closeDetails = () => {
    isDetailsOpen.value = false
    selectedProfile.value = null
  }

  // ─── Add User Dialog ───
  const openAddUser = () => {
    formData.value = {
      email: '',
      password: '',
      firstname: '',
      middlename: '',
      lastname: '',
      position: 'employee',
    }
    submitError.value = ''
    submitSuccess.value = false
    isAddUserOpen.value = true
  }

  const closeAddUser = () => {
    isAddUserOpen.value = false
    submitError.value = ''
    submitSuccess.value = false
  }

  const handleAddUser = async () => {
    submitError.value = ''
    submitSuccess.value = false

    // Validation
    if (!formData.value.email.trim()) {
      submitError.value = 'Email is required'
      return
    }
    if (!formData.value.password.trim()) {
      submitError.value = 'Password is required'
      return
    }
    if (formData.value.password.length < 6) {
      submitError.value = 'Password must be at least 6 characters'
      return
    }
    if (!formData.value.firstname.trim()) {
      submitError.value = 'First name is required'
      return
    }
    if (!formData.value.lastname.trim()) {
      submitError.value = 'Last name is required'
      return
    }

    isSubmitting.value = true
    try {
      const result = await userManagementService.createUser(formData.value)

      if (!result.success) {
        submitError.value = result.error || 'Failed to create user'
        return
      }

      submitSuccess.value = true

      // Refresh list and close dialog after a brief delay
      await fetchProfiles()
      setTimeout(() => {
        closeAddUser()
      }, 1200)
    } catch (err) {
      submitError.value = err instanceof Error ? err.message : 'An unexpected error occurred'
    } finally {
      isSubmitting.value = false
    }
  }

  // ─── CSV Export ───
  const exportCsv = () => {
    exportProfilesToCsv(filteredProfiles.value)
  }

  onMounted(() => {
    fetchProfiles()
  })

  return {
    profiles,
    filteredProfiles,
    paginatedProfiles,
    availablePositions,
    totalPages,
    statsSummary,
    isLoading,
    searchQuery,
    selectedPositionFilter,
    selectedStatusFilter,
    currentPage,
    pageSize,
    selectedProfile,
    isDetailsOpen,
    isAddUserOpen,
    isSubmitting,
    submitError,
    submitSuccess,
    formData,
    fetchProfiles,
    refreshProfiles,
    resetFilters,
    clearSearch,
    setPage,
    prevPage,
    nextPage,
    openDetails,
    closeDetails,
    openAddUser,
    closeAddUser,
    handleAddUser,
    exportCsv,
  }
}
