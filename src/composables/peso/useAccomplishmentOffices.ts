import { computed, ref, watch, watchEffect, type Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { ReviewReport } from '@/types/common/accomplishment'
import type { OfficeReportRow } from '@/types/peso/accomplishment'
import { buildOfficeReportRows, getReportOfficeKey, NO_OFFICE_KEY } from '@/helpers/peso/accomplishmentOfficeHelper'
import { getPageRange, getVisiblePages } from '@/helpers/common/paginationHelper'
import type { ReportScope } from '@/composables/common/useAccomplishmentReviews'

interface Options {
  /** Every report the admin may review (loaded by useAccomplishmentReviews) */
  reports: Ref<ReviewReport[]>
  /** Narrows the reports table to the open office */
  reportScope: Ref<ReportScope | null>
  /** Admin, all-people view — off for a single person's reports */
  enabled: Ref<boolean>
  /** Clears the reports table's search and filters (each office starts fresh) */
  resetFilters: () => void
}

/**
 * Admin Accomplishment Reports: first a list of offices, then one office (kept in the URL as ?office=<id> so a
 * reload stays on it) with its reports.
 */
export function useAccomplishmentOffices({ reports, reportScope, enabled, resetFilters }: Options) {
  const route = useRoute()
  const router = useRouter()

  const selectedOfficeKey = computed(() =>
    enabled.value && typeof route.query.office === 'string' ? route.query.office : null,
  )
  const isOfficeList = computed(() => enabled.value && selectedOfficeKey.value === null)
  const isOfficeView = computed(() => selectedOfficeKey.value !== null)

  // ─── Office list ───
  const officeRows = computed(() => buildOfficeReportRows(reports.value))
  const officeSearch = ref('')
  const filteredOfficeRows = computed(() => {
    const q = officeSearch.value.trim().toLowerCase()
    if (!q) return officeRows.value
    return officeRows.value.filter(
      (o) => o.officeName.toLowerCase().includes(q) || (o.officeCode ?? '').toLowerCase().includes(q),
    )
  })

  const OFFICE_PAGE_SIZE = 10
  const officePage = ref(1)
  const officeTotalPages = computed(() => Math.max(1, Math.ceil(filteredOfficeRows.value.length / OFFICE_PAGE_SIZE)))
  const paginatedOfficeRows = computed(() => {
    const start = (officePage.value - 1) * OFFICE_PAGE_SIZE
    return filteredOfficeRows.value.slice(start, start + OFFICE_PAGE_SIZE)
  })
  const officePageRange = computed(() =>
    getPageRange(officePage.value, OFFICE_PAGE_SIZE, filteredOfficeRows.value.length),
  )
  const officeVisiblePages = computed(() => getVisiblePages(officePage.value, officeTotalPages.value))
  const setOfficePage = (page: number) => {
    if (page >= 1 && page <= officeTotalPages.value) officePage.value = page
  }
  watch(officeSearch, () => {
    officePage.value = 1
  })
  watch(officeTotalPages, (pages) => {
    if (officePage.value > pages) officePage.value = pages
  })
  const clearOfficeSearch = () => {
    officeSearch.value = ''
  }

  const openOffice = (row: OfficeReportRow) => {
    void router.push({ query: { ...route.query, office: row.key } })
  }
  const backToOffices = () => {
    void router.push({ query: { ...route.query, office: undefined } })
  }

  // ─── One office: its reports ───
  const selectedOffice = computed(() => officeRows.value.find((o) => o.key === selectedOfficeKey.value) ?? null)
  const selectedOfficeName = computed(() => {
    if (!selectedOfficeKey.value) return ''
    if (selectedOfficeKey.value === NO_OFFICE_KEY) return 'No office'
    return selectedOffice.value?.officeName ?? 'Office'
  })
  const selectedOfficeCode = computed(() => selectedOffice.value?.officeCode ?? null)

  watch(
    selectedOfficeKey,
    () => {
      resetFilters()
    },
    { immediate: true },
  )

  // The reports table shows only the open office
  watchEffect(() => {
    const key = selectedOfficeKey.value
    reportScope.value = key ? (r: ReviewReport) => getReportOfficeKey(r) === key : null
  })

  return {
    isOfficeList,
    isOfficeView,
    officeRows,
    filteredOfficeRows,
    paginatedOfficeRows,
    officeSearch,
    clearOfficeSearch,
    officePage,
    officeTotalPages,
    officePageRange,
    officeVisiblePages,
    setOfficePage,
    openOffice,
    backToOffices,
    selectedOfficeName,
    selectedOfficeCode,
  }
}
