import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { officeKioskService } from '@/services/peso/officeKioskService'
import { useOfficeStore } from '@/stores/officeStore'
import type { OfficeKiosk, OfficeKioskFormData, OfficeKioskFormErrors } from '@/types/peso/officeKiosk'
import type { SearchSelectOption } from '@/types/common/searchSelect'
import {
  KIOSK_DEFAULT_PASSWORD,
  KIOSK_LABEL_MAX,
  KIOSK_PASSWORD_MIN,
  KIOSK_STATUS_FILTER_OPTIONS,
  kioskMatches,
  suggestKioskEmail,
  suggestKioskLabel,
  validateKioskForm,
} from '@/helpers/peso/officeKioskHelper'
import { getPageRange, getVisiblePages } from '@/helpers/common/paginationHelper'
import { useToastAlert } from '@/composables/common/useToastAlert'

/**
 * PACD → Office Kiosks (admins): a sign-in account per office PACD computer. Signed in on that computer, the kiosk
 * records attendance for the office's own people only.
 */
export function useOfficeKiosks() {
  const toast = useToastAlert()
  const officeStore = useOfficeStore()
  const { activeOffices } = storeToRefs(officeStore)

  // ─── Data ───
  const kiosks = ref<OfficeKiosk[]>([])
  const isLoading = ref(false)
  const loadError = ref<string | null>(null)

  const fetchKiosks = async () => {
    isLoading.value = true
    loadError.value = null
    try {
      kiosks.value = await officeKioskService.getKiosks()
    } catch (err) {
      console.error('Failed to load the office kiosks.')
      loadError.value = err instanceof Error ? err.message : 'Failed to load the office kiosks.'
    } finally {
      isLoading.value = false
    }
  }

  const officeOptions = computed<SearchSelectOption[]>(() =>
    activeOffices.value.map((o) => ({ value: o.id, label: o.code ? `${o.name} (${o.code})` : o.name })),
  )

  // ─── Search, filter & pagination ───
  const searchQuery = ref('')
  const statusFilter = ref('ALL')
  const filteredKiosks = computed(() => kiosks.value.filter((k) => kioskMatches(k, searchQuery.value, statusFilter.value)))
  const hasActiveFilters = computed(() => searchQuery.value.trim() !== '' || statusFilter.value !== 'ALL')
  const resetFilters = () => {
    searchQuery.value = ''
    statusFilter.value = 'ALL'
  }

  const pageSize = 10
  const currentPage = ref(1)
  const totalPages = computed(() => Math.max(1, Math.ceil(filteredKiosks.value.length / pageSize)))
  const paginatedKiosks = computed(() => {
    const start = (currentPage.value - 1) * pageSize
    return filteredKiosks.value.slice(start, start + pageSize)
  })
  const pageRange = computed(() => getPageRange(currentPage.value, pageSize, filteredKiosks.value.length))
  const visiblePages = computed(() => getVisiblePages(currentPage.value, totalPages.value))
  const setPage = (page: number) => {
    if (page >= 1 && page <= totalPages.value) currentPage.value = page
  }
  watch([searchQuery, statusFilter], () => {
    currentPage.value = 1
  })
  watch(totalPages, (pages) => {
    if (currentPage.value > pages) currentPage.value = pages
  })

  // ─── Bulk selection ───
  const selectedIds = ref<Set<string>>(new Set())
  const selectedCount = computed(() => selectedIds.value.size)
  const isSelected = (id: string) => selectedIds.value.has(id)
  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds.value)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    selectedIds.value = next
  }
  const isAllPageSelected = computed(
    () => paginatedKiosks.value.length > 0 && paginatedKiosks.value.every((k) => selectedIds.value.has(k.id)),
  )
  const isPagePartiallySelected = computed(
    () => !isAllPageSelected.value && paginatedKiosks.value.some((k) => selectedIds.value.has(k.id)),
  )
  const isAllFilteredSelected = computed(
    () => filteredKiosks.value.length > 0 && selectedIds.value.size === filteredKiosks.value.length,
  )
  const toggleSelectPage = () => {
    const next = new Set(selectedIds.value)
    if (isAllPageSelected.value) paginatedKiosks.value.forEach((k) => next.delete(k.id))
    else paginatedKiosks.value.forEach((k) => next.add(k.id))
    selectedIds.value = next
  }
  const selectAllFiltered = () => {
    selectedIds.value = new Set(filteredKiosks.value.map((k) => k.id))
  }
  const clearSelection = () => {
    selectedIds.value = new Set()
  }
  watch(filteredKiosks, (rows) => {
    if (selectedIds.value.size === 0) return
    const visible = new Set(rows.map((k) => k.id))
    const pruned = new Set([...selectedIds.value].filter((id) => visible.has(id)))
    if (pruned.size !== selectedIds.value.size) selectedIds.value = pruned
  })

  // ─── Add kiosk ───
  const emptyForm = (): OfficeKioskFormData => ({ officeId: '', label: '', email: '', password: KIOSK_DEFAULT_PASSWORD })
  const isFormOpen = ref(false)
  const formData = ref<OfficeKioskFormData>(emptyForm())
  const formErrors = ref<OfficeKioskFormErrors>({})
  const isSubmitting = ref(false)

  const openAdd = () => {
    autoLabel = ''
    autoEmail = ''
    formData.value = emptyForm()
    formErrors.value = {}
    isFormOpen.value = true
  }
  const closeForm = () => {
    if (isSubmitting.value) return
    isFormOpen.value = false
  }
  const onFormOpenChange = (open: boolean) => {
    if (!open) closeForm()
  }
  /** The last values filled in automatically: they follow the office until the admin types their own */
  let autoLabel = ''
  let autoEmail = ''
  /** Picking an office fills the next "PACD PC n" name and "<office code>.kiosk@peso.ph" */
  const onOfficeChange = (officeId: string) => {
    formData.value.officeId = officeId
    const office = activeOffices.value.find((o) => o.id === officeId)
    if (!formData.value.label.trim() || formData.value.label === autoLabel) {
      autoLabel = suggestKioskLabel(kiosks.value.filter((k) => k.officeId === officeId).length)
      formData.value.label = autoLabel
    }
    if (office && (!formData.value.email.trim() || formData.value.email === autoEmail)) {
      autoEmail = suggestKioskEmail(office.code, office.name, kiosks.value.map((k) => k.email))
      formData.value.email = autoEmail
    }
  }

  const handleSubmit = async () => {
    const errors = validateKioskForm(formData.value)
    formErrors.value = errors
    if (Object.keys(errors).length > 0) return
    isSubmitting.value = true
    try {
      await officeKioskService.createKiosk(formData.value)
      toast.show(`Kiosk "${formData.value.label.trim()}" created. Sign in with it on the office's PACD computer.`, 'success')
      isSubmitting.value = false
      closeForm()
      await fetchKiosks()
    } catch (err) {
      formErrors.value = { submit: err instanceof Error ? err.message : 'The kiosk account could not be created.' }
    } finally {
      isSubmitting.value = false
    }
  }

  // ─── Enable / disable ───
  const togglingId = ref<string | null>(null)
  const toggleActive = async (kiosk: OfficeKiosk) => {
    togglingId.value = kiosk.id
    try {
      await officeKioskService.setActive(kiosk.id, !kiosk.isActive)
      kiosk.isActive = !kiosk.isActive
      toast.show(
        kiosk.isActive ? `"${kiosk.label}" can record attendance again.` : `"${kiosk.label}" is disabled and can no longer record attendance.`,
        'success',
      )
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Failed to update the kiosk.', 'error')
    } finally {
      togglingId.value = null
    }
  }

  // ─── Delete (single + bulk) ───
  const kiosksToDelete = ref<OfficeKiosk[]>([])
  const isDeleteDialogOpen = ref(false)
  const isDeleting = ref(false)
  const deletePreview = computed(() => kiosksToDelete.value.slice(0, 50))
  const deleteOverflow = computed(() => Math.max(0, kiosksToDelete.value.length - 50))

  const requestDelete = (kiosk: OfficeKiosk) => {
    kiosksToDelete.value = [kiosk]
    isDeleteDialogOpen.value = true
  }
  const requestBulkDelete = () => {
    const selected = filteredKiosks.value.filter((k) => selectedIds.value.has(k.id))
    if (selected.length === 0) return
    kiosksToDelete.value = selected
    isDeleteDialogOpen.value = true
  }
  const closeDeleteDialog = () => {
    if (isDeleting.value) return
    isDeleteDialogOpen.value = false
    kiosksToDelete.value = []
  }
  const onDeleteDialogOpenChange = (open: boolean) => {
    if (!open) closeDeleteDialog()
  }
  const confirmDelete = async () => {
    const ids = kiosksToDelete.value.map((k) => k.id)
    if (ids.length === 0) return
    isDeleting.value = true
    try {
      const deleted = new Set(await officeKioskService.deleteKiosks(ids))
      kiosks.value = kiosks.value.filter((k) => !deleted.has(k.id))
      selectedIds.value = new Set([...selectedIds.value].filter((id) => !deleted.has(id)))
      isDeleting.value = false
      closeDeleteDialog()
      if (deleted.size < ids.length) toast.show(`Deleted ${deleted.size} of ${ids.length} kiosks.`, 'error')
      else toast.show(`${deleted.size} ${deleted.size === 1 ? 'kiosk' : 'kiosks'} deleted.`, 'success')
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Failed to delete the kiosks.', 'error')
      await fetchKiosks()
    } finally {
      isDeleting.value = false
    }
  }

  onMounted(() => {
    void fetchKiosks()
    if (officeStore.offices.length === 0) void officeStore.fetchOffices()
  })

  return {
    kiosks,
    isLoading,
    loadError,
    fetchKiosks,
    officeOptions,
    searchQuery,
    statusFilter,
    statusFilterOptions: KIOSK_STATUS_FILTER_OPTIONS,
    hasActiveFilters,
    resetFilters,
    filteredKiosks,
    paginatedKiosks,
    currentPage,
    totalPages,
    pageRange,
    visiblePages,
    setPage,
    selectedCount,
    isSelected,
    toggleSelect,
    isAllPageSelected,
    isPagePartiallySelected,
    isAllFilteredSelected,
    toggleSelectPage,
    selectAllFiltered,
    clearSelection,
    isFormOpen,
    formData,
    formErrors,
    isSubmitting,
    labelMax: KIOSK_LABEL_MAX,
    passwordMin: KIOSK_PASSWORD_MIN,
    openAdd,
    closeForm,
    onFormOpenChange,
    onOfficeChange,
    handleSubmit,
    togglingId,
    toggleActive,
    kiosksToDelete,
    deletePreview,
    deleteOverflow,
    isDeleteDialogOpen,
    isDeleting,
    requestDelete,
    requestBulkDelete,
    closeDeleteDialog,
    onDeleteDialogOpenChange,
    confirmDelete,
  }
}
