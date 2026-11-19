<script setup lang="ts">
import { ArrowLeft, Building2, ChevronLeft, ChevronRight, ClipboardCheck, Eye, Loader2, RefreshCw, Search, Trash2, X } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import SearchSelect from '@/components/common/SearchSelect.vue'
import { useEvaluationRecords } from '@/composables/peso/useEvaluationRecords'

const {
  isOfficeView,
  filteredOfficeRows,
  paginatedOfficeRows,
  officeSearch,
  clearOfficeSearch,
  officePage,
  officeTotalPages,
  officePageRange,
  prevOfficePage,
  nextOfficePage,
  openOffice,
  backToOffices,
  selectedOfficeName,
  officeRecordCount,
  getOfficeAverage,
  getOfficeAverageLabel,
  records,
  filteredRecords,
  paginatedRecords,
  isLoading,
  loadError,
  fetchRecords,
  searchQuery,
  monthFilter,
  monthOptions,
  currentPage,
  pageSize,
  totalPages,
  pageRange,
  prevPage,
  nextPage,
  hasActiveFilters,
  resetFilters,
  clearSearch,
  selectedCount,
  isAllPageSelected,
  isPagePartiallySelected,
  isAllFilteredSelected,
  isSelected,
  toggleSelect,
  toggleSelectPage,
  selectAllFiltered,
  clearSelection,
  isViewOpen,
  viewedRecord,
  viewedGroups,
  viewedDescription,
  viewedSubmittedLabel,
  closeView,
  openView,
  onViewOpenChange,
  isDeleteDialogOpen,
  isDeleting,
  recordsToDelete,
  deletePreview,
  deleteOverflow,
  openDeleteDialog,
  openBulkDeleteDialog,
  closeDeleteDialog,
  onDeleteDialogOpenChange,
  confirmDelete,
  formatPeriodMonth,
  formatScore,
  formatScoreLabel,
  formatRatingLabel,
  formatDisplayDateLong,
} = useEvaluationRecords()

const COLUMN_COUNT = 8
const OFFICE_COLUMN_COUNT = 6

