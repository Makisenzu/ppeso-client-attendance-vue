<script setup lang="ts">
import { ClipboardList, Eye, Loader2, Pencil, Plus, Printer, RefreshCw, Trash2 } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import SearchSelect from '@/components/common/SearchSelect.vue'
import SwipeRow from '@/components/vuebits/SwipeRow.vue'
import { useMyAccomplishments } from '@/composables/beneficiary/useMyAccomplishments'

const {
  reports,
  context,
  isLoading,
  hasFunding,
  canAddReport,
  fetchReports,
  statusFilter,
  statusOptions,
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
  toggleSelectPage,
  clearSelection,
  removePreview,
  removableToRemove,
  keptCount,
  isRemoveDialogOpen,
  isRemoving,
  requestRemove,
  requestBulkRemove,
  onRemoveDialogChange,
  closeRemoveDialog,
  confirmRemove,
  addReport,
  openReport,
  printReport,
  formatPeriodRange,
  formatDisplayDateTimeLong,
  fundingFormTitle,
  getReportStatusBadgeClass,
} = useMyAccomplishments()

const COLUMN_COUNT = 6
const checkboxClass =
  'h-4 w-4 cursor-pointer rounded border-input accent-primary align-middle disabled:cursor-not-allowed disabled:opacity-50'
</script>

