<script setup lang="ts">
import {
  BookUser,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from '@lucide/vue'
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
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { useDirectory } from '@/composables/peso/useDirectory'
import { formatStatusLabel, getStatusBadgeClass } from '@/helpers/peso/officeHelper'
import { formatDisplayDate } from '@/helpers/common/dateFormatHelper'

const {
  directories,
  filteredDirectories,
  paginatedDirectories,
  stats,
  isLoading,
  loadError,
  searchQuery,
  statusFilter,
  currentPage,
  pageSize,
  totalPages,
  prevPage,
  nextPage,
  resetFilters,
  fetchDirectories,
  selectedCount,
  isAllPageSelected,
  isPagePartiallySelected,
  isAllFilteredSelected,
  isSelected,
  toggleSelect,
  toggleSelectPage,
  selectAllFiltered,
  clearSelection,
  isFormOpen,
  isEditMode,
  isSubmitting,
  formData,
  formErrors,
  openCreate,
  openEdit,
  closeForm,
  handleSubmit,
  isDeleteDialogOpen,
  isDeleting,
  recordsToDelete,
  linkedToDeleteCount,
  openDeleteDialog,
  openBulkDeleteDialog,
  closeDeleteDialog,
  confirmDelete,
  pageRange,
  deletePreview,
  deleteOverflow,
} = useDirectory()

const COLUMN_COUNT = 7

const checkboxClass =
  'h-4 w-4 cursor-pointer rounded border-input accent-primary align-middle disabled:cursor-not-allowed disabled:opacity-50'
</script>

<template>
  <div class="flex flex-col gap-4">
    <Card class="border shadow-xs">
      <CardHeader class="pb-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle class="text-lg font-semibold">Office Directory</CardTitle>
            <CardDescription class="text-xs">
              {{ stats.total }} offices · {{ stats.active }} active · {{ stats.inactive }} inactive
            </CardDescription>
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
              :disabled="isLoading"
              @click="fetchDirectories"
            >
              <RefreshCw :class="['h-3.5 w-3.5', isLoading && 'animate-spin']" />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        <!-- Search & Filter -->
        <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div class="relative sm:col-span-2">
            <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input v-model="searchQuery" placeholder="Search by office, code or head..." class="h-9 pl-9 text-base md:text-xs" />
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
          <select
            v-model="statusFilter"
            class="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            aria-label="Filter by status"
          >
            <option value="ALL">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
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
              class="font-medium text-primary hover:underline cursor-pointer"
              @click="selectAllFiltered"
            >
              Select all {{ filteredDirectories.length }} matching entries
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
                    :disabled="isLoading || paginatedDirectories.length === 0"
                    aria-label="Select all entries on this page"
                    @change="toggleSelectPage"
                  />
                </TableHead>
                <TableHead class="min-w-56 text-xs font-semibold">Office Name</TableHead>
                <TableHead class="min-w-24 text-xs font-semibold">Office Code</TableHead>
                <TableHead class="min-w-44 text-xs font-semibold">Office Head</TableHead>
                <TableHead class="min-w-24 text-xs font-semibold">Status</TableHead>
                <TableHead class="min-w-28 text-xs font-semibold">Date Added</TableHead>
                <TableHead class="min-w-24 text-right text-xs font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              <TableRow v-if="isLoading">
                <TableCell :colspan="COLUMN_COUNT" class="h-44 text-center">
                  <div class="flex flex-col items-center justify-center gap-2 py-6">
                    <Loader2 class="h-8 w-8 animate-spin text-primary" />
                    <p class="text-xs text-muted-foreground">Loading the office directory...</p>
                  </div>
                </TableCell>
              </TableRow>

              <template v-else-if="paginatedDirectories.length > 0">
                <TableRow
                  v-for="entry in paginatedDirectories"
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
                      :aria-label="`Select ${entry.officeName}`"
                      @change="toggleSelect(entry.id)"
                    />
                  </TableCell>
                  <TableCell class="py-3">
                    <div class="flex min-w-0 flex-col">
                      <span class="text-xs font-semibold text-foreground sm:text-sm">{{ entry.officeName }}</span>
                      <span v-if="entry.linkedOfficeName" class="text-[11px] text-muted-foreground">
                        Used by an office
                      </span>
                    </div>
                  </TableCell>
                  <TableCell class="py-3">
                    <span
                      v-if="entry.officeCode"
                      class="inline-flex rounded border border-border/50 bg-muted/70 px-2 py-0.5 font-mono text-xs font-medium text-foreground"
                    >
                      {{ entry.officeCode }}
                    </span>
                    <span v-else class="font-mono text-xs text-muted-foreground">—</span>
                  </TableCell>
                  <TableCell class="py-3 text-xs text-foreground sm:text-sm">
                    {{ entry.officeHead || '—' }}
                  </TableCell>
                  <TableCell class="py-3">
                    <Badge
                      variant="outline"
                      :class="[getStatusBadgeClass(entry.status), 'h-5 px-2 py-0.5 font-mono text-[11px] capitalize']"
                    >
                      {{ formatStatusLabel(entry.status) }}
                    </Badge>
                  </TableCell>
                  <TableCell class="py-3 font-mono text-xs text-muted-foreground">
                    {{ formatDisplayDate(entry.createdAt) }}
                  </TableCell>
                  <TableCell class="py-3 text-right">
                    <div class="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        class="h-8 w-8 cursor-pointer"
                        :title="`Edit ${entry.officeName}`"
                        :aria-label="`Edit ${entry.officeName}`"
                        @click="openEdit(entry)"
                      >
                        <Pencil class="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        class="h-8 w-8 text-destructive hover:text-destructive cursor-pointer"
                        :title="`Delete ${entry.officeName}`"
                        :aria-label="`Delete ${entry.officeName}`"
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
                      <BookUser />
                    </EmptyMedia>
                    <EmptyTitle>{{ loadError ? 'Could not load the directory' : 'No directory entries found' }}</EmptyTitle>
                    <EmptyDescription>
                      {{
                        loadError
                          ? loadError
                          : directories.length === 0
                            ? 'Add the first office to the directory.'
                            : 'No entries match your search or filter.'
                      }}
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button
                      v-if="loadError"
                      variant="outline"
                      size="sm"
                      class="text-xs cursor-pointer"
                      @click="fetchDirectories"
                    >
                      Try again
                    </Button>
                    <Button
                      v-else-if="directories.length > 0"
                      variant="outline"
                      size="sm"
                      class="text-xs cursor-pointer"
                      @click="resetFilters"
                    >
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
          v-if="filteredDirectories.length > 0"
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
            <span>
              {{ pageRange.start }}–{{ pageRange.end }}
              of {{ filteredDirectories.length }}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <span>Page {{ currentPage }} of {{ totalPages }}</span>
            <Button
              variant="outline"
              size="icon"
              class="h-8 w-8 cursor-pointer"
              :disabled="currentPage <= 1"
              aria-label="Previous page"
              @click="prevPage"
            >
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

    <!-- ─── Add / Edit Entry Dialog ─── -->
    <Dialog :open="isFormOpen" @update:open="(val: boolean) => (!val ? closeForm() : null)">
      <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle class="text-base font-semibold">
            {{ isEditMode ? 'Edit Directory Entry' : 'Add Directory Entry' }}
          </DialogTitle>
          <DialogDescription class="text-xs">
            {{ isEditMode ? 'Changes also show on offices linked to this entry.' : 'Add an office and its head.' }}
          </DialogDescription>
        </DialogHeader>

        <form class="space-y-4 py-2" @submit.prevent="handleSubmit">
          <div
            v-if="formErrors.submit"
            class="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs font-medium text-destructive"
          >
            {{ formErrors.submit }}
          </div>

          <div class="space-y-1.5">
            <label for="directory-office-name" class="text-xs font-medium text-foreground">
              Office Name <span class="text-destructive">*</span>
            </label>
            <Input
              id="directory-office-name"
              v-model="formData.officeName"
              class="h-9 text-base md:text-xs"
              :class="formErrors.officeName ? 'border-destructive focus-visible:ring-destructive' : ''"
            />
            <p v-if="formErrors.officeName" class="text-[11px] text-destructive">{{ formErrors.officeName }}</p>
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="space-y-1.5">
              <label for="directory-office-code" class="text-xs font-medium text-foreground">Office Code</label>
              <Input
                id="directory-office-code"
                v-model="formData.officeCode"
                class="h-9 font-mono uppercase text-base md:text-xs"
                :class="formErrors.officeCode ? 'border-destructive focus-visible:ring-destructive' : ''"
              />
              <p v-if="formErrors.officeCode" class="text-[11px] text-destructive">{{ formErrors.officeCode }}</p>
            </div>

            <div class="space-y-1.5">
              <label for="directory-status" class="text-xs font-medium text-foreground">Status</label>
              <select
                id="directory-status"
                v-model="formData.status"
                class="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-base shadow-xs md:text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div class="space-y-1.5">
            <label for="directory-office-head" class="text-xs font-medium text-foreground">Office Head</label>
            <Input id="directory-office-head" v-model="formData.officeHead" class="h-9 text-base md:text-xs" />
          </div>

          <DialogFooter class="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              class="text-xs cursor-pointer"
              :disabled="isSubmitting"
              @click="closeForm"
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" class="gap-1.5 text-xs cursor-pointer" :disabled="isSubmitting">
              <Loader2 v-if="isSubmitting" class="h-3.5 w-3.5 animate-spin" />
              <span>{{ isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Add Entry' }}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

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
                Delete {{ recordsToDelete.length }} Directory {{ recordsToDelete.length === 1 ? 'Entry' : 'Entries' }}
              </DialogTitle>
              <DialogDescription class="mt-0.5 text-xs">This cannot be undone.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div class="max-h-56 divide-y overflow-y-auto rounded-lg border bg-muted/30 text-xs">
          <div
            v-for="entry in deletePreview"
            :key="entry.id"
            class="flex items-center justify-between gap-3 px-3.5 py-2"
          >
            <span class="truncate font-semibold text-foreground">{{ entry.officeName }}</span>
            <span class="shrink-0 font-mono text-muted-foreground">{{ entry.officeCode || '—' }}</span>
          </div>
          <div v-if="deleteOverflow > 0" class="px-3.5 py-2 text-muted-foreground">
            …and {{ deleteOverflow }} more
          </div>
        </div>

        <p v-if="linkedToDeleteCount > 0" class="text-xs text-muted-foreground">
          {{ linkedToDeleteCount === 1 ? '1 entry is' : `${linkedToDeleteCount} entries are` }} used by an office.
          The office stays, but will no longer show its head.
        </p>

        <DialogFooter class="mt-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            class="text-xs cursor-pointer"
            :disabled="isDeleting"
            @click="closeDeleteDialog"
          >
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
