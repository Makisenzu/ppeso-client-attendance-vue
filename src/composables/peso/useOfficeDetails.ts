import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { officeService } from '@/services/peso/officeService'
import { getPageRange } from '@/helpers/common/paginationHelper'
import type { OfficeGipRecord, OfficeSummary } from '@/types/peso/office'

type StatusFilter = 'ALL' | OfficeGipRecord['status']

/**
 * State for the Office Details page (/dashboard/offices/:id): the office and its GIP beneficiaries.
 * The office comes from the route id, so the page also works after a reload or from a shared link.
 */
export function useOfficeDetails() {
  const route = useRoute()
  const router = useRouter()

  const office = ref<OfficeSummary | null>(null)
  const gips = ref<OfficeGipRecord[]>([])
  const isLoading = ref(false)
  const loadError = ref<string | null>(null)
  const notFound = ref(false)

  // ─── Search, Filter & Pagination ───
  const searchQuery = ref('')
  const statusFilter = ref<StatusFilter>('ALL')
  const currentPage = ref(1)
  const pageSize = ref(10)

  const officeId = computed(() => (typeof route.params.id === 'string' ? route.params.id : ''))

  const loadOffice = async () => {
    if (!officeId.value) return
    isLoading.value = true
    loadError.value = null
    notFound.value = false
    try {
      const [officeResult, gipResult] = await Promise.all([
        officeService.getOfficeById(officeId.value),
        officeService.getOfficeGips(officeId.value),
      ])
      office.value = officeResult
      gips.value = gipResult
      notFound.value = officeResult === null
    } catch (err) {
      console.error('Failed to load office details:', err)
      loadError.value = 'Failed to load this office. Please try again.'
    } finally {
      isLoading.value = false
    }
  }

  const filteredGips = computed<OfficeGipRecord[]>(() => {
    const q = searchQuery.value.trim().toLowerCase()
    return gips.value.filter((g) => {
      if (statusFilter.value !== 'ALL' && g.status !== statusFilter.value) return false
      return !q || g.fullName.toLowerCase().includes(q)
    })
  })

  const stats = computed(() => ({
    total: gips.value.length,
    active: gips.value.filter((g) => g.status === 'active').length,
    inactive: gips.value.filter((g) => g.status === 'inactive').length,
    pending: gips.value.filter((g) => g.status === 'pending').length,
  }))

  const totalPages = computed(() => Math.max(1, Math.ceil(filteredGips.value.length / pageSize.value)))

  const paginatedGips = computed<OfficeGipRecord[]>(() => {
    const start = (currentPage.value - 1) * pageSize.value
    return filteredGips.value.slice(start, start + pageSize.value)
  })

  watch([searchQuery, statusFilter, pageSize], () => {
    currentPage.value = 1
  })

  watch(totalPages, (pages) => {
    if (currentPage.value > pages) currentPage.value = pages
  })

  const prevPage = () => {
    if (currentPage.value > 1) currentPage.value--
  }

  const nextPage = () => {
    if (currentPage.value < totalPages.value) currentPage.value++
  }

  const resetFilters = () => {
    searchQuery.value = ''
    statusFilter.value = 'ALL'
  }

  const goBack = () => {
    router.push({ name: 'offices' })
  }

  // Load on open and whenever the route switches to another office.
  watch(officeId, () => {
    resetFilters()
    loadOffice()
  }, { immediate: true })

  const pageRange = computed(() =>
    getPageRange(currentPage.value, pageSize.value, filteredGips.value.length),
  )

  return {
    pageRange,
    office,
    gips,
    filteredGips,
    paginatedGips,
    stats,
    isLoading,
    loadError,
    notFound,
    searchQuery,
    statusFilter,
    currentPage,
    pageSize,
    totalPages,
    prevPage,
    nextPage,
    resetFilters,
    loadOffice,
    goBack,
  }
}
