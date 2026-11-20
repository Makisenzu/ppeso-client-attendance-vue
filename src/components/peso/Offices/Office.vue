<script setup lang="ts">
import DirectoryTab from './DirectoryTab.vue'
import {
  AlertTriangle,
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  X,
} from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { useOffice } from '@/composables/peso/useOffice'
import {
  formatDateDisplay,
  formatStatusLabel,
  getStatusBadgeClass,
} from '@/helpers/peso/officeHelper'

const {
  offices,
  filteredOffices,
  paginatedOffices,
  statsSummary,
  isLoading,
  searchQuery,
  selectedStatusFilter,
  currentPage,
  totalPages,
  isAddEditOpen,
  isEditMode,
  isSubmitting,
  formErrors,
  formData,
  isLoadingDirectories,
  directoryLoadError,
  directorySearch,
  isDirectoryPickerOpen,
  selectedDirectory,
  filteredDirectories,
  isDirectoryTaken,
  loadDirectories,
  selectDirectory,
  isDeleteDialogOpen,
  officeToDelete,
  isDeleting,
  prevPage,
  nextPage,
  resetFilters,
  clearSearch,
  filterByStatus,
  openCreate,
  openEdit,
  closeAddEdit,
  handleSubmit,
  openView,
  openDeleteDialog,
  closeDeleteDialog,
  confirmDelete,
  exportCsv,
  refreshOffices,
  pageRange,
  tabs,
  activeTab,
  setTab,
} = useOffice()

</script>