const checkboxClass =
  'h-4 w-4 cursor-pointer rounded border-input accent-primary align-middle disabled:cursor-not-allowed disabled:opacity-50'
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- ─── Offices (first view) ─── -->
    <!-- A summary per office, not records: nothing to select or delete here (DESIGN.md §11.1 exemption). -->
    <Card v-if="!isOfficeView" class="border shadow-xs">
      <CardHeader class="pb-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle class="text-lg font-semibold">Submitted Evaluations by Office</CardTitle>
            <CardDescription class="text-xs">
              {{ filteredOfficeRows.length }} {{ filteredOfficeRows.length === 1 ? 'office' : 'offices' }} with submitted evaluations
            </CardDescription>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <Button
              v-if="hasActiveFilters"
              variant="ghost"
              size="sm"
              class="gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              @click="resetFilters"
            >
              <X class="h-3.5 w-3.5" />
              <span>Clear filters</span>
            </Button>
            <Button variant="outline" size="sm" class="gap-1.5 text-xs cursor-pointer" :disabled="isLoading" @click="fetchRecords">
              <RefreshCw :class="['h-3.5 w-3.5', isLoading && 'animate-spin']" />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div class="relative sm:col-span-2">
            <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input v-model="officeSearch" placeholder="Search offices..." class="h-9 pl-9 pr-8 text-base md:text-xs" />
            <button
              v-if="officeSearch"
              type="button"
              class="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Clear search"
              @click="clearOfficeSearch"
            >
              <X class="h-4 w-4" />
            </button>
          </div>
          <SearchSelect v-model="monthFilter" :options="monthOptions" :searchable="false" />
        </div>
      </CardHeader>

      <CardContent class="p-0">
        <div class="relative overflow-x-auto border-t">
          <Table>
            <TableHeader class="bg-muted/40">
              <TableRow>
                <TableHead class="min-w-56 pl-4 text-xs font-semibold">Office</TableHead>
                <TableHead class="min-w-24 text-xs font-semibold">Evaluations</TableHead>
                <TableHead class="min-w-24 text-xs font-semibold">GIPs</TableHead>
                <TableHead class="min-w-40 text-xs font-semibold">Average Overall</TableHead>
                <TableHead class="min-w-32 text-xs font-semibold">Latest Month</TableHead>
                <TableHead class="min-w-24 pr-4 text-right text-xs font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-if="isLoading && records.length === 0">
                <TableCell :colspan="OFFICE_COLUMN_COUNT" class="h-44 text-center">
                  <div class="flex flex-col items-center justify-center gap-2 py-6">
                    <Loader2 class="h-8 w-8 animate-spin text-primary" />
                    <p class="text-xs text-muted-foreground">Loading the evaluations...</p>
                  </div>
                </TableCell>
              </TableRow>

              <template v-else-if="paginatedOfficeRows.length > 0">
                <TableRow
                  v-for="office in paginatedOfficeRows"
                  :key="office.key"
                  class="hover:bg-muted/30 transition-colors cursor-pointer"
                  @click="openOffice(office)"
                >
                  <TableCell class="py-3 pl-4">
                    <div class="flex items-center gap-2.5 min-w-0">
                      <Building2 class="size-4 shrink-0 text-muted-foreground" />
                      <span class="truncate text-xs font-semibold text-foreground sm:text-sm">{{ office.officeName }}</span>
                    </div>
                  </TableCell>
                  <TableCell class="py-3 font-mono text-xs text-foreground">{{ office.evaluations }}</TableCell>
                  <TableCell class="py-3 font-mono text-xs text-foreground">{{ office.gips }}</TableCell>
                  <TableCell class="py-3 text-xs whitespace-nowrap">
                    <span class="font-mono font-semibold text-foreground">{{ getOfficeAverage(office) }}</span>
                    <span class="text-muted-foreground"> · {{ getOfficeAverageLabel(office) }}</span>
                  </TableCell>
                  <TableCell class="py-3 text-xs text-foreground whitespace-nowrap">{{ formatPeriodMonth(office.latestMonth) }}</TableCell>
                  <TableCell class="py-3 pr-4 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      class="h-8 gap-1.5 text-xs cursor-pointer"
                      :aria-label="`View evaluations of ${office.officeName}`"
                      @click.stop="openOffice(office)"
                    >
                      <Eye class="h-3.5 w-3.5" />
                      <span>View</span>
                    </Button>
                  </TableCell>
                </TableRow>
              </template>

              <TableEmpty v-else :colspan="OFFICE_COLUMN_COUNT">
                <Empty class="py-10">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <ClipboardCheck />
                    </EmptyMedia>
                    <EmptyTitle>{{ loadError ? 'Could not load the evaluations' : 'No offices found' }}</EmptyTitle>
                    <EmptyDescription>
                      {{
                        loadError
                          ? loadError
                          : records.length === 0
                            ? 'Evaluations appear here once supervisors submit them.'
                            : 'No offices match your search or filter.'
                      }}
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button v-if="loadError" variant="outline" size="sm" class="text-xs cursor-pointer" @click="fetchRecords">
                      Try again
                    </Button>
                    <Button v-else-if="records.length > 0" variant="outline" size="sm" class="text-xs cursor-pointer" @click="resetFilters">
                      Reset filters
                    </Button>
                  </EmptyContent>
                </Empty>
              </TableEmpty>
            </TableBody>
          </Table>
        </div>

        <!-- ─── Office pagination (10 per page) ─── -->
        <div
          v-if="filteredOfficeRows.length > 0"
          class="flex flex-col gap-3 border-t px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between"
        >
          <span>{{ officePageRange.start }}–{{ officePageRange.end }} of {{ filteredOfficeRows.length }}</span>
          <div class="flex items-center gap-2">
            <span>Page {{ officePage }} of {{ officeTotalPages }}</span>
            <Button variant="outline" size="icon" class="h-8 w-8 cursor-pointer" :disabled="officePage <= 1" aria-label="Previous page" @click="prevOfficePage">
              <ChevronLeft class="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              class="h-8 w-8 cursor-pointer"
              :disabled="officePage >= officeTotalPages"
              aria-label="Next page"
              @click="nextOfficePage"
            >
              <ChevronRight class="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- ─── Evaluations of one office ─── -->
    <Card v-else class="border shadow-xs">
      <CardHeader class="pb-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div class="flex items-start gap-2">
            <Button
              variant="ghost"
              size="icon"
              class="h-8 w-8 shrink-0 cursor-pointer"
              title="Back to offices"
              aria-label="Back to offices"
              @click="backToOffices"
            >
              <ArrowLeft class="h-4 w-4" />
            </Button>
            <div>
              <CardTitle class="text-lg font-semibold">{{ selectedOfficeName }}</CardTitle>
              <CardDescription class="text-xs">Showing {{ filteredRecords.length }} of {{ officeRecordCount }} evaluations</CardDescription>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <Button
              v-if="hasActiveFilters"
              variant="ghost"
              size="sm"
              class="gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              @click="resetFilters"
            >
              <X class="h-3.5 w-3.5" />
              <span>Clear filters</span>
            </Button>
            <Button variant="outline" size="sm" class="gap-1.5 text-xs cursor-pointer" :disabled="isLoading" @click="fetchRecords">
              <RefreshCw :class="['h-3.5 w-3.5', isLoading && 'animate-spin']" />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div class="relative sm:col-span-2">
            <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input v-model="searchQuery" placeholder="Search by GIP or supervisor..." class="h-9 pl-9 pr-8 text-base md:text-xs" />
            <button
              v-if="searchQuery"
              type="button"
              class="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Clear search"
              @click="clearSearch"
            >
              <X class="h-4 w-4" />
            </button>
          </div>
          <SearchSelect v-model="monthFilter" :options="monthOptions" :searchable="false" />
        </div>
      </CardHeader>

      <CardContent class="p-0">
        <!-- ─── Bulk Selection Bar ─── -->
        <div
          v-if="selectedCount > 0"
          class="flex flex-col gap-2 border-t bg-primary/5 px-4 py-2.5 text-xs sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span class="font-semibold text-foreground">
              {{ selectedCount }} {{ selectedCount === 1 ? 'evaluation' : 'evaluations' }} selected
            </span>
            <button
              v-if="!isAllFilteredSelected"
              type="button"
              class="font-medium text-primary hover:underline cursor-pointer"
              @click="selectAllFiltered"
            >
              Select all {{ filteredRecords.length }} matching evaluations
            </button>
            <button type="button" class="text-muted-foreground hover:text-foreground cursor-pointer" @click="clearSelection">
              Clear selection
            </button>
          </div>
          <Button
            variant="destructive"
            size="sm"
            class="h-7 gap-1.5 text-xs cursor-pointer self-start sm:self-auto"
            :disabled="isDeleting"
            @click="openBulkDeleteDialog"
          >
            <Trash2 class="h-3.5 w-3.5" />
            <span>Delete selected</span>
          </Button>
        </div>

        <!-- ─── Table ─── -->
        <div class="relative overflow-x-auto border-t">
          <Table>
            <TableHeader class="bg-muted/40">
              <TableRow>
                <TableHead class="w-10 pl-4">
                  <input
                    type="checkbox"
                    :class="checkboxClass"
                    :checked="isAllPageSelected"
                    :indeterminate="isPagePartiallySelected"
                    :disabled="isLoading || paginatedRecords.length === 0"
                    aria-label="Select all evaluations on this page"
                    @change="toggleSelectPage"
                  />
                </TableHead>
                <TableHead class="min-w-48 text-xs font-semibold">GIP</TableHead>
                <TableHead class="min-w-32 text-xs font-semibold">Month</TableHead>
                <TableHead class="min-w-24 text-xs font-semibold">Performance</TableHead>
                <TableHead class="min-w-20 text-xs font-semibold">Attitude</TableHead>
                <TableHead class="min-w-36 text-xs font-semibold">Overall</TableHead>
                <TableHead class="min-w-44 text-xs font-semibold">Submitted</TableHead>
                <TableHead class="min-w-24 pr-4 text-right text-xs font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              <TableRow v-if="isLoading && records.length === 0">
                <TableCell :colspan="COLUMN_COUNT" class="h-44 text-center">
                  <div class="flex flex-col items-center justify-center gap-2 py-6">
                    <Loader2 class="h-8 w-8 animate-spin text-primary" />
                    <p class="text-xs text-muted-foreground">Loading the evaluations...</p>
                  </div>
                </TableCell>
              </TableRow>

              <template v-else-if="paginatedRecords.length > 0">
                <TableRow
                  v-for="record in paginatedRecords"
                  :key="record.id"
                  class="transition-colors"
                  :class="isSelected(record.id) ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/30'"
                  :data-state="isSelected(record.id) ? 'selected' : undefined"
                >
                  <TableCell class="w-10 py-3 pl-4">
                    <input
                      type="checkbox"
                      :class="checkboxClass"
                      :checked="isSelected(record.id)"
                      :aria-label="`Select ${record.gipName}`"
                      @change="toggleSelect(record.id)"
                    />
                  </TableCell>
                  <TableCell class="py-3 text-xs font-semibold text-foreground sm:text-sm">{{ record.gipName }}</TableCell>
                  <TableCell class="py-3 text-xs text-foreground whitespace-nowrap">{{ formatPeriodMonth(record.periodMonth) }}</TableCell>
                  <TableCell class="py-3 font-mono text-xs text-foreground">{{ formatScore(record.scores.performance) }}</TableCell>
                  <TableCell class="py-3 font-mono text-xs text-foreground">{{ formatScore(record.scores.attitude) }}</TableCell>
                  <TableCell class="py-3 text-xs whitespace-nowrap">
                    <span class="font-mono font-semibold text-foreground">{{ formatScore(record.scores.overall) }}</span>
                    <span class="text-muted-foreground"> · {{ formatScoreLabel(record.scores.overall) }}</span>
                  </TableCell>
                  <TableCell class="py-3">
                    <div class="flex flex-col">
                      <span class="text-xs text-foreground whitespace-nowrap">{{ formatDisplayDateLong(record.submittedAt) }}</span>
                      <span class="text-[11px] text-muted-foreground">by {{ record.evaluatorName }}</span>
                    </div>
                  </TableCell>
                  <TableCell class="py-3 pr-4 text-right">
                    <div class="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        class="h-8 w-8 cursor-pointer"
                        :title="`View ${record.gipName}'s evaluation`"
                        :aria-label="`View ${record.gipName}'s evaluation`"
                        @click="openView(record)"
                      >
                        <Eye class="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        class="h-8 w-8 text-destructive hover:text-destructive cursor-pointer"
                        :title="`Delete ${record.gipName}'s evaluation`"
                        :aria-label="`Delete ${record.gipName}'s evaluation`"
                        @click="openDeleteDialog(record)"
                      >
                        <Trash2 class="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              </template>

              <TableEmpty v-else :colspan="COLUMN_COUNT">
                <Empty class="py-10">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <ClipboardCheck />
                    </EmptyMedia>
                    <EmptyTitle>{{ loadError ? 'Could not load the evaluations' : 'No evaluations found' }}</EmptyTitle>
                    <EmptyDescription>
                      {{
                        loadError
                          ? loadError
                          : hasActiveFilters
                            ? 'No evaluations match your search or filter.'
                            : 'This office has no submitted evaluations.'
                      }}
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button v-if="loadError" variant="outline" size="sm" class="text-xs cursor-pointer" @click="fetchRecords">
                      Try again
                    </Button>
                    <Button v-else-if="hasActiveFilters" variant="outline" size="sm" class="text-xs cursor-pointer" @click="resetFilters">
                      Reset filters
                    </Button>
                    <Button v-else variant="outline" size="sm" class="text-xs cursor-pointer" @click="backToOffices">
                      Back to offices
                    </Button>
                  </EmptyContent>
                </Empty>
              </TableEmpty>
            </TableBody>
          </Table>
        </div>

        <!-- ─── Pagination ─── -->
        <div
          v-if="filteredRecords.length > 0"
          class="flex flex-col gap-3 border-t px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="flex items-center gap-2">
            <span>Rows per page</span>
            <select v-model.number="pageSize" class="h-8 rounded-md border border-input bg-background px-2 text-xs" aria-label="Rows per page">
              <option :value="10">10</option>
              <option :value="25">25</option>
              <option :value="50">50</option>
            </select>
            <span>{{ pageRange.start }}–{{ pageRange.end }} of {{ filteredRecords.length }}</span>
          </div>
          <div class="flex items-center gap-2">
            <span>Page {{ currentPage }} of {{ totalPages }}</span>
            <Button variant="outline" size="icon" class="h-8 w-8 cursor-pointer" :disabled="currentPage <= 1" aria-label="Previous page" @click="prevPage">
              <ChevronLeft class="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              class="h-8 w-8 cursor-pointer"
              :disabled="currentPage >= totalPages"
              aria-label="Next page"
              @click="nextPage"
            >
              <ChevronRight class="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- ─── View Evaluation ─── -->
    <Sheet :open="isViewOpen" @update:open="onViewOpenChange">
      <SheetContent class="flex h-full flex-col p-0 sm:max-w-xl">
        <SheetHeader class="shrink-0 px-6 pt-6 pb-2">
          <SheetTitle>{{ viewedRecord?.gipName }}</SheetTitle>
          <SheetDescription class="text-xs">{{ viewedDescription }}</SheetDescription>
        </SheetHeader>

        <div v-if="viewedRecord" class="flex flex-1 flex-col gap-6 overflow-y-auto px-6 py-4">
          <div class="grid grid-cols-3 gap-3">
            <div class="rounded-lg border bg-muted/30 p-3">
              <p class="text-[11px] font-medium text-muted-foreground">Performance</p>
              <p class="font-mono text-lg font-bold text-foreground">{{ formatScore(viewedRecord.scores.performance) }}</p>
              <p class="text-[11px] text-muted-foreground">{{ formatScoreLabel(viewedRecord.scores.performance) }}</p>
            </div>
            <div class="rounded-lg border bg-muted/30 p-3">
              <p class="text-[11px] font-medium text-muted-foreground">Attitude</p>
              <p class="font-mono text-lg font-bold text-foreground">{{ formatScore(viewedRecord.scores.attitude) }}</p>
              <p class="text-[11px] text-muted-foreground">{{ formatScoreLabel(viewedRecord.scores.attitude) }}</p>
            </div>
            <div class="rounded-lg border bg-primary/5 p-3">
              <p class="text-[11px] font-medium text-muted-foreground">Overall</p>
              <p class="font-mono text-lg font-bold text-foreground">{{ formatScore(viewedRecord.scores.overall) }}</p>
              <p class="text-[11px] text-muted-foreground">{{ formatScoreLabel(viewedRecord.scores.overall) }}</p>
            </div>
          </div>

          <section v-for="group in viewedGroups" :key="group.category" class="space-y-2">
            <h2 class="text-base font-semibold text-foreground">{{ group.label }}</h2>
            <div class="divide-y rounded-lg border">
              <div v-for="(answer, index) in group.items" :key="answer.questionId" class="flex items-start justify-between gap-4 px-3.5 py-2.5">
                <p class="text-sm text-foreground">
                  <span class="text-muted-foreground">{{ index + 1 }}.</span> {{ answer.question }}
                </p>
                <div class="shrink-0 text-right">
                  <p class="font-mono text-sm font-semibold text-foreground">{{ answer.rating }}</p>
                  <p class="text-[11px] text-muted-foreground whitespace-nowrap">{{ formatRatingLabel(answer.rating) }}</p>
                </div>
              </div>
            </div>
          </section>

          <section class="space-y-1.5">
            <h2 class="text-xs font-semibold text-foreground">Remarks</h2>
            <p class="whitespace-pre-line text-sm text-foreground">{{ viewedRecord.remarks || '—' }}</p>
          </section>

          <p class="text-xs text-muted-foreground">{{ viewedSubmittedLabel }}</p>
        </div>

        <div class="flex shrink-0 justify-end border-t border-border px-6 py-4">
          <Button size="sm" class="text-xs cursor-pointer" @click="closeView">Close</Button>
        </div>
      </SheetContent>
    </Sheet>

    <!-- ─── Delete Confirmation (single & bulk) ─── -->
    <Dialog :open="isDeleteDialogOpen" @update:open="onDeleteDialogOpenChange">
      <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <Trash2 class="h-5 w-5" />
            </div>
            <div>
              <DialogTitle class="text-base font-semibold text-foreground">
                Delete {{ recordsToDelete.length }} {{ recordsToDelete.length === 1 ? 'Evaluation' : 'Evaluations' }}
              </DialogTitle>
              <DialogDescription class="mt-0.5 text-xs">This cannot be undone.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div class="max-h-56 divide-y overflow-y-auto rounded-lg border bg-muted/30 text-xs">
          <div v-for="record in deletePreview" :key="record.id" class="flex items-center justify-between gap-3 px-3.5 py-2">
            <span class="truncate font-semibold text-foreground">{{ record.gipName }}</span>
            <span class="shrink-0 text-muted-foreground">{{ formatPeriodMonth(record.periodMonth) }}</span>
          </div>
          <div v-if="deleteOverflow > 0" class="px-3.5 py-2 text-muted-foreground">…and {{ deleteOverflow }} more</div>
        </div>

        <DialogFooter class="mt-2 gap-2 sm:gap-0">
          <Button variant="outline" size="sm" class="text-xs cursor-pointer" :disabled="isDeleting" @click="closeDeleteDialog">
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            class="gap-1.5 text-xs cursor-pointer"
            :disabled="isDeleting || recordsToDelete.length === 0"
            @click="confirmDelete"
          >
            <Loader2 v-if="isDeleting" class="h-3.5 w-3.5 animate-spin" />
            <Trash2 v-else class="h-3.5 w-3.5" />
            <span>{{ isDeleting ? 'Deleting...' : 'Delete' }}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
