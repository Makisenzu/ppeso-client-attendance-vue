<script setup lang="ts">
import { toRef } from 'vue'
import { ArrowLeft, Building2, Check, ChevronRight, ClipboardList, Eye, Filter, Loader2, Printer, RefreshCw, Search, Trash2, Undo2, X } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import SearchSelect from '@/components/common/SearchSelect.vue'
import AccomplishmentDocumentPreview from '@/components/common/Accomplishments/AccomplishmentDocumentPreview.vue'
import { useAccomplishmentReviews } from '@/composables/common/useAccomplishmentReviews'
import { useAccomplishmentOffices } from '@/composables/peso/useAccomplishmentOffices'

const props = defineProps<{
  /** One person's reports (supervisor → GIP list → View); omitted = every report the user may review */
  profileId?: string
}>()

const {
  isPersonView,
  isOfficeMode,
  reportScope,
  scopedReports,
  personName,
  columnCount,
  goBackToList,
  canDelete,
  reports,
  isLoading,
  fetchReports,
  statCards,
  selectStatCard,
  searchQuery,
  statusFilter,
  fundingFilter,
  statusOptions,
  formatStatus,
  fundingOptions,
  hasActiveFilters,
  resetFilters,
  filteredReports,
  paginatedReports,
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
  reportsToDelete,
  deletePreview,
  deleteOverflow,
  isDeleteDialogOpen,
  isDeleting,
  requestDelete,
  requestBulkDelete,
  closeDeleteDialog,
  onDeleteDialogChange,
  confirmDelete,
  selectedReport,
  showPrintedForm,
  selectedDocument,
  isReviewOpen,
  remarks,
  remarksError,
  remarksMax,
  reviewingAction,
  isReviewing,
  openReview,
  closeReview,
  onReviewOpenChange,
  onRemarksInput,
  markReviewed,
  returnReport,
  undoReview,
  printReport,
  printSelected,
  formatPeriodRange,
  formatWeekday,
  formatPesoAmount,
  formatDisplayDateTimeLong,
  fundingFormTitle,
  getReportStatusBadgeClass,
  getReportDayBadgeClass,
} = useAccomplishmentReviews(toRef(props, 'profileId'))

// Admins: offices first, then one office's reports
const {
  isOfficeList,
  isOfficeView,
  filteredOfficeRows,
  paginatedOfficeRows,
  officeRows,
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
} = useAccomplishmentOffices({ reports, reportScope, enabled: isOfficeMode, resetFilters })

/** Office list columns: office, code, people, reports, to review, latest submission, actions */
const OFFICE_COLUMN_COUNT = 7

const checkboxClass =
  'h-4 w-4 cursor-pointer rounded border-input accent-primary align-middle disabled:cursor-not-allowed disabled:opacity-50'
// Native textarea until the shadcn `textarea` primitive is added (the CLI needs a newer Node).
const textareaClass =
  'w-full min-h-20 rounded-md border border-input bg-transparent px-3 py-2 text-base md:text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring aria-invalid:border-destructive disabled:cursor-not-allowed disabled:opacity-50'
</script>

