import { computed, onMounted, ref, watch } from 'vue'
import type {
  EditUserFormData,
  ProfileRecord,
  ProfileStatsSummary,
  UserFormData,
} from '@/types/peso/userManagement'
import { userManagementService } from '@/services/peso/userManagementService'
import { authService } from '@/services/common/authService'
import { exportProfilesToCsv, getDefaultRoleForPosition } from '@/helpers/peso/userManagementHelper'
import { useOfficeStore } from '@/stores/officeStore'

export function useUserManagement() {
  const officeStore = useOfficeStore()
  const profiles = ref<ProfileRecord[]>([])
  const isLoading = ref<boolean>(false)
  const searchQuery = ref<string>('')
  const selectedPositionFilter = ref<string>('ALL')
  const selectedStatusFilter = ref<string>('ALL')

  const currentPage = ref<number>(1)
  const pageSize = ref<number>(10)

  const selectedProfile = ref<ProfileRecord | null>(null)
  const isDetailsOpen = ref<boolean>(false)

  // ─── Active Offices for Add User ───
  const activeOffices = computed(() => officeStore.activeOffices)
  const isOfficesLoading = computed(() => officeStore.isLoading)

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
    officeId: '',
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
        const officeMatch = Boolean(
          (profile.officeName && profile.officeName.toLowerCase().includes(q)) ||
          (profile.officeCode && profile.officeCode.toLowerCase().includes(q)),
        )

        if (!nameMatch && !firstMatch && !lastMatch && !posMatch && !idMatch && !passcodeMatch && !officeMatch) {
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
  const openAddUser = async () => {
    formData.value = {
      email: '',
      password: '',
      firstname: '',
      middlename: '',
      lastname: '',
      position: 'employee',
      officeId: '',
    }
    submitError.value = ''
    submitSuccess.value = false
    isAddUserOpen.value = true

    if (officeStore.offices.length === 0) {
      await officeStore.fetchOffices()
    }
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

      // Close right away, confirm on the page, and refresh the list in the background.
      const fullName = `${formData.value.firstname} ${formData.value.lastname}`.trim()
      closeAddUser()
      showFeedback(`User ${fullName || 'account'} was created successfully.`, 'success')
      void fetchProfiles()
    } catch (err) {
      submitError.value = err instanceof Error ? err.message : 'An unexpected error occurred'
    } finally {
      isSubmitting.value = false
    }
  }

  // ─── Edit User ───
  const isEditUserOpen = ref<boolean>(false)
  const editingProfile = ref<ProfileRecord | null>(null)
  const isSavingEdit = ref<boolean>(false)
  const editError = ref<string>('')
  const currentUserId = ref<string | null>(null)
  const editForm = ref<EditUserFormData>({
    firstname: '',
    middlename: '',
    lastname: '',
    position: 'employee',
    role: '',
    status: 'active',
    officeId: '',
  })

  /** Active offices, plus the user's current office if it is inactive (so saving never drops it). */
  const editOfficeOptions = computed(() => {
    const currentId = editingProfile.value?.officeId
    return officeStore.offices.filter((o) => o.isActive || o.id === currentId)
  })

  /** Admins can't change their own role or status, so they can't lock themselves out. */
  const isEditingSelf = computed(
    () => !!editingProfile.value && editingProfile.value.id === currentUserId.value,
  )

  const openEditUser = async (profile: ProfileRecord) => {
    editingProfile.value = profile
    editForm.value = {
      firstname: profile.firstname,
      middlename: profile.middlename || '',
      lastname: profile.lastname,
      position: profile.position,
      role: profile.role ?? '',
      status: profile.status,
      officeId: profile.officeId || '',
    }
    editError.value = ''
    isEditUserOpen.value = true

    if (officeStore.offices.length === 0) {
      void officeStore.fetchOffices()
    }
    if (currentUserId.value === null) {
      const user = await authService.getCurrentUser()
      currentUserId.value = user?.id ?? null
    }
  }

  /** Picking a position fills in its usual role; the admin can still change the role afterwards. */
  const onEditPositionChange = () => {
    if (isEditingSelf.value) return
    editForm.value.role = getDefaultRoleForPosition(editForm.value.position) ?? ''
  }

  const resetEditUser = () => {
    isEditUserOpen.value = false
    editingProfile.value = null
    editError.value = ''
  }

  /** Cancel / dismiss — ignored while saving. */
  const closeEditUser = () => {
    if (isSavingEdit.value) return
    resetEditUser()
  }

  const handleEditUser = async () => {
    if (!editingProfile.value) return
    editError.value = ''

    if (!editForm.value.firstname.trim()) {
      editError.value = 'First name is required'
      return
    }
    if (!editForm.value.lastname.trim()) {
      editError.value = 'Last name is required'
      return
    }

    // Never send a change to your own role or status.
    const payload: EditUserFormData = isEditingSelf.value
      ? {
          ...editForm.value,
          role: editingProfile.value.role ?? '',
          status: editingProfile.value.status,
        }
      : editForm.value

    isSavingEdit.value = true
    try {
      const result = await userManagementService.updateUser(editingProfile.value.id, payload)
      if (!result.success) {
        editError.value = result.error || 'Failed to update user'
        return
      }

      const fullName = `${payload.firstname} ${payload.lastname}`.trim()
      resetEditUser()
      showFeedback(`User ${fullName} was updated successfully.`, 'success')
      void fetchProfiles()
    } catch (err) {
      editError.value = err instanceof Error ? err.message : 'An unexpected error occurred'
    } finally {
      isSavingEdit.value = false
    }
  }

  // ─── Delete State & Actions ───
  const profileToDelete = ref<ProfileRecord | null>(null)
  const isDeleteDialogOpen = ref<boolean>(false)
  const isDeleting = ref<boolean>(false)
  const feedbackMessage = ref<{ type: 'success' | 'error'; text: string } | null>(null)

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    feedbackMessage.value = { type, text }
    setTimeout(() => {
      feedbackMessage.value = null
    }, 4000)
  }

  const dismissFeedback = () => {
    feedbackMessage.value = null
  }

  const openDeleteDialog = (profile: ProfileRecord) => {
    profileToDelete.value = profile
    isDeleteDialogOpen.value = true
  }

  const closeDeleteDialog = () => {
    if (isDeleting.value) return
    isDeleteDialogOpen.value = false
    profileToDelete.value = null
  }

  const confirmDelete = async (): Promise<boolean> => {
    if (!profileToDelete.value) return false
    const id = profileToDelete.value.id
    const userName = profileToDelete.value.fullName || 'User'
    isDeleting.value = true
    try {
      const result = await userManagementService.deleteUser(id)
      if (!result.success) {
        showFeedback(result.error || 'Failed to delete user profile', 'error')
        return false
      }
      profiles.value = profiles.value.filter((p) => p.id !== id)
      if (selectedProfile.value?.id === id) {
        closeDetails()
      }
      isDeleteDialogOpen.value = false
      profileToDelete.value = null
      showFeedback(`User ${userName} was deleted successfully.`, 'success')
      return true
    } catch (err: any) {
      console.error('Failed to delete profile:', err)
      showFeedback(err?.message || 'Failed to delete user profile', 'error')
      return false
    } finally {
      isDeleting.value = false
    }
  }

  // ─── CSV Export ───
  const exportCsv = () => {
    exportProfilesToCsv(filteredProfiles.value)
  }

  onMounted(() => {
    fetchProfiles()
    if (officeStore.offices.length === 0) {
      officeStore.fetchOffices()
    }
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
    activeOffices,
    isOfficesLoading,
    profileToDelete,
    isDeleteDialogOpen,
    isDeleting,
    feedbackMessage,
    dismissFeedback,
    openDeleteDialog,
    closeDeleteDialog,
    confirmDelete,
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
    isEditUserOpen,
    editingProfile,
    isSavingEdit,
    editError,
    editForm,
    isEditingSelf,
    editOfficeOptions,
    openEditUser,
    onEditPositionChange,
    closeEditUser,
    handleEditUser,
    exportCsv,
  }
}