<template>
  <div class="flex flex-col gap-6 pb-12">
    <!-- ─── Header ─── -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="space-y-1">
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl text-foreground">Accomplishments</h1>
        <p class="text-sm text-muted-foreground">Write, submit and print your accomplishment reports.</p>
      </div>
      <div class="flex flex-wrap items-center gap-2 self-start sm:self-auto">
        <Button size="sm" class="gap-1.5 text-xs cursor-pointer font-semibold" :disabled="!canAddReport" @click="addReport">
          <Plus class="h-3.5 w-3.5" />
          <span>New Report</span>
        </Button>
        <Button variant="outline" size="sm" class="gap-1.5 text-xs cursor-pointer" :disabled="isLoading" @click="fetchReports">
          <RefreshCw :class="['h-3.5 w-3.5', isLoading && 'animate-spin']" />
          <span>Refresh</span>
        </Button>
      </div>
    </div>

    <div
      v-if="!isLoading && context && !hasFunding"
      class="rounded-lg border bg-muted/40 p-3 text-xs text-foreground"
    >
      Your funding (DOLE or PGAS) isn't set yet, so you can't write a report. Ask PESO to set it on your account.
    </div>

    <Card class="border shadow-xs">
      <CardHeader class="pb-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle class="text-lg font-semibold">My Reports</CardTitle>
            <CardDescription class="text-xs">
              <template v-if="context?.funding">{{ fundingFormTitle(context.funding) }} ({{ context.funding }}) · </template>
              {{ filteredReports.length }} of {{ reports.length }} reports
            </CardDescription>
          </div>
          <SearchSelect v-model="statusFilter" :options="statusOptions" :searchable="false" class="w-full sm:w-48" />
        </div>
      </CardHeader>

      <CardContent class="p-0">
        <!-- Bulk bar -->
        <div
          v-if="selectedCount > 0"
          class="flex flex-col gap-2 border-t bg-primary/5 px-4 py-2.5 text-xs sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span class="font-semibold text-foreground">{{ selectedCount }} selected</span>
            <button type="button" class="text-muted-foreground hover:text-foreground cursor-pointer" @click="clearSelection">
              Clear selection
            </button>
          </div>
          <Button variant="destructive" size="sm" class="h-7 gap-1.5 text-xs cursor-pointer self-start sm:self-auto" :disabled="isRemoving" @click="requestBulkRemove">
            <Trash2 class="h-3.5 w-3.5" />
            <span>Remove selected</span>
          </Button>
        </div>

        <!-- Mobile: swipe rows (DESIGN.md §11.2); reviewed reports can't be removed or edited -->
        <div class="divide-y border-t md:hidden">
          <div v-if="isLoading" class="flex justify-center py-10">
            <Loader2 class="h-6 w-6 animate-spin text-primary" />
          </div>
          <template v-else-if="paginatedReports.length > 0">
            <SwipeRow
              v-for="report in paginatedReports"
              :key="report.id"
              :label="`Report ${formatPeriodRange(report.periodStart, report.periodEnd)}`"
              :actions="[
                ...(report.status !== 'Reviewed' ? [{ id: 'remove', label: 'Remove', icon: Trash2, onSelect: () => requestRemove(report) }] : []),
                { id: 'open', label: report.status === 'Reviewed' ? 'View' : 'Edit', icon: report.status === 'Reviewed' ? Eye : Pencil, color: 'var(--primary)', textColor: 'var(--primary-foreground)', onSelect: () => openReport(report) },
                { id: 'print', label: 'Print', icon: Printer, onSelect: () => printReport(report) },
              ]"
            >
              <input
                type="checkbox"
                :class="[checkboxClass, 'shrink-0']"
                :checked="isSelected(report.id)"
                :aria-label="`Select report ${formatPeriodRange(report.periodStart, report.periodEnd)}`"
                @change="toggleSelect(report.id)"
              />
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-semibold text-foreground">{{ formatPeriodRange(report.periodStart, report.periodEnd) }}</p>
                <p class="truncate text-xs text-muted-foreground">{{ report.funding }}</p>
              </div>
              <Badge variant="outline" :class="[getReportStatusBadgeClass(report.status), 'shrink-0 text-[10px]']">
                {{ report.status }}
              </Badge>
            </SwipeRow>
          </template>
          <p v-else class="py-10 text-center text-xs text-muted-foreground">No reports yet.</p>
        </div>

        <div class="relative hidden overflow-x-auto border-t md:block">
          <Table>
            <TableHeader class="bg-muted/40">
              <TableRow>
                <TableHead class="w-10 pl-4">
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
                <TableHead class="min-w-48 text-xs font-semibold">Period</TableHead>
                <TableHead class="min-w-20 text-xs font-semibold">Form</TableHead>
                <TableHead class="min-w-24 text-xs font-semibold">Status</TableHead>
                <TableHead class="min-w-44 text-xs font-semibold">Submitted</TableHead>
                <TableHead class="min-w-32 pr-4 text-right text-xs font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-if="isLoading">
                <TableCell :colspan="COLUMN_COUNT" class="h-40 text-center">
                  <div class="flex flex-col items-center justify-center gap-2 py-6">
                    <Loader2 class="h-8 w-8 animate-spin text-primary" />
                    <p class="text-xs text-muted-foreground">Loading your reports...</p>
                  </div>
                </TableCell>
              </TableRow>

              <template v-else-if="paginatedReports.length > 0">
                <TableRow
                  v-for="report in paginatedReports"
                  :key="report.id"
                  :class="isSelected(report.id) ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/30'"
                >
                  <TableCell class="w-10 py-3 pl-4">
                    <input
                      type="checkbox"
                      :class="checkboxClass"
                      :checked="isSelected(report.id)"
                      :aria-label="`Select report ${formatPeriodRange(report.periodStart, report.periodEnd)}`"
                      @change="toggleSelect(report.id)"
                    />
                  </TableCell>
                  <TableCell class="py-3 text-xs font-medium text-foreground whitespace-nowrap">
                    {{ formatPeriodRange(report.periodStart, report.periodEnd) }}
                  </TableCell>
                  <TableCell class="py-3 text-xs text-muted-foreground">{{ report.funding }}</TableCell>
                  <TableCell class="py-3">
                    <Badge variant="outline" :class="[getReportStatusBadgeClass(report.status), 'text-[10px]']">
                      {{ report.status }}
                    </Badge>
                  </TableCell>
                  <TableCell class="py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {{ report.submittedAt ? formatDisplayDateTimeLong(report.submittedAt) : '—' }}
                  </TableCell>
                  <TableCell class="py-3 pr-4 text-right">
                    <div class="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        class="h-8 w-8 cursor-pointer"
                        :title="report.status === 'Reviewed' ? 'View report' : 'Edit report'"
                        :aria-label="report.status === 'Reviewed' ? 'View report' : 'Edit report'"
                        @click="openReport(report)"
                      >
                        <Eye v-if="report.status === 'Reviewed'" class="h-3.5 w-3.5" />
                        <Pencil v-else class="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" class="h-8 w-8 cursor-pointer" title="Print" aria-label="Print report" @click="printReport(report)">
                        <Printer class="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        v-if="report.status !== 'Reviewed'"
                        variant="ghost"
                        size="icon"
                        class="h-8 w-8 text-destructive/80 hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                        title="Remove report"
                        aria-label="Remove report"
                        @click="requestRemove(report)"
                      >
                        <Trash2 class="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              </template>

              <TableEmpty v-else :colspan="COLUMN_COUNT">
                <Empty class="border-0 p-6 md:p-8">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <ClipboardList class="size-5 text-muted-foreground" />
                    </EmptyMedia>
                    <EmptyTitle>{{ reports.length ? 'No reports with this status' : 'No reports yet' }}</EmptyTitle>
                    <EmptyDescription>
                      {{ reports.length ? 'Pick another status to see your other reports.' : 'Write your first accomplishment report.' }}
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent v-if="!reports.length && canAddReport">
                    <Button size="sm" variant="outline" class="gap-1.5 text-xs cursor-pointer" @click="addReport">
                      <Plus class="h-3.5 w-3.5" />
                      <span>New Report</span>
                    </Button>
                  </EmptyContent>
                </Empty>
              </TableEmpty>
            </TableBody>
          </Table>
        </div>

        <!-- Pagination -->
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

    <!-- ─── Remove confirmation ─── -->
    <Dialog :open="isRemoveDialogOpen" @update:open="onRemoveDialogChange">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle class="text-base">
            Remove {{ removableToRemove.length }} report{{ removableToRemove.length === 1 ? '' : 's' }}?
          </DialogTitle>
          <DialogDescription class="text-xs">
            This can't be undone.<template v-if="keptCount"> {{ keptCount }} reviewed report{{ keptCount === 1 ? '' : 's' }} will be kept.</template>
          </DialogDescription>
        </DialogHeader>
        <div class="max-h-48 overflow-y-auto rounded-lg border bg-muted/30 text-xs divide-y">
          <div v-for="report in removePreview" :key="report.id" class="flex items-center justify-between gap-3 px-3.5 py-2">
            <span class="text-foreground">{{ formatPeriodRange(report.periodStart, report.periodEnd) }}</span>
            <span class="text-muted-foreground">{{ report.status }}</span>
          </div>
        </div>
        <DialogFooter class="gap-2">
          <Button variant="outline" size="sm" class="text-xs cursor-pointer" :disabled="isRemoving" @click="closeRemoveDialog">Cancel</Button>
          <Button
            variant="destructive"
            size="sm"
            class="gap-1.5 text-xs cursor-pointer"
            :disabled="isRemoving || removableToRemove.length === 0"
            @click="confirmRemove"
          >
            <Loader2 v-if="isRemoving" class="h-3.5 w-3.5 animate-spin" />
            <span>{{ isRemoving ? 'Removing...' : 'Remove' }}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