<template>
  <div class="flex flex-col gap-6 pb-12">
    <!-- ─── Header ─── -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div v-if="isPersonView" class="flex items-start gap-3 min-w-0">
        <Button
          variant="outline"
          size="icon"
          class="h-9 w-9 shrink-0 cursor-pointer"
          title="Back to the GIP list"
          aria-label="Back to the GIP list"
          @click="goBackToList"
        >
          <ArrowLeft class="h-4 w-4" />
        </Button>
        <div class="space-y-1 min-w-0">
          <h1 class="text-2xl font-bold tracking-tight sm:text-3xl text-foreground truncate">
            {{ personName || (isLoading ? 'Loading...' : 'Accomplishment Reports') }}
          </h1>
          <p class="text-sm text-muted-foreground">Their submitted accomplishment reports. Open one to review it.</p>
        </div>
      </div>
      <div v-else-if="isOfficeView" class="flex items-start gap-3 min-w-0">
        <Button
          variant="outline"
          size="icon"
          class="h-9 w-9 shrink-0 cursor-pointer"
          title="Back to the offices"
          aria-label="Back to the offices"
          @click="backToOffices"
        >
          <ArrowLeft class="h-4 w-4" />
        </Button>
        <div class="space-y-1 min-w-0">
          <div class="flex items-center gap-2 min-w-0">
            <h1 class="text-2xl font-bold tracking-tight sm:text-3xl text-foreground truncate">
              {{ isLoading && !selectedOfficeCode ? 'Loading...' : selectedOfficeName }}
            </h1>
            <Badge v-if="selectedOfficeCode" variant="secondary" class="font-mono text-[11px] shrink-0">{{ selectedOfficeCode }}</Badge>
          </div>
          <p class="text-sm text-muted-foreground">Accomplishment reports submitted by the people in this office.</p>
        </div>
      </div>
      <div v-else class="space-y-1">
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl text-foreground">Accomplishment Reports</h1>
        <p class="text-sm text-muted-foreground">
          {{ isOfficeList ? 'Reports grouped by office. Open an office to see its reports.' : 'Review submitted reports, or return them with remarks.' }}
        </p>
      </div>
      <Button variant="outline" size="sm" class="gap-1.5 text-xs cursor-pointer self-start sm:self-auto" :disabled="isLoading" @click="fetchReports">
        <RefreshCw :class="['h-3.5 w-3.5', isLoading && 'animate-spin']" />
        <span>Refresh</span>
      </Button>
    </div>

    <!-- ─── Office list (admins) ─── -->
    <Card v-if="isOfficeList" class="border shadow-xs">
      <CardHeader class="pb-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle class="text-lg font-semibold">Offices</CardTitle>
            <CardDescription class="text-xs">Showing {{ filteredOfficeRows.length }} of {{ officeRows.length }} offices</CardDescription>
          </div>
          <div class="relative w-full sm:w-72">
            <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input v-model="officeSearch" placeholder="Search by office or code..." class="pl-9 pr-8 h-9 text-base md:text-xs" />
            <button
              v-if="officeSearch"
              type="button"
              class="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Clear search"
              @click="clearOfficeSearch"
            >
              <X class="h-4 w-4" />
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent class="p-0">
        <div class="relative overflow-x-auto border-t">
          <Table>
            <TableHeader class="bg-muted/40">
              <TableRow>
                <TableHead class="min-w-52 pl-4 text-xs font-semibold">Office</TableHead>
                <TableHead class="min-w-24 text-xs font-semibold">Office Code</TableHead>
                <TableHead class="min-w-20 text-xs font-semibold text-right">People</TableHead>
                <TableHead class="min-w-20 text-xs font-semibold text-right">Reports</TableHead>
                <TableHead class="min-w-24 text-xs font-semibold text-right">To Review</TableHead>
                <TableHead class="min-w-44 text-xs font-semibold">Latest Submission</TableHead>
                <TableHead class="min-w-24 pr-4 text-right text-xs font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-if="isLoading">
                <TableCell :colspan="OFFICE_COLUMN_COUNT" class="h-40 text-center">
                  <div class="flex flex-col items-center justify-center gap-2 py-6">
                    <Loader2 class="h-8 w-8 animate-spin text-primary" />
                    <p class="text-xs text-muted-foreground">Loading reports...</p>
                  </div>
                </TableCell>
              </TableRow>

              <template v-else-if="paginatedOfficeRows.length > 0">
                <TableRow
                  v-for="office in paginatedOfficeRows"
                  :key="office.key"
                  class="cursor-pointer hover:bg-muted/30"
                  @click="openOffice(office)"
                >
                  <TableCell class="py-3 pl-4">
                    <div class="flex items-center gap-2.5 min-w-0">
                      <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Building2 class="h-4 w-4" />
                      </div>
                      <span class="text-xs sm:text-sm font-semibold text-foreground truncate">{{ office.officeName }}</span>
                    </div>
                  </TableCell>
                  <TableCell class="py-3 text-xs font-mono text-muted-foreground">{{ office.officeCode || '—' }}</TableCell>
                  <TableCell class="py-3 text-xs font-mono text-right">{{ office.people }}</TableCell>
                  <TableCell class="py-3 text-xs font-mono text-right">{{ office.total }}</TableCell>
                  <TableCell class="py-3 text-right">
                    <Badge v-if="office.toReview > 0" variant="outline" :class="[getReportStatusBadgeClass('Submitted'), 'text-[10px] font-mono']">
                      {{ office.toReview }}
                    </Badge>
                    <span v-else class="text-xs text-muted-foreground font-mono">0</span>
                  </TableCell>
                  <TableCell class="py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {{ formatDisplayDateTimeLong(office.latestSubmittedAt) }}
                  </TableCell>
                  <TableCell class="py-3 pr-4 text-right">
                    <Button variant="ghost" size="sm" class="h-8 gap-1 text-xs cursor-pointer" @click.stop="openOffice(office)">
                      <span>View</span>
                      <ChevronRight class="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              </template>

              <TableEmpty v-else :colspan="OFFICE_COLUMN_COUNT">
                <Empty class="border-0 p-6 md:p-8">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <ClipboardList v-if="officeRows.length === 0" class="size-5 text-muted-foreground" />
                      <Filter v-else class="size-5 text-muted-foreground" />
                    </EmptyMedia>
                    <EmptyTitle>{{ officeRows.length === 0 ? 'No reports yet' : 'No matching offices' }}</EmptyTitle>
                    <EmptyDescription>
                      {{ officeRows.length === 0 ? 'Offices appear here once their people submit accomplishment reports.' : 'No office matches your search.' }}
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent v-if="officeRows.length > 0">
                    <Button size="sm" variant="outline" class="text-xs cursor-pointer" @click="clearOfficeSearch">Clear Search</Button>
                  </EmptyContent>
                </Empty>
              </TableEmpty>
            </TableBody>
          </Table>
        </div>

        <div
          v-if="filteredOfficeRows.length > 0"
          class="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 border-t text-xs text-muted-foreground bg-muted/10"
        >
          <div>
            Showing <span class="font-medium text-foreground">{{ officePageRange.start }}</span>
            to <span class="font-medium text-foreground">{{ officePageRange.end }}</span>
            of <span class="font-medium text-foreground">{{ filteredOfficeRows.length }}</span> offices
          </div>
          <div class="flex items-center gap-1">
            <Button
              v-for="p in officeVisiblePages"
              :key="p"
              size="sm"
              :variant="officePage === p ? 'default' : 'outline'"
              class="h-7 w-7 p-0 text-xs cursor-pointer"
              @click="setOfficePage(p)"
            >
              {{ p }}
            </Button>
            <span v-if="officeTotalPages > officeVisiblePages.length" class="px-1">of {{ officeTotalPages }}</span>
          </div>
        </div>
      </CardContent>
    </Card>

    <template v-else>
    <!-- ─── Counts (click to filter; not on the admin's office view) ─── -->
    <div v-if="!isOfficeView" class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card
        v-for="card in statCards"
        :key="card.key"
        class="border shadow-xs bg-card/60 transition-all cursor-pointer hover:border-primary/40"
        :class="statusFilter === card.key ? 'border-primary ring-2 ring-primary/20 shadow-sm' : ''"
        @click="selectStatCard(card.key)"
      >
        <CardContent class="p-4">
          <p class="text-xs font-medium text-muted-foreground truncate">{{ card.label }}</p>
          <p class="text-2xl font-bold tracking-tight font-mono text-foreground">{{ card.value.toLocaleString() }}</p>
        </CardContent>
      </Card>
    </div>

    <Card class="border shadow-xs">
      <CardHeader class="pb-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle class="text-lg font-semibold">Reports</CardTitle>
            <CardDescription class="text-xs">Showing {{ filteredReports.length }} of {{ scopedReports.length }} reports</CardDescription>
          </div>
          <Button
            v-if="hasActiveFilters"
            variant="ghost"
            size="sm"
            class="gap-1.5 text-xs text-muted-foreground hover:text-foreground h-8 self-start sm:self-auto cursor-pointer"
            @click="resetFilters"
          >
            <X class="h-3.5 w-3.5" />
            <span>Clear filters</span>
          </Button>
        </div>
        <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div class="sm:col-span-2 relative">
            <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input v-model="searchQuery" :placeholder="isPersonView ? 'Search by month...' : isOfficeView ? 'Search by name or month...' : 'Search by name, office or month...'" class="pl-9 h-9 text-base md:text-xs" />
          </div>
          <SearchSelect v-model="statusFilter" :options="statusOptions" :searchable="false" />
          <SearchSelect v-model="fundingFilter" :options="fundingOptions" :searchable="false" />
        </div>
      </CardHeader>

      <CardContent class="p-0">
        <!-- Bulk bar (admins) -->
        <div
          v-if="canDelete && selectedCount > 0"
          class="flex flex-col gap-2 border-t bg-primary/5 px-4 py-2.5 text-xs sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span class="font-semibold text-foreground">{{ selectedCount }} selected</span>
            <button v-if="!isAllFilteredSelected" type="button" class="font-medium text-primary hover:underline cursor-pointer" @click="selectAllFiltered">
              Select all {{ filteredReports.length }} matching reports
            </button>
            <button type="button" class="text-muted-foreground hover:text-foreground cursor-pointer" @click="clearSelection">Clear selection</button>
          </div>
          <Button variant="destructive" size="sm" class="h-7 gap-1.5 text-xs cursor-pointer self-start sm:self-auto" :disabled="isDeleting" @click="requestBulkDelete">
            <Trash2 class="h-3.5 w-3.5" />
            <span>Delete selected</span>
          </Button>
        </div>

        <div class="relative overflow-x-auto border-t">
          <Table>
            <TableHeader class="bg-muted/40">
              <TableRow>
                <TableHead v-if="canDelete" class="w-10 pl-4">
                  <input
                    type="checkbox"
                    :class="checkboxClass"
                    :checked="isAllPageSelected"
                    :indeterminate="isPagePartiallySelected"
                    :disabled="isLoading || paginatedReports.length === 0"
                    aria-label="Select all reports on this page"
                    @change="toggleSelectPage"
                  />
                </TableHead>
                <TableHead v-if="!isPersonView" class="min-w-44 text-xs font-semibold" :class="!canDelete && 'pl-4'">Beneficiary</TableHead>
                <TableHead class="min-w-44 text-xs font-semibold" :class="isPersonView && !canDelete && 'pl-4'">Period</TableHead>
                <TableHead class="min-w-16 text-xs font-semibold">Form</TableHead>
                <TableHead class="min-w-24 text-xs font-semibold">Status</TableHead>
                <TableHead class="min-w-44 text-xs font-semibold">Submitted</TableHead>
                <TableHead class="min-w-28 pr-4 text-right text-xs font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-if="isLoading">
                <TableCell :colspan="columnCount" class="h-40 text-center">
                  <div class="flex flex-col items-center justify-center gap-2 py-6">
                    <Loader2 class="h-8 w-8 animate-spin text-primary" />
                    <p class="text-xs text-muted-foreground">Loading reports...</p>
                  </div>
                </TableCell>
              </TableRow>

              <template v-else-if="paginatedReports.length > 0">
                <TableRow
                  v-for="report in paginatedReports"
                  :key="report.id"
                  :class="isSelected(report.id) ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/30'"
                >
                  <TableCell v-if="canDelete" class="w-10 py-3 pl-4">
                    <input
                      type="checkbox"
                      :class="checkboxClass"
                      :checked="isSelected(report.id)"
                      :aria-label="`Select report of ${report.fullName}`"
                      @change="toggleSelect(report.id)"
                    />
                  </TableCell>
                  <TableCell v-if="!isPersonView" class="py-3" :class="!canDelete && 'pl-4'">
                    <div class="flex flex-col min-w-0">
                      <span class="text-xs sm:text-sm font-semibold text-foreground truncate">{{ report.fullName }}</span>
                      <span class="text-[11px] text-muted-foreground truncate">{{ report.officeName || 'Unassigned' }}</span>
                    </div>
                  </TableCell>
                  <TableCell class="py-3 text-xs text-foreground whitespace-nowrap" :class="isPersonView && !canDelete && 'pl-4'">
                    {{ formatPeriodRange(report.periodStart, report.periodEnd) }}
                  </TableCell>
                  <TableCell class="py-3 text-xs text-muted-foreground">{{ report.funding }}</TableCell>
                  <TableCell class="py-3">
                    <Badge variant="outline" :class="[getReportStatusBadgeClass(report.status), 'text-[10px]']">{{ formatStatus(report.status) }}</Badge>
                  </TableCell>
                  <TableCell class="py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {{ formatDisplayDateTimeLong(report.submittedAt) }}
                  </TableCell>
                  <TableCell class="py-3 pr-4 text-right">
                    <div class="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" class="h-8 gap-1.5 text-xs cursor-pointer" @click="openReview(report)">
                        <Eye class="h-3.5 w-3.5" />
                        <span class="hidden sm:inline">{{ report.status === 'Submitted' ? 'Review' : 'View' }}</span>
                      </Button>
                      <Button variant="ghost" size="icon" class="h-8 w-8 cursor-pointer" title="Print" aria-label="Print report" @click="printReport(report)">
                        <Printer class="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        v-if="canDelete"
                        variant="ghost"
                        size="icon"
                        class="h-8 w-8 text-destructive/80 hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                        title="Delete report"
                        aria-label="Delete report"
                        @click="requestDelete(report)"
                      >
                        <Trash2 class="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              </template>

              <TableEmpty v-else :colspan="columnCount">
                <Empty class="border-0 p-6 md:p-8">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <ClipboardList v-if="scopedReports.length === 0" class="size-5 text-muted-foreground" />
                      <Filter v-else class="size-5 text-muted-foreground" />
                    </EmptyMedia>
                    <EmptyTitle>{{ scopedReports.length === 0 ? 'No reports yet' : 'No matching reports' }}</EmptyTitle>
                    <EmptyDescription>
                      {{ scopedReports.length === 0 ? (isPersonView ? 'Reports this GIP submits will appear here.' : 'Submitted accomplishment reports will appear here.') : 'No reports match your search or filters.' }}
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent v-if="scopedReports.length > 0">
                    <Button size="sm" variant="outline" class="text-xs cursor-pointer" @click="resetFilters">Clear Filters</Button>
                  </EmptyContent>
                </Empty>
              </TableEmpty>
            </TableBody>
          </Table>
        </div>

        <div
          v-if="filteredReports.length > 0"
          class="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 border-t text-xs text-muted-foreground bg-muted/10"
        >
          <div>
            Showing <span class="font-medium text-foreground">{{ pageRange.start }}</span>
            to <span class="font-medium text-foreground">{{ pageRange.end }}</span>
            of <span class="font-medium text-foreground">{{ filteredReports.length }}</span> reports
          </div>
          <div class="flex items-center gap-1">
            <Button
              v-for="p in visiblePages"
              :key="p"
              size="sm"
              :variant="currentPage === p ? 'default' : 'outline'"
              class="h-7 w-7 p-0 text-xs cursor-pointer"
              @click="setPage(p)"
            >
              {{ p }}
            </Button>
            <span v-if="totalPages > visiblePages.length" class="px-1">of {{ totalPages }}</span>
          </div>
        </div>
      </CardContent>
    </Card>
    </template>

    <!-- ─── Review sheet ─── -->
    <Sheet :open="isReviewOpen" @update:open="onReviewOpenChange">
      <SheetContent class="flex h-full flex-col p-0" :class="showPrintedForm ? 'sm:max-w-3xl' : 'sm:max-w-xl'">
        <SheetHeader class="shrink-0 px-6 pt-6 pb-2">
          <SheetTitle>{{ selectedReport ? fundingFormTitle(selectedReport.funding) : 'Report' }}</SheetTitle>
          <SheetDescription v-if="selectedReport" class="text-xs">
            {{ selectedReport.fullName }} · {{ selectedReport.officeName || 'Unassigned' }} ·
            {{ formatPeriodRange(selectedReport.periodStart, selectedReport.periodEnd) }}
          </SheetDescription>
        </SheetHeader>

        <div v-if="selectedReport" class="grid flex-1 content-start gap-5 overflow-y-auto px-6 py-4 text-sm">
          <div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" :class="getReportStatusBadgeClass(selectedReport.status)">{{ formatStatus(selectedReport.status) }}</Badge>
            <span>Submitted {{ formatDisplayDateTimeLong(selectedReport.submittedAt) }}</span>
            <span v-if="selectedReport.reviewedAt">· Reviewed {{ formatDisplayDateTimeLong(selectedReport.reviewedAt) }}</span>
          </div>

          <!-- Supervisors: the report on its official form, exactly as printed -->
          <AccomplishmentDocumentPreview
            v-if="showPrintedForm"
            :document="selectedDocument"
            :title="`${fundingFormTitle(selectedReport.funding)} of ${selectedReport.fullName}, as printed`"
          />

          <template v-else>
          <!-- PGAS activities -->
          <section v-if="selectedReport.funding === 'PGAS'" class="grid gap-2">
            <h3 class="text-xs font-semibold uppercase text-muted-foreground">Activities</h3>
            <div class="overflow-x-auto rounded-lg border">
              <table class="w-full text-xs">
                <thead class="bg-muted/40">
                  <tr>
                    <th class="px-3 py-2 text-left font-semibold">Activity</th>
                    <th class="px-3 py-2 text-left font-semibold">Output</th>
                    <th class="px-3 py-2 text-left font-semibold">Remarks</th>
                  </tr>
                </thead>
                <tbody class="divide-y">
                  <tr v-for="(row, index) in selectedReport.activities" :key="index">
                    <td class="px-3 py-2 align-top whitespace-pre-line">{{ row.activity }}</td>
                    <td class="px-3 py-2 align-top whitespace-pre-line">{{ row.output || '—' }}</td>
                    <td class="px-3 py-2 align-top">{{ row.remarks || '—' }}</td>
                  </tr>
                  <tr v-if="!selectedReport.activities.length">
                    <td colspan="3" class="px-3 py-3 text-center text-muted-foreground">No activities.</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="text-xs">
              <span class="text-muted-foreground">Payment:</span>
              <span class="font-mono font-semibold">₱{{ formatPesoAmount(selectedReport.amount) || '—' }}</span>
              <span v-if="selectedReport.amountInWords" class="text-muted-foreground"> · {{ selectedReport.amountInWords }}</span>
            </p>
          </section>

          <!-- Daily entries (DOLE only) -->
          <section v-if="selectedReport.funding === 'DOLE'" class="grid gap-2">
            <h3 class="text-xs font-semibold uppercase text-muted-foreground">Daily entries</h3>
            <ul class="divide-y rounded-lg border">
              <li v-for="day in selectedReport.dailyEntries" :key="day.date" class="grid gap-1 px-3 py-2">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-xs font-medium font-mono">{{ formatWeekday(day.date) }}</span>
                  <Badge variant="outline" :class="[getReportDayBadgeClass(day.status), 'text-[10px]']">{{ day.status }}</Badge>
                </div>
                <p v-if="day.entry" class="text-xs text-foreground whitespace-pre-line">{{ day.entry }}</p>
              </li>
              <li v-if="!selectedReport.dailyEntries.length" class="px-3 py-3 text-center text-xs text-muted-foreground">No daily entries.</li>
            </ul>
          </section>

          <!-- Signatories -->
          <section class="grid gap-1 text-xs">
            <h3 class="font-semibold uppercase text-muted-foreground">Signatories</h3>
            <p v-if="selectedReport.funding === 'PGAS'"><span class="text-muted-foreground">Designation:</span> {{ selectedReport.designation || '—' }}</p>
            <p><span class="text-muted-foreground">Supervisor:</span> {{ selectedReport.supervisorName || '—' }}</p>
            <p>
              <span class="text-muted-foreground">Office head:</span> {{ selectedReport.approverName || '—' }}
              <span v-if="selectedReport.approverPosition" class="text-muted-foreground">({{ selectedReport.approverPosition }})</span>
            </p>
          </section>
          </template>

          <!-- Remarks -->
          <section class="grid gap-1.5">
            <label for="review-remarks" class="text-xs font-semibold">Remarks</label>
            <textarea
              id="review-remarks"
              v-model="remarks"
              rows="3"
              :maxlength="remarksMax"
              :class="textareaClass"
              placeholder="What needs to change (required to return the report)"
              :aria-invalid="!!remarksError"
              :disabled="isReviewing || selectedReport.status !== 'Submitted'"
              @input="onRemarksInput"
            />
            <p v-if="remarksError" class="text-xs text-destructive">{{ remarksError }}</p>
          </section>
        </div>

        <div v-if="selectedReport" class="flex shrink-0 flex-wrap justify-end gap-2 border-t border-border px-6 py-4">
          <Button variant="outline" size="sm" class="gap-1.5 text-xs cursor-pointer mr-auto" :disabled="isReviewing" @click="printSelected">
            <Printer class="h-3.5 w-3.5" />
            <span>Print</span>
          </Button>
          <template v-if="selectedReport.status === 'Submitted'">
            <Button variant="outline" size="sm" class="gap-1.5 text-xs cursor-pointer" :disabled="isReviewing" @click="returnReport">
              <Loader2 v-if="reviewingAction === 'Returned'" class="h-3.5 w-3.5 animate-spin" />
              <Undo2 v-else class="h-3.5 w-3.5" />
              <span>{{ reviewingAction === 'Returned' ? 'Returning...' : 'Return' }}</span>
            </Button>
            <Button size="sm" class="gap-1.5 text-xs cursor-pointer font-semibold" :disabled="isReviewing" @click="markReviewed">
              <Loader2 v-if="reviewingAction === 'Reviewed'" class="h-3.5 w-3.5 animate-spin" />
              <Check v-else class="h-3.5 w-3.5" />
              <span>{{ reviewingAction === 'Reviewed' ? 'Saving...' : 'Mark Reviewed' }}</span>
            </Button>
          </template>
          <template v-else>
            <Button variant="outline" size="sm" class="gap-1.5 text-xs cursor-pointer" :disabled="isReviewing" @click="undoReview">
              <Loader2 v-if="reviewingAction === 'Submitted'" class="h-3.5 w-3.5 animate-spin" />
              <Undo2 v-else class="h-3.5 w-3.5" />
              <span>{{ reviewingAction === 'Submitted' ? 'Undoing...' : 'Undo review' }}</span>
            </Button>
            <Button size="sm" class="text-xs cursor-pointer" :disabled="isReviewing" @click="closeReview">Close</Button>
          </template>
        </div>
      </SheetContent>
    </Sheet>

    <!-- ─── Delete confirmation (admins) ─── -->
    <Dialog :open="isDeleteDialogOpen" @update:open="onDeleteDialogChange">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle class="text-base">Delete {{ reportsToDelete.length }} report{{ reportsToDelete.length === 1 ? '' : 's' }}?</DialogTitle>
          <DialogDescription class="text-xs">This can't be undone. The reports are removed for everyone.</DialogDescription>
        </DialogHeader>
        <div class="max-h-48 overflow-y-auto rounded-lg border bg-muted/30 text-xs divide-y">
          <div v-for="report in deletePreview" :key="report.id" class="flex items-center justify-between gap-3 px-3.5 py-2">
            <span class="font-semibold text-foreground truncate">{{ report.fullName }}</span>
            <span class="text-muted-foreground shrink-0">{{ formatPeriodRange(report.periodStart, report.periodEnd) }}</span>
          </div>
          <div v-if="deleteOverflow > 0" class="px-3.5 py-2 text-muted-foreground">…and {{ deleteOverflow }} more</div>
        </div>
        <DialogFooter class="gap-2">
          <Button variant="outline" size="sm" class="text-xs cursor-pointer" :disabled="isDeleting" @click="closeDeleteDialog">Cancel</Button>
          <Button variant="destructive" size="sm" class="gap-1.5 text-xs cursor-pointer" :disabled="isDeleting" @click="confirmDelete">
            <Loader2 v-if="isDeleting" class="h-3.5 w-3.5 animate-spin" />
            <span>{{ isDeleting ? 'Deleting...' : 'Delete' }}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
