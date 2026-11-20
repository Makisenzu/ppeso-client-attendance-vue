<script setup lang="ts">
import { Building2, Filter, Loader2, MonitorSmartphone, Plus, Power, RefreshCw, Search, Trash2, X } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import SearchSelect from '@/components/common/SearchSelect.vue'
import SwipeRow from '@/components/vuebits/SwipeRow.vue'
import PasswordInput from '@/components/common/PasswordInput.vue'
import { useOfficeKiosks } from '@/composables/peso/useOfficeKiosks'

const {
  kiosks,
  isLoading,
  loadError,
  fetchKiosks,
  officeOptions,
  searchQuery,
  statusFilter,
  statusFilterOptions,
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
  labelMax,
  passwordMin,
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
} = useOfficeKiosks()

/** Selection, office, computer, sign-in, status, actions */
const COLUMN_COUNT = 6
const checkboxClass =
  'h-4 w-4 cursor-pointer rounded border-input accent-primary align-middle disabled:cursor-not-allowed disabled:opacity-50'
</script>

<template>
  <div class="flex flex-col gap-6 pb-12">
    <!-- ─── Header ─── -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="space-y-1">
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl text-foreground">Office Kiosks</h1>
        <p class="text-sm text-muted-foreground">
          Sign-in accounts for each office's PACD computer. A kiosk records attendance only for its own office's people.
        </p>
      </div>
      <div class="flex items-center gap-2 self-start sm:self-auto">
        <Button variant="outline" size="sm" class="gap-1.5 text-xs cursor-pointer" :disabled="isLoading" @click="fetchKiosks">
          <RefreshCw :class="['h-3.5 w-3.5', isLoading && 'animate-spin']" />
          <span>Refresh</span>
        </Button>
        <Button size="sm" class="gap-1.5 text-xs cursor-pointer" @click="openAdd">
          <Plus class="h-3.5 w-3.5" />
          <span>Add Kiosk</span>
        </Button>
      </div>
    </div>

    <Card class="border shadow-xs">
      <CardHeader class="pb-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle class="text-lg font-semibold">Kiosks</CardTitle>
            <CardDescription class="text-xs">Showing {{ filteredKiosks.length }} of {{ kiosks.length }} kiosks</CardDescription>
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
        <div class="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="sm:col-span-2 relative">
            <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input v-model="searchQuery" placeholder="Search by office, code, computer or email..." class="pl-9 h-9 text-base md:text-xs" />
          </div>
          <SearchSelect v-model="statusFilter" :options="statusFilterOptions" :searchable="false" />
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
            <button v-if="!isAllFilteredSelected" type="button" class="font-medium text-primary hover:underline cursor-pointer" @click="selectAllFiltered">
              Select all {{ filteredKiosks.length }} matching kiosks
            </button>
            <button type="button" class="text-muted-foreground hover:text-foreground cursor-pointer" @click="clearSelection">Clear selection</button>
          </div>
          <Button variant="destructive" size="sm" class="h-7 gap-1.5 text-xs cursor-pointer self-start sm:self-auto" :disabled="isDeleting" @click="requestBulkDelete">
            <Trash2 class="h-3.5 w-3.5" />
            <span>Delete selected</span>
          </Button>
        </div>

        <!-- Mobile: swipe rows (DESIGN.md §11.2) -->
        <div class="divide-y border-t md:hidden">
          <div v-if="isLoading" class="flex justify-center py-10">
            <Loader2 class="h-6 w-6 animate-spin text-primary" />
          </div>
          <div v-else-if="loadError" class="flex flex-col items-center gap-3 py-8">
            <p class="text-xs text-destructive">{{ loadError }}</p>
            <Button size="sm" variant="outline" class="text-xs cursor-pointer" @click="fetchKiosks">Try Again</Button>
          </div>
          <template v-else-if="paginatedKiosks.length > 0">
            <SwipeRow
              v-for="kiosk in paginatedKiosks"
              :key="kiosk.id"
              :label="kiosk.label"
              :disabled="togglingId === kiosk.id"
              :actions="[
                { id: 'delete', label: 'Delete', icon: Trash2, onSelect: () => requestDelete(kiosk) },
                { id: 'toggle', label: kiosk.isActive ? 'Disable' : 'Enable', icon: Power, onSelect: () => toggleActive(kiosk) },
              ]"
            >
              <input
                type="checkbox"
                :class="[checkboxClass, 'shrink-0']"
                :checked="isSelected(kiosk.id)"
                :aria-label="`Select ${kiosk.label}`"
                @change="toggleSelect(kiosk.id)"
              />
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-semibold text-foreground">{{ kiosk.officeCode || kiosk.officeName }}</p>
                <p class="truncate text-xs text-muted-foreground">{{ kiosk.label }}</p>
              </div>
              <Badge
                variant="outline"
                class="shrink-0 text-[10px]"
                :class="kiosk.isActive ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'border-border bg-muted text-muted-foreground'"
              >
                {{ kiosk.isActive ? 'Active' : 'Disabled' }}
              </Badge>
            </SwipeRow>
          </template>
          <p v-else class="py-10 text-center text-xs text-muted-foreground">No kiosks found.</p>
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
                    :disabled="isLoading || paginatedKiosks.length === 0"
                    aria-label="Select all kiosks on this page"
                    @change="toggleSelectPage"
                  />
                </TableHead>
                <TableHead class="min-w-56 text-xs font-semibold">Office</TableHead>
                <TableHead class="min-w-32 text-xs font-semibold">Computer</TableHead>
                <TableHead class="min-w-48 text-xs font-semibold">Sign-in Email</TableHead>
                <TableHead class="min-w-24 text-xs font-semibold">Status</TableHead>
                <TableHead class="min-w-28 pr-4 text-right text-xs font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-if="isLoading">
                <TableCell :colspan="COLUMN_COUNT" class="h-40 text-center">
                  <div class="flex flex-col items-center justify-center gap-2 py-6">
                    <Loader2 class="h-8 w-8 animate-spin text-primary" />
                    <p class="text-xs text-muted-foreground">Loading kiosks...</p>
                  </div>
                </TableCell>
              </TableRow>

              <TableRow v-else-if="loadError">
                <TableCell :colspan="COLUMN_COUNT" class="h-32 text-center">
                  <div class="flex flex-col items-center gap-3 py-4">
                    <p class="text-xs text-destructive">{{ loadError }}</p>
                    <Button size="sm" variant="outline" class="text-xs cursor-pointer" @click="fetchKiosks">Try Again</Button>
                  </div>
                </TableCell>
              </TableRow>

              <template v-else-if="paginatedKiosks.length > 0">
                <TableRow
                  v-for="kiosk in paginatedKiosks"
                  :key="kiosk.id"
                  :class="isSelected(kiosk.id) ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/30'"
                >
                  <TableCell class="w-10 py-3 pl-4">
                    <input
                      type="checkbox"
                      :class="checkboxClass"
                      :checked="isSelected(kiosk.id)"
                      :aria-label="`Select ${kiosk.label}`"
                      @change="toggleSelect(kiosk.id)"
                    />
                  </TableCell>
                  <TableCell class="py-3">
                    <div class="flex items-center gap-2.5 min-w-0">
                      <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Building2 class="h-4 w-4" />
                      </div>
                      <div class="flex min-w-0 flex-col">
                        <span class="truncate text-xs sm:text-sm font-semibold text-foreground">{{ kiosk.officeName }}</span>
                        <span v-if="kiosk.officeCode" class="text-[11px] font-mono text-muted-foreground">{{ kiosk.officeCode }}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell class="py-3 text-xs text-foreground">{{ kiosk.label }}</TableCell>
                  <TableCell class="py-3 text-xs font-mono text-muted-foreground">{{ kiosk.email }}</TableCell>
                  <TableCell class="py-3">
                    <Badge
                      variant="outline"
                      class="text-[10px]"
                      :class="kiosk.isActive ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'border-border bg-muted text-muted-foreground'"
                    >
                      {{ kiosk.isActive ? 'Active' : 'Disabled' }}
                    </Badge>
                  </TableCell>
                  <TableCell class="py-3 pr-4 text-right">
                    <div class="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        class="h-8 gap-1.5 text-xs cursor-pointer"
                        :disabled="togglingId === kiosk.id"
                        :title="kiosk.isActive ? 'Stop this computer from recording attendance' : 'Let this computer record attendance again'"
                        @click="toggleActive(kiosk)"
                      >
                        <Loader2 v-if="togglingId === kiosk.id" class="h-3.5 w-3.5 animate-spin" />
                        <Power v-else class="h-3.5 w-3.5" />
                        <span class="hidden sm:inline">{{ kiosk.isActive ? 'Disable' : 'Enable' }}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        class="h-8 w-8 text-destructive/80 hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                        title="Delete kiosk"
                        :aria-label="`Delete ${kiosk.label}`"
                        @click="requestDelete(kiosk)"
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
                      <MonitorSmartphone v-if="kiosks.length === 0" class="size-5 text-muted-foreground" />
                      <Filter v-else class="size-5 text-muted-foreground" />
                    </EmptyMedia>
                    <EmptyTitle>{{ kiosks.length === 0 ? 'No office kiosks yet' : 'No matching kiosks' }}</EmptyTitle>
                    <EmptyDescription>
                      {{ kiosks.length === 0 ? 'Add a kiosk for an office, then sign in with it on that office\'s PACD computer.' : 'No kiosks match your search or filters.' }}
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button v-if="kiosks.length === 0" size="sm" class="gap-1.5 text-xs cursor-pointer" @click="openAdd">
                      <Plus class="h-3.5 w-3.5" />
                      <span>Add Kiosk</span>
                    </Button>
                    <Button v-else size="sm" variant="outline" class="text-xs cursor-pointer" @click="resetFilters">Clear Filters</Button>
                  </EmptyContent>
                </Empty>
              </TableEmpty>
            </TableBody>
          </Table>
        </div>

        <div
          v-if="filteredKiosks.length > 0"
          class="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 border-t text-xs text-muted-foreground bg-muted/10"
        >
          <div>
            Showing <span class="font-medium text-foreground">{{ pageRange.start }}</span>
            to <span class="font-medium text-foreground">{{ pageRange.end }}</span>
            of <span class="font-medium text-foreground">{{ filteredKiosks.length }}</span> kiosks
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

    <!-- ─── Add kiosk ─── -->
    <Dialog :open="isFormOpen" @update:open="onFormOpenChange">
      <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle class="text-base font-semibold">Add Office Kiosk</DialogTitle>
          <DialogDescription class="text-xs">
            Sign in with this email and password once on the office's PACD computer. It will open the attendance kiosk
            for that office only.
          </DialogDescription>
        </DialogHeader>

        <form class="space-y-4 py-2" autocomplete="off" @submit.prevent="handleSubmit">
          <div
            v-if="formErrors.submit"
            class="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs font-medium text-destructive"
          >
            {{ formErrors.submit }}
          </div>

          <div class="space-y-1.5">
            <label for="kiosk-office" class="text-xs font-medium text-foreground">
              Office <span class="text-destructive">*</span>
            </label>
            <SearchSelect
              id="kiosk-office"
              :model-value="formData.officeId"
              :options="officeOptions"
              placeholder="Choose an office"
              @update:model-value="onOfficeChange"
            />
            <p v-if="formErrors.officeId" class="text-[11px] text-destructive">{{ formErrors.officeId }}</p>
          </div>

          <div class="space-y-1.5">
            <label for="kiosk-label" class="text-xs font-medium text-foreground">
              Computer Name <span class="text-destructive">*</span>
            </label>
            <Input
              id="kiosk-label"
              v-model="formData.label"
              :maxlength="labelMax"
              placeholder="e.g. PACD PC 1"
              class="h-9 text-base md:text-xs"
              :class="formErrors.label ? 'border-destructive focus-visible:ring-destructive' : ''"
            />
            <p v-if="formErrors.label" class="text-[11px] text-destructive">{{ formErrors.label }}</p>
          </div>

          <div class="space-y-1.5">
            <label for="kiosk-email" class="text-xs font-medium text-foreground">
              Sign-in Email <span class="text-destructive">*</span>
            </label>
            <Input
              id="kiosk-email"
              v-model="formData.email"
              type="email"
              autocomplete="off"
              placeholder="e.g. pimo.kiosk@peso.ph"
              class="h-9 text-base md:text-xs"
              :class="formErrors.email ? 'border-destructive focus-visible:ring-destructive' : ''"
            />
            <p v-if="formErrors.email" class="text-[11px] text-destructive">{{ formErrors.email }}</p>
            <p v-else class="text-[11px] text-muted-foreground">Filled in from the office code; you can change it.</p>
          </div>

          <div class="space-y-1.5">
            <label for="kiosk-password" class="text-xs font-medium text-foreground">
              Password <span class="text-destructive">*</span>
            </label>
            <PasswordInput
              id="kiosk-password"
              v-model="formData.password"
              autocomplete="new-password"
              :placeholder="`At least ${passwordMin} characters`"
              class="h-9 text-base md:text-xs"
              :class="formErrors.password ? 'border-destructive focus-visible:ring-destructive' : ''"
            />
            <p v-if="formErrors.password" class="text-[11px] text-destructive">{{ formErrors.password }}</p>
          </div>

          <DialogFooter class="gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" class="text-xs cursor-pointer" :disabled="isSubmitting" @click="closeForm">
              Cancel
            </Button>
            <Button type="submit" size="sm" class="gap-1.5 text-xs cursor-pointer" :disabled="isSubmitting">
              <Loader2 v-if="isSubmitting" class="h-3.5 w-3.5 animate-spin" />
              <span>{{ isSubmitting ? 'Creating...' : 'Create Kiosk' }}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- ─── Delete confirmation (single & bulk) ─── -->
    <Dialog :open="isDeleteDialogOpen" @update:open="onDeleteDialogOpenChange">
      <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <Trash2 class="h-5 w-5" />
            </div>
            <div>
              <DialogTitle class="text-base font-semibold text-foreground">
                Delete {{ kiosksToDelete.length }} {{ kiosksToDelete.length === 1 ? 'Kiosk' : 'Kiosks' }}
              </DialogTitle>
              <DialogDescription class="mt-0.5 text-xs">
                The sign-in account is removed and that computer can no longer record attendance. Recorded attendance stays.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div class="max-h-56 divide-y overflow-y-auto rounded-lg border bg-muted/30 text-xs">
          <div v-for="item in deletePreview" :key="item.id" class="flex items-center justify-between gap-3 px-3.5 py-2">
            <span class="truncate font-semibold text-foreground">{{ item.label }}</span>
            <span class="shrink-0 text-muted-foreground">{{ item.officeCode || item.officeName }}</span>
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
            :disabled="isDeleting || kiosksToDelete.length === 0"
            @click="confirmDelete"
          >
            <Loader2 v-if="isDeleting" class="h-3.5 w-3.5 animate-spin" />
            <span>{{ isDeleting ? 'Deleting...' : 'Delete' }}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
