<script setup lang="ts">
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
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
  pageSize,
  totalPages,
  isAddEditOpen,
  isEditMode,
  isSubmitting,
  formErrors,
  formData,
  isViewOpen,
  selectedOffice,
  isDeleteDialogOpen,
  officeToDelete,
  isDeleting,
  feedbackMessage,
  dismissFeedback,
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
  closeView,
  openDeleteDialog,
  closeDeleteDialog,
  confirmDelete,
  exportCsv,
  refreshOffices,
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
          Manage partner offices, departmental codes, and beneficiary assignments.
        </p>
      </div>

      <!-- Quick Action Buttons -->
      <div class="flex items-center gap-2 self-start sm:self-auto flex-wrap">
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

    <!-- ─── Toast / Notification Alert Banner ─── -->
    <div
      v-if="feedbackMessage"
      class="flex items-center justify-between gap-3 p-3.5 rounded-lg text-xs border transition-all animate-in fade-in"
      :class="
        feedbackMessage.type === 'success'
          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
          : 'bg-destructive/10 text-destructive border-destructive/20'
      "
    >
      <div class="flex items-center gap-2">
        <CheckCircle2
          v-if="feedbackMessage.type === 'success'"
          class="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
        />
        <AlertTriangle v-else class="h-4 w-4 shrink-0" />
        <span class="font-medium">{{ feedbackMessage.text }}</span>
      </div>
      <button
        @click="dismissFeedback"
        class="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
      >
        <X class="h-3.5 w-3.5" />
      </button>
    </div>

    <!-- ─── Metric Cards Grid ─── -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
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
              Offices Directory
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
                  <TableCell colspan="5" class="h-44 text-center text-muted-foreground">
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

                  <!-- 3. Total Beneficiaries -->
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
                  <TableCell colspan="5" class="p-8">
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
              {{ (currentPage - 1) * pageSize + 1 }}
            </span>
            to
            <span class="font-medium text-foreground font-mono">
              {{ Math.min(currentPage * pageSize, filteredOffices.length) }}
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
                ? 'Update office details and departmental code.'
                : 'Register a new office location for beneficiary assignment.'
            }}
          </DialogDescription>
        </DialogHeader>

        <form @submit.prevent="handleSubmit" class="space-y-4 py-2">
          <!-- Office Name -->
          <div class="space-y-1.5">
            <label class="text-xs font-medium text-foreground">
              Office Name <span class="text-destructive">*</span>
            </label>
            <Input
              v-model="formData.name"
              placeholder="e.g. PESO Main Office, DOLE Provincial Field Office"
              class="text-xs h-9"
              :class="formErrors.name ? 'border-destructive focus-visible:ring-destructive' : ''"
              required
            />
            <p v-if="formErrors.name" class="text-[11px] text-destructive">
              {{ formErrors.name }}
            </p>
          </div>

          <!-- Code -->
          <div class="space-y-1.5">
            <label class="text-xs font-medium text-foreground">
              Office Code
            </label>
            <Input
              v-model="formData.code"
              placeholder="e.g. PESO-HQ, DOLE-01"
              class="text-xs h-9 font-mono uppercase"
              :class="formErrors.code ? 'border-destructive focus-visible:ring-destructive' : ''"
            />
            <p v-if="formErrors.code" class="text-[11px] text-destructive">
              {{ formErrors.code }}
            </p>
            <p class="text-[11px] text-muted-foreground">
              Optional shorthand code for identification in reports.
            </p>
          </div>

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

    <!-- ─── 2. View Office Details Dialog ─── -->
    <Dialog :open="isViewOpen" @update:open="(val: boolean) => (!val ? closeView() : null)">
      <DialogContent class="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2 text-base font-semibold">
            <span>Office Details</span>
          </DialogTitle>
          <DialogDescription class="text-xs">
            Detailed information and assigned personnel summary.
          </DialogDescription>
        </DialogHeader>

        <div v-if="selectedOffice" class="space-y-5 py-2">
          <!-- Overview Banner -->
          <div class="flex items-start justify-between p-3.5 rounded-lg border bg-muted/20">
            <div class="space-y-1 min-w-0">
              <h3 class="text-sm font-semibold text-foreground truncate">
                {{ selectedOffice.name }}
              </h3>
              <div class="flex items-center gap-2 flex-wrap text-xs font-mono text-muted-foreground">
                <span v-if="selectedOffice.code" class="bg-muted px-2 py-0.5 rounded font-semibold text-foreground">
                  {{ selectedOffice.code }}
                </span>
                <span>ID: {{ selectedOffice.id.slice(0, 8) }}...</span>
              </div>
            </div>
            <Badge
              variant="outline"
              :class="[
                getStatusBadgeClass(selectedOffice.isActive),
                'text-[11px] font-mono capitalize px-2 py-0.5 h-5 font-medium',
              ]"
            >
              {{ formatStatusLabel(selectedOffice.isActive) }}
            </Badge>
          </div>

          <!-- Metadata Grid -->
          <div class="grid grid-cols-2 gap-3 text-xs">
            <div class="p-3 rounded-md border bg-card/40 space-y-1">
              <p class="text-muted-foreground text-[11px]">Total Beneficiaries</p>
              <p class="font-semibold text-foreground font-mono text-base">
                {{ selectedOffice.totalBeneficiaries }}
              </p>
            </div>
            <div class="p-3 rounded-md border bg-card/40 space-y-1">
              <p class="text-muted-foreground text-[11px]">Created Date</p>
              <p class="font-semibold text-foreground font-mono">
                {{ formatDateDisplay(selectedOffice.createdAt) }}
              </p>
            </div>
          </div>

          <!-- Beneficiaries List Section -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <h4 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Assigned Beneficiaries ({{ selectedOffice.beneficiaries?.length || 0 }})
              </h4>
            </div>

            <div
              v-if="selectedOffice.beneficiaries && selectedOffice.beneficiaries.length > 0"
              class="max-h-52 overflow-y-auto rounded-md border divide-y text-xs"
            >
              <div
                v-for="b in selectedOffice.beneficiaries"
                :key="b.id"
                class="p-2.5 flex items-center justify-between hover:bg-muted/20"
              >
                <div class="space-y-0.5 min-w-0">
                  <p class="font-medium text-foreground truncate">{{ b.fullName }}</p>
                  <p class="text-[11px] text-muted-foreground font-mono uppercase">
                    {{ b.position }}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  class="text-[10px] uppercase font-mono px-1.5 py-0 h-4"
                  :class="
                    b.status === 'active'
                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                      : 'bg-muted text-muted-foreground border-transparent'
                  "
                >
                  {{ b.status }}
                </Badge>
              </div>
            </div>
            <div
              v-else
              class="p-4 rounded-md border border-dashed text-center text-xs text-muted-foreground"
            >
              No beneficiaries currently assigned to this office.
            </div>
          </div>
        </div>

        <DialogFooter class="gap-2">
          <Button
            variant="outline"
            size="sm"
            class="text-xs cursor-pointer"
            @click="closeView"
          >
            Close
          </Button>
          <Button
            variant="default"
            size="sm"
            class="gap-1.5 text-xs cursor-pointer"
            @click="
              () => {
                if (selectedOffice) {
                  const o = selectedOffice
                  closeView()
                  openEdit(o)
                }
              }
            "
          >
            <span>Edit Office</span>
          </Button>
        </DialogFooter>
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
