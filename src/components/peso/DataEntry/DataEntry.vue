<script setup lang="ts">
import {
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from '@lucide/vue'
import SwipeRow from '@/components/vuebits/SwipeRow.vue'
import SearchSelect from '@/components/common/SearchSelect.vue'
import MobileFilters from '@/components/common/MobileFilters.vue'
import DataEntrySheet from '@/components/peso/DataEntry/DataEntrySheet.vue'
import { Button } from '@/components/ui/button'
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
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { useDataEntry } from '@/composables/peso/useDataEntry'
import { formatDisplayDateLong } from '@/helpers/common/dateFormatHelper'
import { formatContactNumber } from '@/helpers/common/contactNumberHelper'
import { beneficiaryTypeLabel, computeAge, formatEntryName, sexLabel } from '@/helpers/peso/dataEntryHelper'

const {
  entries,
  total,
  isLoading,
  loadError,
  searchQuery,
  typeFilter,
  municipalityFilter,
  typeFilterOptions,
  municipalityFilterOptions,
  hasActiveFilters,
  hasAnyFilter,
  currentPage,
  pageSize,
  totalPages,
  pageRange,
  prevPage,
  nextPage,
  resetFilters,
  fetchEntries,
  selectedCount,
  isSelectingAll,
  isSelected,
  isAllPageSelected,
  isPagePartiallySelected,
  isAllFilteredSelected,
  toggleSelect,
  toggleSelectPage,
  selectAllFiltered,
  clearSelection,
  isSheetOpen,
  editingEntry,
  isSubmitting,
  openCreate,
  openEdit,
  onSheetOpenChange,
  handleSubmit,
  isDeleteDialogOpen,
  isDeleting,
  recordsToDelete,
  deletePreview,
  deleteOverflow,
  openDeleteDialog,
  openBulkDeleteDialog,
  closeDeleteDialog,
  confirmDelete,
  isExporting,
  exportLabel,
  exportAnnexD,
} = useDataEntry()

const COLUMN_COUNT = 7

const checkboxClass =
  'h-4 w-4 cursor-pointer rounded border-input accent-primary align-middle disabled:cursor-not-allowed disabled:opacity-50'
</script>

<template>
  <div class="flex min-w-0 flex-col gap-6 overflow-x-hidden">
    <!-- ─── Page header ─── -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Data Entry</h1>
        <p class="text-sm text-muted-foreground">TUPAD beneficiary profiles for the DOLE ANNEX D form.</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <Button size="sm" class="gap-1.5 text-xs cursor-pointer" @click="openCreate">
          <Plus class="h-3.5 w-3.5" />
          <span>Add Entry</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          class="gap-1.5 text-xs cursor-pointer"
          :disabled="isExporting || total === 0"
          @click="exportAnnexD"
        >
          <Loader2 v-if="isExporting" class="h-3.5 w-3.5 animate-spin" />
          <FileSpreadsheet v-else class="h-3.5 w-3.5" />
          <span>{{ isExporting ? 'Exporting...' : exportLabel }}</span>
        </Button>
        <Button
          variant="outline"
          size="icon"
          class="h-8 w-8 cursor-pointer"
          :disabled="isLoading"
          title="Refresh"
          aria-label="Refresh"
          @click="fetchEntries"
        >
          <RefreshCw :class="['h-3.5 w-3.5', isLoading && 'animate-spin']" />
        </Button>
      </div>
    </div>

    <Card class="border shadow-xs">
      <CardHeader class="pb-4">
        <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle class="text-lg font-semibold">Profile of TUPAD Beneficiaries</CardTitle>
            <CardDescription class="text-xs">{{ total.toLocaleString() }} {{ total === 1 ? 'entry' : 'entries' }}</CardDescription>
          </div>
          <button
            v-if="hasAnyFilter"
            type="button"
            class="self-start text-xs font-medium text-primary hover:underline cursor-pointer sm:self-auto"
            @click="resetFilters"
          >
            Clear filters
          </button>
        </div>

        <!-- Search & Filters -->
        <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
          <div class="relative sm:col-span-2">
            <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              v-model="searchQuery"
              placeholder="Search by name or ID number..."
              class="h-9 pl-9 text-base md:text-xs"
              aria-label="Search entries"
            />
            <button
              v-if="searchQuery"
              type="button"
              class="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Clear search"
              @click="searchQuery = ''"
            >
              <X class="h-4 w-4" />
            </button>
          </div>
          <MobileFilters :active="hasActiveFilters">
            <SearchSelect
              v-model="typeFilter"
              :options="typeFilterOptions"
              :searchable="false"
              placeholder="All beneficiary types"
              aria-label="Filter by beneficiary type"
            />
            <SearchSelect
              v-model="municipalityFilter"
              :options="municipalityFilterOptions"
              placeholder="All municipalities"
              search-placeholder="Search municipality..."
              aria-label="Filter by municipality"
            />
          </MobileFilters>
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
              {{ selectedCount }} {{ selectedCount === 1 ? 'entry' : 'entries' }} selected
            </span>
            <button
              v-if="!isAllFilteredSelected"
              type="button"
              class="font-medium text-primary hover:underline cursor-pointer disabled:opacity-50"
              :disabled="isSelectingAll"
              @click="selectAllFiltered"
            >
              {{ isSelectingAll ? 'Selecting...' : `Select all ${total.toLocaleString()} matching entries` }}
            </button>
            <button type="button" class="text-muted-foreground hover:text-foreground cursor-pointer" @click="clearSelection">
              Clear selection
            </button>
          </div>
          <Button
            variant="destructive"
            size="sm"
            class="h-7 gap-1.5 self-start text-xs cursor-pointer sm:self-auto"
            :disabled="isDeleting"
            @click="openBulkDeleteDialog"
          >
            <Trash2 class="h-3.5 w-3.5" />
            <span>Delete selected</span>
          </Button>
        </div>

        <!-- Mobile: swipe rows (DESIGN.md §11.2) -->
        <div class="divide-y border-t md:hidden">
          <div v-if="isLoading" class="flex justify-center py-10">
            <Loader2 class="h-6 w-6 animate-spin text-primary" />
          </div>
          <div v-else-if="loadError" class="flex flex-col items-center gap-2 py-10 text-center">
            <p class="text-xs text-destructive">{{ loadError }}</p>
            <Button variant="outline" size="sm" class="text-xs cursor-pointer" @click="fetchEntries">Try Again</Button>
          </div>
          <template v-else-if="entries.length > 0">
            <SwipeRow
              v-for="entry in entries"
              :key="entry.id"
              :label="formatEntryName(entry)"
              :actions="[
                { id: 'delete', label: 'Delete', icon: Trash2, onSelect: () => openDeleteDialog(entry) },
                { id: 'edit', label: 'Edit', icon: Pencil, color: 'var(--primary)', textColor: 'var(--primary-foreground)', onSelect: () => openEdit(entry) },
              ]"
            >
              <input
                type="checkbox"
                :class="[checkboxClass, 'shrink-0']"
                :checked="isSelected(entry.id)"
                :aria-label="`Select ${formatEntryName(entry)}`"
                @change="toggleSelect(entry)"
              />
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-semibold text-foreground">{{ formatEntryName(entry) }}</p>
                <p class="truncate text-xs text-muted-foreground">
                  {{ entry.barangay }}, {{ entry.municipality }} · {{ beneficiaryTypeLabel(entry.beneficiary_type) }}
                </p>
              </div>
            </SwipeRow>
          </template>
          <p v-else class="py-10 text-center text-xs text-muted-foreground">No entries found.</p>
        </div>

        <!-- Desktop: table -->
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
                    :disabled="isLoading || entries.length === 0"
                    aria-label="Select all entries on this page"
                    @change="toggleSelectPage"
                  />
                </TableHead>
                <TableHead class="min-w-56 text-xs font-semibold">Name of Beneficiary</TableHead>
                <TableHead class="min-w-36 text-xs font-semibold">Birthdate</TableHead>
                <TableHead class="min-w-52 text-xs font-semibold">Project Location</TableHead>
                <TableHead class="min-w-44 text-xs font-semibold">Type of Beneficiary</TableHead>
                <TableHead class="min-w-32 text-xs font-semibold">Contact No.</TableHead>
                <TableHead class="min-w-24 text-right text-xs font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              <TableRow v-if="isLoading">
                <TableCell :colspan="COLUMN_COUNT" class="h-44 text-center">
                  <div class="flex flex-col items-center justify-center gap-2 py-6">
                    <Loader2 class="h-8 w-8 animate-spin text-primary" />
                    <p class="text-xs text-muted-foreground">Loading entries...</p>
                  </div>
                </TableCell>
              </TableRow>

              <template v-else-if="entries.length > 0">
                <TableRow
                  v-for="entry in entries"
                  :key="entry.id"
                  class="transition-colors"
                  :class="isSelected(entry.id) ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/30'"
                  :data-state="isSelected(entry.id) ? 'selected' : undefined"
                >
                  <TableCell class="w-10 py-3 pl-4">
                    <input
                      type="checkbox"
                      :class="checkboxClass"
                      :checked="isSelected(entry.id)"
                      :aria-label="`Select ${formatEntryName(entry)}`"
                      @change="toggleSelect(entry)"
                    />
                  </TableCell>
                  <TableCell class="py-3">
                    <div class="flex min-w-0 flex-col">
                      <span class="text-sm font-semibold text-foreground">{{ formatEntryName(entry) }}</span>
                      <span class="text-[11px] text-muted-foreground">
                        {{ sexLabel(entry.sex) }}<template v-if="entry.occupation"> · {{ entry.occupation }}</template>
                      </span>
                    </div>
                  </TableCell>
                  <TableCell class="py-3 text-xs whitespace-nowrap text-foreground">
                    {{ formatDisplayDateLong(entry.birthdate) }}
                    <span class="block text-[11px] text-muted-foreground">{{ computeAge(entry.birthdate) ?? '—' }} years old</span>
                  </TableCell>
                  <TableCell class="py-3 text-xs text-foreground">
                    {{ entry.barangay }}, {{ entry.municipality }}
                    <span class="block text-[11px] text-muted-foreground">
                      {{ entry.province }}<template v-if="entry.district"> · {{ entry.district }}</template>
                    </span>
                  </TableCell>
                  <TableCell class="py-3 text-xs text-foreground">{{ beneficiaryTypeLabel(entry.beneficiary_type) }}</TableCell>
                  <TableCell class="py-3 font-mono text-xs whitespace-nowrap text-muted-foreground">
                    {{ formatContactNumber(entry.contact_number) || '—' }}
                  </TableCell>
                  <TableCell class="py-3 text-right">
                    <div class="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        class="h-8 w-8 cursor-pointer"
                        title="Edit entry"
                        :aria-label="`Edit ${formatEntryName(entry)}`"
                        @click="openEdit(entry)"
                      >
                        <Pencil class="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        class="h-8 w-8 text-destructive hover:text-destructive cursor-pointer"
                        title="Delete entry"
                        :aria-label="`Delete ${formatEntryName(entry)}`"
                        @click="openDeleteDialog(entry)"
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
                      <FileSpreadsheet />
                    </EmptyMedia>
                    <EmptyTitle>{{ loadError ? 'Could not load the entries' : 'No entries found' }}</EmptyTitle>
                    <EmptyDescription>
                      {{ loadError ? loadError : hasAnyFilter ? 'No entries match your search or filters.' : 'Add the first beneficiary profile.' }}
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button v-if="loadError" variant="outline" size="sm" class="text-xs cursor-pointer" @click="fetchEntries">
                      Try Again
                    </Button>
                    <Button v-else-if="hasAnyFilter" variant="outline" size="sm" class="text-xs cursor-pointer" @click="resetFilters">
                      Reset filters
                    </Button>
                  </EmptyContent>
                </Empty>
              </TableEmpty>
            </TableBody>
          </Table>
        </div>

        <!-- ─── Pagination ─── -->
        <div
          v-if="total > 0"
          class="flex flex-col gap-3 border-t px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="flex items-center gap-2">
            <span>Rows per page</span>
            <select
              v-model.number="pageSize"
              class="h-8 rounded-md border border-input bg-background px-2 text-xs"
              aria-label="Rows per page"
            >
              <option :value="10">10</option>
              <option :value="25">25</option>
              <option :value="50">50</option>
            </select>
            <span>{{ pageRange.start }}–{{ pageRange.end }} of {{ total.toLocaleString() }}</span>
          </div>
          <div class="flex items-center gap-2">
            <span>Page {{ currentPage }} of {{ totalPages }}</span>
            <Button
              variant="outline"
              size="icon"
              class="h-8 w-8 cursor-pointer"
              :disabled="currentPage <= 1 || isLoading"
              aria-label="Previous page"
              @click="prevPage"
            >
              <ChevronLeft class="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              class="h-8 w-8 cursor-pointer"
              :disabled="currentPage >= totalPages || isLoading"
              aria-label="Next page"
              @click="nextPage"
            >
              <ChevronRight class="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- ─── Add / Edit ─── -->
    <DataEntrySheet
      :open="isSheetOpen"
      :entry="editingEntry"
      :is-submitting="isSubmitting"
      @update:open="onSheetOpenChange"
      @submit="handleSubmit"
    />

    <!-- ─── Delete Confirmation (single & bulk) ─── -->
    <Dialog :open="isDeleteDialogOpen" @update:open="(val: boolean) => (!val ? closeDeleteDialog() : null)">
      <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <Trash2 class="h-5 w-5" />
            </div>
            <div>
              <DialogTitle class="text-base font-semibold text-foreground">
                Delete {{ recordsToDelete.length }} {{ recordsToDelete.length === 1 ? 'Entry' : 'Entries' }}
              </DialogTitle>
              <DialogDescription class="mt-0.5 text-xs">This cannot be undone.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div class="max-h-56 divide-y overflow-y-auto rounded-lg border bg-muted/30 text-xs">
          <div v-for="item in deletePreview" :key="item.id" class="px-3.5 py-2 font-semibold text-foreground truncate">
            {{ item.name }}
          </div>
          <div v-if="deleteOverflow > 0" class="px-3.5 py-2 text-muted-foreground">…and {{ deleteOverflow }} more</div>
        </div>

        <DialogFooter class="mt-2 gap-2">
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