<template>
  <div class="flex flex-col gap-6 pb-12">
    <!-- ─── Header & Title ─── -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="space-y-1">
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
          Office Management
        </h1>
        <p class="text-sm text-muted-foreground">
          Manage offices and their directory.
        </p>
      </div>

      <!-- Quick Action Buttons (Offices tab) -->
      <div v-if="activeTab === 'offices'" class="flex items-center gap-2 self-start sm:self-auto flex-wrap">
        <Button
          variant="default"
          size="sm"
          class="gap-1.5 text-xs cursor-pointer shadow-xs"
          @click="openCreate"
        >
          <Plus class="h-3.5 w-3.5" />
          <span>Add Office</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          class="gap-1.5 text-xs cursor-pointer shadow-xs"
          @click="exportCsv"
        >
          <Download class="h-3.5 w-3.5" />
          <span>Export CSV</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          class="gap-1.5 text-xs cursor-pointer shadow-xs"
          :disabled="isLoading"
          @click="refreshOffices"
        >
          <RefreshCw :class="['h-3.5 w-3.5', isLoading && 'animate-spin']" />
          <span>Refresh</span>
        </Button>
      </div>
    </div>

    <!-- ─── Tabs ─── -->
    <div
      role="tablist"
      aria-label="Office management sections"
      class="inline-flex w-full self-start rounded-lg border bg-muted/40 p-1 sm:w-auto"
    >
      <button
        v-for="tab in tabs"
        :id="`office-tab-${tab.key}`"
        :key="tab.key"
        type="button"
        role="tab"
        :aria-selected="activeTab === tab.key"
        :aria-controls="`office-panel-${tab.key}`"
        class="flex-1 rounded-md px-4 py-1.5 text-xs font-medium transition-colors cursor-pointer sm:flex-none"
        :class="
          activeTab === tab.key
            ? 'bg-background text-foreground shadow-xs'
            : 'text-muted-foreground hover:text-foreground'
        "
        @click="setTab(tab.key)"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- ─── Directory Tab ─── -->
    <div
      v-if="activeTab === 'directory'"
      id="office-panel-directory"
      role="tabpanel"
      aria-labelledby="office-tab-directory"
    >
      <DirectoryTab />
    </div>

    <!-- ─── Offices Tab ─── -->
    <div
      v-else
      id="office-panel-offices"
      role="tabpanel"
      aria-labelledby="office-tab-offices"
      class="flex flex-col gap-6"
    >
    <!-- ─── Metric Cards Grid ─── -->
    <div class="hidden md:grid grid-cols-2 md:grid-cols-4 gap-4">
      <!-- 1. Total Offices -->
      <Card
        class="border shadow-xs bg-card/60 backdrop-blur-xs hover:border-primary/40 transition-all cursor-pointer"
        :class="
          selectedStatusFilter === 'ALL'
            ? 'border-primary ring-2 ring-primary/20 shadow-sm'
            : ''
        "
        @click="resetFilters"
      >
        <CardContent class="p-4 flex items-center justify-between">
          <div class="space-y-0.5 min-w-0">
            <p class="text-xs font-medium text-muted-foreground truncate">Total Offices</p>
            <p class="text-2xl font-bold tracking-tight font-mono text-foreground">
              {{ statsSummary.total.toLocaleString() }}
            </p>
            <p class="text-[11px] text-muted-foreground truncate">
              All registered offices
            </p>
          </div>
        </CardContent>
      </Card>

      <!-- 2. Active Offices -->
      <Card
        class="border shadow-xs bg-card/60 backdrop-blur-xs hover:border-emerald-500/40 transition-all cursor-pointer"
        :class="
          selectedStatusFilter === 'active'
            ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm'
            : ''
        "
        @click="filterByStatus('active')"
      >
        <CardContent class="p-4 flex items-center justify-between">
          <div class="space-y-0.5 min-w-0">
            <p class="text-xs font-medium text-muted-foreground truncate">Active Offices</p>
            <p
              class="text-2xl font-bold tracking-tight font-mono text-emerald-600 dark:text-emerald-400"
            >
              {{ statsSummary.activeCount.toLocaleString() }}
            </p>
            <p class="text-[11px] text-muted-foreground truncate">
              Currently operational
            </p>
          </div>
        </CardContent>
      </Card>

      <!-- 3. Inactive Offices -->
      <Card
        class="border shadow-xs bg-card/60 backdrop-blur-xs hover:border-rose-500/40 transition-all cursor-pointer"
        :class="
          selectedStatusFilter === 'inactive'
            ? 'border-rose-500 ring-2 ring-rose-500/20 shadow-sm'
            : ''
        "
        @click="filterByStatus('inactive')"
      >
        <CardContent class="p-4 flex items-center justify-between">
          <div class="space-y-0.5 min-w-0">
            <p class="text-xs font-medium text-muted-foreground truncate">Inactive Offices</p>
            <p
              class="text-2xl font-bold tracking-tight font-mono text-rose-600 dark:text-rose-400"
            >
              {{ statsSummary.inactiveCount.toLocaleString() }}
            </p>
            <p class="text-[11px] text-muted-foreground truncate">
              Deactivated or archived
            </p>
          </div>
        </CardContent>
      </Card>

      <!-- 4. Total Beneficiaries -->
      <Card
        class="border shadow-xs bg-card/60 backdrop-blur-xs hover:border-blue-500/40 transition-all"
      >
        <CardContent class="p-4 flex items-center justify-between">
          <div class="space-y-0.5 min-w-0">
            <p class="text-xs font-medium text-muted-foreground truncate">
              Total Beneficiaries
            </p>
            <p
              class="text-2xl font-bold tracking-tight font-mono text-blue-600 dark:text-blue-400"
            >
              {{ statsSummary.totalBeneficiaries.toLocaleString() }}
            </p>
            <p class="text-[11px] text-muted-foreground truncate">
              Assigned across offices
            </p>
          </div>

        </CardContent>
      </Card>
    </div>

    <!-- ─── Main Data Table Card ─── -->
    <Card class="border shadow-xs">
      <CardHeader class="pb-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle class="text-lg font-semibold flex items-center gap-2">
              Offices
            </CardTitle>
            <CardDescription class="text-xs">
              Showing {{ filteredOffices.length }} of {{ offices.length }} total offices
            </CardDescription>
          </div>
        </div>

        <!-- ─── Search & Filter Bar ─── -->
        <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <!-- Search input -->
          <div class="sm:col-span-2 relative">
            <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              v-model="searchQuery"
              placeholder="Search by office name or code..."
              class="pl-9 text-xs h-9"
            />
            <button
              v-if="searchQuery"
              class="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
              @click="clearSearch"
            >
              <X class="h-4 w-4" />
            </button>
          </div>

          <!-- Status Filter -->
          <div>
            <select
              v-model="selectedStatusFilter"
              class="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="ALL">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </CardHeader>

      <CardContent class="p-0">
        <!-- ─── Table ─── -->
        <div class="relative overflow-x-auto border-t">
          <Table>
            <TableHeader class="bg-muted/40">
              <TableRow>
                <TableHead class="min-w-52 text-xs font-semibold">Office Name</TableHead>
                <TableHead class="min-w-28 text-xs font-semibold">Office Code</TableHead>
                <TableHead class="min-w-44 text-xs font-semibold">Office Head</TableHead>
                <TableHead class="min-w-36 text-xs font-semibold">
                  Total Beneficiaries
                </TableHead>
                <TableHead class="min-w-28 text-xs font-semibold">Status</TableHead>
                <TableHead class="text-right min-w-36 text-xs font-semibold">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <!-- Loading State -->
              <template v-if="isLoading">
                <TableRow>
                  <TableCell colspan="6" class="h-44 text-center text-muted-foreground">
                    <div class="flex flex-col items-center justify-center gap-2 py-6">
                      <Loader2 class="h-8 w-8 animate-spin text-primary" />
                      <p class="text-xs text-muted-foreground">Loading offices data...</p>
                    </div>
                  </TableCell>
                </TableRow>
              </template>

              <!-- Data Rows -->
              <template v-else-if="paginatedOffices.length > 0">
                <TableRow
                  v-for="office in paginatedOffices"
                  :key="office.id"
                  class="transition-colors hover:bg-muted/30"
                >
                  <!-- 1. Office Name -->
                  <TableCell class="py-3">
                    <div class="flex items-center gap-3">
                      <div class="flex flex-col min-w-0">
                        <span class="font-semibold text-xs sm:text-sm text-foreground truncate">
                          {{ office.name }}
                        </span>
                        <span class="text-[11px] text-muted-foreground truncate">
                          Added {{ formatDateDisplay(office.createdAt) }}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  <!-- 2. Code -->
                  <TableCell class="py-3">
                    <span
                      v-if="office.code"
                      class="inline-flex items-center gap-1 text-xs font-mono font-medium text-foreground bg-muted/70 px-2 py-0.5 rounded border border-border/50"
                    >
                      {{ office.code }}
                    </span>
                    <span v-else class="text-xs text-muted-foreground font-mono">—</span>
                  </TableCell>

                  <!-- 3. Office Head (from public.directories) -->
                  <TableCell class="py-3">
                    <span v-if="office.officeHead" class="text-xs sm:text-sm text-foreground">
                      {{ office.officeHead }}
                    </span>
                    <span v-else class="text-xs text-muted-foreground">
                      {{ office.directoryId ? 'No head listed' : 'Not linked' }}
                    </span>
                  </TableCell>

                  <!-- 4. Total Beneficiaries -->
                  <TableCell class="py-3">
                    <div class="flex items-center gap-1.5">
                      <Badge
                        variant="secondary"
                        class="font-mono text-xs gap-1.5 px-2 py-0.5 h-6 font-semibold"
                      >
                        <Users class="h-3 w-3 text-muted-foreground" />
                        <span>{{ office.totalBeneficiaries }}</span>
                      </Badge>
                      <span class="text-xs text-muted-foreground hidden sm:inline">
                        {{ office.totalBeneficiaries === 1 ? 'beneficiary' : 'beneficiaries' }}
                      </span>
                    </div>
                  </TableCell>

                  <!-- 4. Status -->
                  <TableCell class="py-3">
                    <Badge
                      variant="outline"
                      :class="[
                        getStatusBadgeClass(office.isActive),
                        'text-[11px] font-mono capitalize px-2 py-0.5 h-5 gap-1.5 font-medium',
                      ]"
                    >
                      <span
                        class="h-1.5 w-1.5 rounded-full"
                        :class="office.isActive ? 'bg-emerald-500' : 'bg-rose-500'"
                      />
                      {{ formatStatusLabel(office.isActive) }}
                    </Badge>
                  </TableCell>

                  <!-- 5. Actions (View, Edit, Delete) -->
                  <TableCell class="py-3 text-right">
                    <div class="flex items-center justify-end gap-1">
                      <!-- View Button -->
                      <Button
                        variant="ghost"
                        size="sm"
                        class="h-8 gap-1 text-xs cursor-pointer text-muted-foreground hover:text-foreground"
                        title="View office details"
                        @click="openView(office)"
                      >
                        <Eye class="h-3.5 w-3.5" />
                        <span class="hidden md:inline">View</span>
                      </Button>

                      <!-- Edit Button -->
                      <Button
                        variant="ghost"
                        size="sm"
                        class="h-8 gap-1 text-xs cursor-pointer text-muted-foreground hover:text-foreground"
                        title="Edit office"
                        @click="openEdit(office)"
                      >
                        <Pencil class="h-3.5 w-3.5" />
                        <span class="hidden md:inline">Edit</span>
                      </Button>

                      <!-- Delete Button -->
                      <Button
                        variant="ghost"
                        size="icon"
                        class="h-8 w-8 text-destructive/80 hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                        title="Delete office"
                        @click="openDeleteDialog(office)"
                      >
                        <Trash2 class="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              </template>

              <!-- Empty State -->
              <template v-else>
                <TableRow>
                  <TableCell colspan="6" class="p-8">
                    <Empty class="border-0">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <Building2 class="h-10 w-10 text-muted-foreground/60" />
                        </EmptyMedia>
                        <EmptyTitle class="text-sm font-semibold">No offices found</EmptyTitle>
                        <EmptyDescription class="text-xs text-muted-foreground max-w-sm">
                          {{
                            searchQuery || selectedStatusFilter !== 'ALL'
                              ? 'No offices match your search or filter criteria. Try adjusting or clearing your filters.'
                              : 'There are no offices registered yet. Click below to add your first office.'
                          }}
                        </EmptyDescription>
                      </EmptyHeader>
                      <EmptyContent>
                        <Button
                          v-if="searchQuery || selectedStatusFilter !== 'ALL'"
                          variant="outline"
                          size="sm"
                          class="text-xs cursor-pointer"
                          @click="resetFilters"
                        >
                          Reset Filters
                        </Button>
                        <Button
                          v-else
                          variant="default"
                          size="sm"
                          class="gap-1.5 text-xs cursor-pointer"
                          @click="openCreate"
                        >
                          <Plus class="h-3.5 w-3.5" />
                          <span>Add First Office</span>
                        </Button>
                      </EmptyContent>
                    </Empty>
                  </TableCell>
                </TableRow>
              </template>
            </TableBody>
          </Table>
        </div>

        <!-- ─── Table Pagination Footer ─── -->
        <div
          v-if="filteredOffices.length > 0"
          class="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t bg-muted/20 text-xs text-muted-foreground"
        >
          <div>
            Showing
            <span class="font-medium text-foreground font-mono">
              {{ pageRange.start }}
            </span>
            to
            <span class="font-medium text-foreground font-mono">
              {{ pageRange.end }}
            </span>
            of
            <span class="font-medium text-foreground font-mono">
              {{ filteredOffices.length }}
            </span>
            entries
          </div>

          <div class="flex items-center gap-2">
            <span class="text-xs font-mono">
              Page {{ currentPage }} of {{ totalPages }}
            </span>
            <div class="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                class="h-7 w-7 cursor-pointer"
                :disabled="currentPage <= 1"
                @click="prevPage"
              >
                <ChevronLeft class="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                class="h-7 w-7 cursor-pointer"
                :disabled="currentPage >= totalPages"
                @click="nextPage"
              >
                <ChevronRight class="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
    </div>
    <!-- ─── /Offices Tab ─── -->

    <!-- ─── 1. Add / Edit Office Dialog ─── -->
    <Dialog :open="isAddEditOpen" @update:open="(val: boolean) => (!val ? closeAddEdit() : null)">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2 text-base font-semibold">
            <span>{{ isEditMode ? 'Edit Office' : 'Add New Office' }}</span>
          </DialogTitle>
          <DialogDescription class="text-xs">
            {{
              isEditMode
                ? 'Update the office or link it to the directory.'
                : 'Pick an office from the directory.'
            }}
          </DialogDescription>
        </DialogHeader>

        <form @submit.prevent="handleSubmit" class="space-y-4 py-2">
          <!-- Office from Directory (public.directories) -->
          <div class="space-y-1.5">
            <label class="text-xs font-medium text-foreground">
              Office <span v-if="!isEditMode" class="text-destructive">*</span>
            </label>

            <div class="relative">
              <button
                type="button"
                class="flex w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-left text-xs transition-colors hover:bg-muted/30 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                :class="formErrors.directoryId ? 'border-destructive' : 'border-input'"
                :disabled="isLoadingDirectories"
                :aria-expanded="isDirectoryPickerOpen"
                @click="isDirectoryPickerOpen = !isDirectoryPickerOpen"
              >
                <span v-if="selectedDirectory" class="min-w-0 truncate font-medium text-foreground">
                  {{ selectedDirectory.officeName }}
                </span>
                <span v-else class="text-muted-foreground">
                  {{ isLoadingDirectories ? 'Loading directory...' : 'Select an office from the directory' }}
                </span>
                <Loader2 v-if="isLoadingDirectories" class="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                <ChevronDown v-else class="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>

              <div
                v-if="isDirectoryPickerOpen"
                class="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg animate-in fade-in zoom-in-95"
              >
                <div class="border-b bg-muted/20 p-2">
                  <div class="relative">
                    <Search class="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      v-model="directorySearch"
                      placeholder="Search office, code or head..."
                      class="h-8 bg-background pl-8 text-base md:text-xs"
                      auto-focus
                    />
                  </div>
                </div>

                <div class="max-h-60 divide-y divide-border/40 overflow-y-auto">
                  <button
                    v-for="directory in filteredDirectories"
                    :key="directory.id"
                    type="button"
                    class="flex w-full items-start justify-between gap-2 p-2.5 text-left text-xs transition-colors"
                    :class="isDirectoryTaken(directory) ? 'cursor-not-allowed opacity-50' : 'hover:bg-muted/50 cursor-pointer'"
                    :disabled="isDirectoryTaken(directory)"
                    @click="selectDirectory(directory)"
                  >
                    <div class="min-w-0">
                      <div class="truncate font-medium text-foreground">
                        {{ directory.officeName }}
                        <span v-if="directory.officeCode" class="font-mono text-muted-foreground">· {{ directory.officeCode }}</span>
                      </div>
                      <div class="truncate text-[11px] text-muted-foreground">
                        {{ isDirectoryTaken(directory) ? 'Already added' : directory.officeHead || 'No head listed' }}
                      </div>
                    </div>
                    <Check v-if="formData.directoryId === directory.id" class="h-4 w-4 shrink-0 text-primary" />
                  </button>
                  <div v-if="filteredDirectories.length === 0" class="p-3 text-center text-xs text-muted-foreground">
                    No matching offices in the directory.
                  </div>
                </div>
              </div>
            </div>

            <p v-if="formErrors.directoryId" class="text-[11px] text-destructive">
              {{ formErrors.directoryId }}
            </p>
            <p v-if="directoryLoadError" class="text-[11px] text-destructive">
              {{ directoryLoadError }}
              <button type="button" class="font-medium underline cursor-pointer" @click="loadDirectories">Retry</button>
            </p>
          </div>

          <!-- Selected office details, chief included -->
          <div v-if="selectedDirectory" class="grid grid-cols-1 gap-3 rounded-lg border bg-muted/20 p-3.5 sm:grid-cols-2">
            <div class="sm:col-span-2">
              <span class="text-[11px] text-muted-foreground">Office Head</span>
              <p class="text-sm font-semibold text-foreground">
                {{ selectedDirectory.officeHead || 'No head listed in the directory' }}
              </p>
            </div>
            <div>
              <span class="text-[11px] text-muted-foreground">Office Name</span>
              <p class="text-xs font-medium text-foreground">{{ formData.name }}</p>
            </div>
            <div>
              <span class="text-[11px] text-muted-foreground">Office Code</span>
              <p class="font-mono text-xs font-medium text-foreground">{{ formData.code || '—' }}</p>
            </div>
          </div>

          <!-- Older offices not linked to the directory keep their own name and code -->
          <template v-else-if="isEditMode">
            <div class="space-y-1.5">
              <label class="text-xs font-medium text-foreground">
                Office Name <span class="text-destructive">*</span>
              </label>
              <Input
                v-model="formData.name"
                class="text-xs h-9"
                :class="formErrors.name ? 'border-destructive focus-visible:ring-destructive' : ''"
                required
              />
              <p v-if="formErrors.name" class="text-[11px] text-destructive">
                {{ formErrors.name }}
              </p>
            </div>

            <div class="space-y-1.5">
              <label class="text-xs font-medium text-foreground">Office Code</label>
              <Input
                v-model="formData.code"
                class="text-xs h-9 font-mono uppercase"
                :class="formErrors.code ? 'border-destructive focus-visible:ring-destructive' : ''"
              />
              <p v-if="formErrors.code" class="text-[11px] text-destructive">
                {{ formErrors.code }}
              </p>
            </div>
          </template>

          <!-- Status -->
          <div class="flex items-center justify-between rounded-lg border p-3 shadow-xs bg-muted/10">
            <div class="space-y-0.5">
              <label class="text-xs font-medium text-foreground cursor-pointer" for="office-active-toggle">
                Active Status
              </label>
              <p class="text-[11px] text-muted-foreground">
                Active offices can be assigned to beneficiaries and staff.
              </p>
            </div>
            <input
              id="office-active-toggle"
              type="checkbox"
              v-model="formData.isActive"
              class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
            />
          </div>

          <DialogFooter class="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              class="text-xs cursor-pointer"
              :disabled="isSubmitting"
              @click="closeAddEdit"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              size="sm"
              class="gap-1.5 text-xs cursor-pointer"
              :disabled="isSubmitting"
            >
              <Loader2 v-if="isSubmitting" class="h-3.5 w-3.5 animate-spin" />
              <span>{{ isEditMode ? 'Save Changes' : 'Create Office' }}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- ─── 3. Delete Office Confirmation Dialog ─── -->
    <Dialog
      :open="isDeleteDialogOpen"
      @update:open="(val: boolean) => (!val ? closeDeleteDialog() : null)"
    >
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <div class="flex items-center gap-2 text-destructive">
            <DialogTitle class="text-base font-semibold">Delete Office</DialogTitle>
          </div>
          <DialogDescription class="text-xs pt-2">
            Are you sure you want to delete
            <span class="font-bold text-foreground">"{{ officeToDelete?.name }}"</span>?
            This action is irreversible.
          </DialogDescription>
        </DialogHeader>

        <div
          v-if="officeToDelete && officeToDelete.totalBeneficiaries > 0"
          class="p-3 rounded-lg bg-amber-500/10 text-amber-800 dark:text-amber-400 border border-amber-500/20 text-xs space-y-1"
        >
          <p class="font-semibold flex items-center gap-1.5">
            <AlertTriangle class="h-3.5 w-3.5 shrink-0" />
            Warning: Beneficiaries Assigned
          </p>
          <p class="text-[11px]">
            This office has {{ officeToDelete.totalBeneficiaries }} beneficiary(ies) assigned.
            Please reassign them to another office before deleting.
          </p>
        </div>

        <DialogFooter class="gap-2 pt-2">
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
            :disabled="isDeleting"
            @click="confirmDelete"
          >
            <Loader2 v-if="isDeleting" class="h-3.5 w-3.5 animate-spin" />
            <span>Delete Office</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
