<script setup lang="ts">
import {
  Building2,
  CheckCircle2,
  Download,
  Eye,
  Filter,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  Trash2,
  Users,
  UserX,
  X,
} from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
  TableEmpty,
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
import { useUserManagement } from '@/composables/peso/useUserManagement'
import { getInitials, getPositionBadgeClass } from '@/helpers/peso/attendanceHelper'
import {
  formatDateDisplay,
  formatStatusLabel,
  getStatusBadgeClass,
} from '@/helpers/peso/userManagementHelper'
import SearchSelect from '@/components/common/SearchSelect.vue'
import PasswordInput from '@/components/common/PasswordInput.vue'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

const {
  profiles,
  filteredProfiles,
  paginatedProfiles,
  availablePositions,
  totalPages,
  statsSummary,
  isLoading,
  searchQuery,
  selectedPositionFilter,
  selectedStatusFilter,
  currentPage,
  selectedProfile,
  isDetailsOpen,
  isAddUserOpen,
  isSubmitting,
  submitError,
  submitSuccess,
  formData,
  isAddEmailEdited,
  activeOffices,
  isOfficesLoading,
  profileToDelete,
  isDeleteDialogOpen,
  isDeleting,
  openDeleteDialog,
  closeDeleteDialog,
  confirmDelete,
  refreshProfiles,
  resetFilters,
  clearSearch,
  setPage,
  prevPage,
  nextPage,
  openDetails,
  closeDetails,
  openAddUser,
  isAddSupervisorOpen,
  openAddSupervisor,
  supervisor,
  closeAddUser,
  handleAddUser,
  isEditUserOpen,
  editingProfile,
  isSavingEdit,
  editError,
  editForm,
  isEditingSelf,
  openEditUser,
  onEditPositionChange,
  closeEditUser,
  handleEditUser,
  exportCsv,
  pageRange,
  visiblePages,
  hasHiddenPages,
  positionOptions,
  addPositionOptions,
  roleOptions,
  fundingOptions,
  addFundingOptions,
  showEditFunding,
  statusOptions,
  addOfficeSelectOptions,
  editOfficeSelectOptions,
  editFromDetails,
} = useUserManagement()

</script>

<template>
  <div class="flex flex-col gap-6 pb-12">
    <!-- ─── Header & Title ─── -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="space-y-1">
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
          User Management
        </h1>
        <p class="text-sm text-muted-foreground">
          Manage user profiles and accounts in the system.
        </p>
      </div>

      <!-- Quick Action Buttons -->
      <div class="flex items-center gap-2 self-start sm:self-auto flex-wrap">
        <Button
          variant="default"
          size="sm"
          class="gap-1.5 text-xs cursor-pointer shadow-xs"
          @click="openAddUser"
        >
          <Plus class="h-3.5 w-3.5" />
          <span>Add User</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          class="gap-1.5 text-xs cursor-pointer shadow-xs"
          @click="openAddSupervisor"
        >
          <span>Add Supervisor</span>
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
          @click="refreshProfiles"
        >
          <RefreshCw :class="['h-3.5 w-3.5', isLoading && 'animate-spin']" />
          <span>Refresh</span>
        </Button>
      </div>
    </div>

    <!-- ─── Metric Cards Grid ─── -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <!-- 1. Total Users -->
      <Card
        class="border shadow-xs bg-card/60 backdrop-blur-xs hover:border-primary/40 transition-all cursor-pointer"
        :class="selectedPositionFilter === 'ALL' && selectedStatusFilter === 'ALL' ? 'border-primary ring-2 ring-primary/20 shadow-sm' : ''"
        @click="resetFilters"
      >
        <CardContent class="p-4 flex items-center justify-between">
          <div class="space-y-0.5 min-w-0">
            <p class="text-xs font-medium text-muted-foreground truncate">Total Users</p>
            <p class="text-2xl font-bold tracking-tight font-mono text-foreground">
              {{ statsSummary.total.toLocaleString() }}
            </p>
            <p class="text-[11px] text-muted-foreground truncate">
              All registered profiles
            </p>
          </div>
        </CardContent>
      </Card>

      <!-- 2. Active Users -->
      <Card
        class="border shadow-xs bg-card/60 backdrop-blur-xs hover:border-emerald-500/40 transition-all cursor-pointer"
        :class="selectedStatusFilter === 'active' ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm' : ''"
        @click="selectedStatusFilter = selectedStatusFilter === 'active' ? 'ALL' : 'active'"
      >
        <CardContent class="p-4 flex items-center justify-between">
          <div class="space-y-0.5 min-w-0">
            <p class="text-xs font-medium text-muted-foreground truncate">Active</p>
            <p class="text-2xl font-bold tracking-tight font-mono text-emerald-600 dark:text-emerald-400">
              {{ statsSummary.activeCount.toLocaleString() }}
            </p>
            <p class="text-[11px] text-muted-foreground truncate">
              Currently active
            </p>
          </div>
        </CardContent>
      </Card>

      <!-- 3. Pending Users -->
      <Card
        class="border shadow-xs bg-card/60 backdrop-blur-xs hover:border-amber-500/40 transition-all cursor-pointer"
        :class="selectedStatusFilter === 'pending' ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-sm' : ''"
        @click="selectedStatusFilter = selectedStatusFilter === 'pending' ? 'ALL' : 'pending'"
      >
        <CardContent class="p-4 flex items-center justify-between">
          <div class="space-y-0.5 min-w-0">
            <p class="text-xs font-medium text-muted-foreground truncate">Pending</p>
            <p class="text-2xl font-bold tracking-tight font-mono text-amber-600 dark:text-amber-400">
              {{ statsSummary.pendingCount.toLocaleString() }}
            </p>
            <p class="text-[11px] text-muted-foreground truncate">
              Awaiting activation
            </p>
          </div>
        </CardContent>
      </Card>

      <!-- 4. Inactive Users -->
      <Card
        class="border shadow-xs bg-card/60 backdrop-blur-xs hover:border-rose-500/40 transition-all cursor-pointer"
        :class="selectedStatusFilter === 'inactive' ? 'border-rose-500 ring-2 ring-rose-500/20 shadow-sm' : ''"
        @click="selectedStatusFilter = selectedStatusFilter === 'inactive' ? 'ALL' : 'inactive'"
      >
        <CardContent class="p-4 flex items-center justify-between">
          <div class="space-y-0.5 min-w-0">
            <p class="text-xs font-medium text-muted-foreground truncate">Inactive</p>
            <p class="text-2xl font-bold tracking-tight font-mono text-rose-600 dark:text-rose-400">
              {{ statsSummary.inactiveCount.toLocaleString() }}
            </p>
            <p class="text-[11px] text-muted-foreground truncate">
              Deactivated accounts
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
              User Profiles
            </CardTitle>
            <CardDescription class="text-xs">
              Showing {{ filteredProfiles.length }} of {{ profiles.length }} total profiles
            </CardDescription>
          </div>
        </div>

        <!-- ─── Search & Filter Bar ─── -->
        <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <!-- Search input -->
          <div class="sm:col-span-2 relative">
            <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              v-model="searchQuery"
              placeholder="Search by name, position, or passcode..."
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

          <!-- Position Filter -->
          <div>
            <select
              v-model="selectedPositionFilter"
              class="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="ALL">All Positions</option>
              <option v-for="pos in availablePositions" :key="pos" :value="pos">
                {{ pos }}
              </option>
            </select>
          </div>

          <!-- Status Filter -->
          <div>
            <select
              v-model="selectedStatusFilter"
              class="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="ALL">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
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
                <TableHead class="min-w-44 text-xs font-semibold">User</TableHead>
                <TableHead class="min-w-24 text-xs font-semibold">Office</TableHead>
                <TableHead class="min-w-24 text-xs font-semibold">Status</TableHead>
                <TableHead class="min-w-24 text-xs font-semibold">Passcode</TableHead>
                <TableHead class="min-w-28 text-xs font-semibold">Created At</TableHead>
                <TableHead class="text-right min-w-28 text-xs font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <!-- Loading State -->
              <template v-if="isLoading">
                <TableRow>
                  <TableCell colspan="6" class="h-44 text-center text-muted-foreground">
                    <div class="flex flex-col items-center justify-center gap-2 py-6">
                      <Loader2 class="h-8 w-8 animate-spin text-primary" />
                      <p class="text-xs text-muted-foreground">Loading profiles from public.profiles...</p>
                    </div>
                  </TableCell>
                </TableRow>
              </template>

              <!-- Data Rows -->
              <template v-else-if="paginatedProfiles.length > 0">
                <TableRow
                  v-for="profile in paginatedProfiles"
                  :key="profile.id"
                  class="transition-colors hover:bg-muted/30"
                >
                  <!-- 1. User (Avatar + Name + Position Badge) -->
                  <TableCell class="py-3">
                    <div class="flex items-center gap-2.5">
                      <Avatar class="h-8 w-8 text-xs shrink-0 font-medium">
                        <AvatarFallback class="bg-primary/10 text-primary">
                          {{ getInitials(profile.fullName) }}
                        </AvatarFallback>
                      </Avatar>
                      <div class="flex flex-col min-w-0">
                        <span class="font-semibold text-xs sm:text-sm text-foreground truncate">
                          {{ profile.fullName }}
                        </span>
                        <div class="flex items-center gap-1.5 mt-0.5">
                          <Badge
                            variant="outline"
                            :class="[getPositionBadgeClass(profile.position), 'text-[10px] uppercase font-mono px-1.5 py-0 h-4']"
                          >
                            {{ profile.position || 'Employee' }}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  <!-- 2. Office -->
                  <TableCell class="py-3">
                    <div v-if="profile.officeName" class="flex items-center gap-1.5">
                      <Building2 class="h-3 w-3 text-muted-foreground shrink-0" />
                      <span class="text-xs text-foreground truncate max-w-32">
                        {{ profile.officeName }}
                      </span>
                      <span v-if="profile.officeCode" class="text-[10px] font-mono text-muted-foreground">
                        ({{ profile.officeCode }})
                      </span>
                    </div>
                    <span v-else class="text-xs text-muted-foreground">—</span>
                  </TableCell>

                  <!-- 3. Status -->
                  <TableCell class="py-3">
                    <Badge
                      variant="outline"
                      :class="[getStatusBadgeClass(profile.status), 'text-[10px] font-mono capitalize px-1.5 py-0 h-4']"
                    >
                      {{ formatStatusLabel(profile.status) }}
                    </Badge>
                  </TableCell>

                  <!-- 3. Passcode -->
                  <TableCell class="py-3">
                    <span v-if="profile.passcode" class="text-xs font-mono font-medium text-foreground bg-muted/60 px-2 py-0.5 rounded">
                      {{ profile.passcode }}
                    </span>
                    <span v-else class="text-xs text-muted-foreground" title="Admins and supervisors don't use the kiosk">None</span>
                  </TableCell>

                  <!-- 4. Created At -->
                  <TableCell class="py-3">
                    <span class="text-xs font-mono text-muted-foreground">
                      {{ formatDateDisplay(profile.createdAt) }}
                    </span>
                  </TableCell>

                  <!-- 5. Actions / Details & Delete -->
                  <TableCell class="py-3 text-right">
                    <div class="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        class="h-8 gap-1.5 text-xs cursor-pointer"
                        @click="openDetails(profile)"
                      >
                        <Eye class="h-3.5 w-3.5" />
                        <span class="hidden sm:inline">Details</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        class="h-8 gap-1.5 text-xs cursor-pointer"
                        :title="`Edit ${profile.fullName}`"
                        :aria-label="`Edit ${profile.fullName}`"
                        @click="openEditUser(profile)"
                      >
                        <Pencil class="h-3.5 w-3.5" />
                        <span class="hidden sm:inline">Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        class="h-8 w-8 text-destructive/80 hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                        title="Delete user profile"
                        @click="openDeleteDialog(profile)"
                      >
                        <Trash2 class="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              </template>

              <!-- Empty State -->
              <TableEmpty v-else :colspan="6">
                <Empty class="border-0 p-6 md:p-8">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <UserX v-if="profiles.length === 0" class="size-5 text-muted-foreground" />
                      <Filter v-else class="size-5 text-muted-foreground" />
                    </EmptyMedia>
                    <EmptyTitle>
                      {{ profiles.length === 0 ? 'No profiles found' : 'No matching profiles' }}
                    </EmptyTitle>
                    <EmptyDescription>
                      {{ profiles.length === 0
                        ? 'No user profiles have been created yet.'
                        : 'No profiles match your current search or filter criteria.'
                      }}
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button
                      v-if="profiles.length > 0"
                      size="sm"
                      variant="outline"
                      class="text-xs cursor-pointer"
                      @click="resetFilters"
                    >
                      Clear Filters
                    </Button>
                    <Button
                      v-else
                      size="sm"
                      variant="default"
                      class="gap-1.5 text-xs cursor-pointer"
                      @click="openAddUser"
                    >
                      <Plus class="h-3.5 w-3.5" />
                      <span>Add First User</span>
                    </Button>
                  </EmptyContent>
                </Empty>
              </TableEmpty>
            </TableBody>
          </Table>
        </div>

        <!-- ─── Pagination Footer ─── -->
        <div v-if="filteredProfiles.length > 0" class="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t text-xs text-muted-foreground">
          <div>
            Showing <span class="font-medium text-foreground">{{ pageRange.start }}</span>
            to <span class="font-medium text-foreground">{{ pageRange.end }}</span>
            of <span class="font-medium text-foreground">{{ filteredProfiles.length }}</span> profiles
          </div>

          <div class="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              class="h-8 text-xs px-2.5 cursor-pointer"
              :disabled="currentPage <= 1"
              @click="prevPage"
            >
              Previous
            </Button>
            <div class="flex items-center gap-1">
              <Button
                v-for="p in visiblePages"
                :key="p"
                size="sm"
                :variant="currentPage === p ? 'default' : 'outline'"
                class="h-8 w-8 p-0 text-xs cursor-pointer"
                @click="setPage(p)"
              >
                {{ p }}
              </Button>
              <span v-if="hasHiddenPages" class="text-xs px-1">...</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              class="h-8 text-xs px-2.5 cursor-pointer"
              :disabled="currentPage >= totalPages"
              @click="nextPage"
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- ─── Profile Details Modal ─── -->
    <Dialog :open="isDetailsOpen" @update:open="(val: boolean) => { if (!val) closeDetails() }">
      <DialogContent class="max-w-[95vw] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2 text-base sm:text-lg">
            <Shield class="h-4 w-4 text-primary" />
            Profile Details
          </DialogTitle>
          <DialogDescription class="text-xs">
            Detailed view of user profile.
          </DialogDescription>
        </DialogHeader>

        <div v-if="selectedProfile" class="space-y-4 py-2 text-xs">
          <!-- Personnel Card -->
          <div class="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
            <Avatar class="h-10 w-10 text-sm font-semibold">
              <AvatarFallback class="bg-primary/10 text-primary">
                {{ getInitials(selectedProfile.fullName) }}
              </AvatarFallback>
            </Avatar>
            <div class="min-w-0 space-y-0.5">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-semibold text-sm text-foreground">
                  {{ selectedProfile.fullName }}
                </span>
                <Badge
                  variant="outline"
                  :class="getPositionBadgeClass(selectedProfile.position)"
                  class="text-[10px] uppercase font-mono"
                >
                  {{ selectedProfile.position || 'Employee' }}
                </Badge>
                <Badge
                  variant="outline"
                  :class="getStatusBadgeClass(selectedProfile.status)"
                  class="text-[10px] capitalize font-mono"
                >
                  {{ formatStatusLabel(selectedProfile.status) }}
                </Badge>
              </div>
            </div>
          </div>

          <!-- Profile Info Grid -->
          <div class="p-3 rounded-lg border bg-card space-y-2">
            <p class="font-semibold text-xs text-foreground flex items-center gap-1.5">
              <Users class="h-3.5 w-3.5 text-primary" />
              <span>Profile Information</span>
            </p>
            <div class="grid grid-cols-2 gap-3 pt-1">
              <div>
                <p class="text-[11px] text-muted-foreground">First Name</p>
                <p class="font-medium font-mono text-foreground mt-0.5">
                  {{ selectedProfile.firstname }}
                </p>
              </div>
              <div>
                <p class="text-[11px] text-muted-foreground">Last Name</p>
                <p class="font-medium font-mono text-foreground mt-0.5">
                  {{ selectedProfile.lastname }}
                </p>
              </div>
              <div>
                <p class="text-[11px] text-muted-foreground">Middle Name</p>
                <p class="font-medium font-mono text-foreground mt-0.5">
                  {{ selectedProfile.middlename || '—' }}
                </p>
              </div>
              <div>
                <p class="text-[11px] text-muted-foreground">Passcode</p>
                <p class="font-medium font-mono text-foreground mt-0.5">
                  <span v-if="selectedProfile.passcode" class="bg-muted/60 px-2 py-0.5 rounded">{{ selectedProfile.passcode }}</span>
                  <span v-else class="font-sans text-xs font-normal text-muted-foreground">None (doesn't use the kiosk)</span>
                </p>
              <div>
                <p class="text-[11px] text-muted-foreground">Assigned Office</p>
                <p class="font-medium font-mono text-foreground mt-0.5">
                  <span v-if="selectedProfile.officeName" class="flex items-center gap-1.5">
                    <Building2 class="h-3 w-3 text-muted-foreground shrink-0" />
                    {{ selectedProfile.officeName }}
                    <span v-if="selectedProfile.officeCode" class="text-[10px] text-muted-foreground">({{ selectedProfile.officeCode }})</span>
                  </span>
                  <span v-else>—</span>
                </p>
              </div>
              <div v-if="selectedProfile.position === 'gip' || selectedProfile.position === 'tupad'">
                <p class="text-[11px] text-muted-foreground">Funding</p>
                <p class="font-medium font-mono text-foreground mt-0.5">{{ selectedProfile.funding || 'Not set' }}</p>
              </div>
              </div>
            </div>
          </div>

          <!-- Metadata -->
          <div class="p-3 rounded-lg border bg-muted/20 space-y-1.5 text-muted-foreground text-[11px] font-mono">
            <div class="flex justify-between">
              <span>Profile ID:</span>
              <span class="text-foreground truncate max-w-64">{{ selectedProfile.id }}</span>
            </div>
            <div class="flex justify-between">
              <span>Created At:</span>
              <span class="text-foreground">{{ formatDateDisplay(selectedProfile.createdAt) }}</span>
            </div>
            <div class="flex justify-between">
              <span>Updated At:</span>
              <span class="text-foreground">{{ formatDateDisplay(selectedProfile.updatedAt) }}</span>
            </div>
          </div>
        </div>

        <DialogFooter class="gap-2">
          <Button variant="outline" size="sm" class="text-xs cursor-pointer" @click="closeDetails">
            Close
          </Button>
          <Button
            size="sm"
            class="gap-1.5 text-xs cursor-pointer"
            @click="editFromDetails"
          >
            <Pencil class="h-3.5 w-3.5" />
            <span>Edit User</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- ─── Edit User Sheet ─── -->
    <Sheet :open="isEditUserOpen" @update:open="(val: boolean) => { if (!val) closeEditUser() }">
      <SheetContent class="flex h-full flex-col p-0 sm:max-w-lg">
        <SheetHeader class="shrink-0 px-6 pt-6 pb-2">
          <SheetTitle>Edit User</SheetTitle>
          <SheetDescription class="text-xs">
            {{ editingProfile?.fullName }}<template v-if="isEditingSelf"> · your account</template>
          </SheetDescription>
        </SheetHeader>

        <form class="contents" @submit.prevent="handleEditUser">
          <div class="grid flex-1 grid-cols-1 content-start gap-5 overflow-y-auto px-6 py-4">
            <!-- Name -->
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div class="space-y-1.5">
                <label for="edit-firstname" class="text-xs font-medium text-foreground">
                  First Name <span class="text-destructive">*</span>
                </label>
                <Input id="edit-firstname" v-model="editForm.firstname" class="h-9 text-base md:text-xs" :disabled="isSavingEdit" />
              </div>
              <div class="space-y-1.5">
                <label for="edit-lastname" class="text-xs font-medium text-foreground">
                  Last Name <span class="text-destructive">*</span>
                </label>
                <Input id="edit-lastname" v-model="editForm.lastname" class="h-9 text-base md:text-xs" :disabled="isSavingEdit" />
              </div>
            </div>

            <div class="space-y-1.5">
              <label for="edit-middlename" class="text-xs font-medium text-foreground">Middle Name</label>
              <Input id="edit-middlename" v-model="editForm.middlename" class="h-9 text-base md:text-xs" :disabled="isSavingEdit" />
            </div>

            <!-- Position & Role -->
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div class="space-y-1.5">
                <label for="edit-position" class="text-xs font-medium text-foreground">
                  Position <span class="text-destructive">*</span>
                </label>
                <SearchSelect
                  id="edit-position"
                  v-model="editForm.position"
                  :options="positionOptions"
                  :searchable="false"
                  :disabled="isSavingEdit"
                  @change="onEditPositionChange"
                />
              </div>
              <div class="space-y-1.5">
                <label for="edit-role" class="text-xs font-medium text-foreground">Role</label>
                <SearchSelect
                  id="edit-role"
                  v-model="editForm.role"
                  :options="roleOptions"
                  :searchable="false"
                  :disabled="isSavingEdit || isEditingSelf"
                />
              </div>
            </div>
            <p class="-mt-3 text-[11px] text-muted-foreground">
              {{ isEditingSelf ? "You can't change your own role or status." : 'Role sets what the user can open.' }}
            </p>

            <!-- Office & Status -->
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div class="space-y-1.5">
                <label for="edit-office" class="text-xs font-medium text-foreground">Assigned Office</label>
                <SearchSelect
                  id="edit-office"
                  v-model="editForm.officeId"
                  :options="editOfficeSelectOptions"
                  placeholder="Select an office"
                  search-placeholder="Search office, code or head..."
                  empty-text="No matching offices."
                  :disabled="isSavingEdit"
                />
              </div>
              <div class="space-y-1.5">
                <label for="edit-status" class="text-xs font-medium text-foreground">Status</label>
                <SearchSelect
                  id="edit-status"
                  v-model="editForm.status"
                  :options="statusOptions"
                  :searchable="false"
                  :disabled="isSavingEdit || isEditingSelf"
                />
              </div>
            </div>

            <!-- Funding (GIP / TUPAD only) -->
            <div v-if="showEditFunding" class="space-y-1.5">
              <label for="edit-funding" class="text-xs font-medium text-foreground">Funding</label>
              <SearchSelect
                id="edit-funding"
                v-model="editForm.funding"
                :options="fundingOptions"
                :searchable="false"
                :disabled="isSavingEdit"
              />
              <p class="text-[11px] text-muted-foreground">Sets the accomplishment report form (DOLE or PGAS).</p>
            </div>

            <div v-if="editError" class="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
              <ShieldAlert class="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <p class="text-xs text-destructive">{{ editError }}</p>
            </div>
          </div>

          <div class="flex shrink-0 justify-end gap-3 border-t border-border px-6 py-4">
            <Button type="button" variant="outline" size="sm" class="text-xs cursor-pointer" :disabled="isSavingEdit" @click="closeEditUser">
              Cancel
            </Button>
            <Button type="submit" size="sm" class="gap-1.5 text-xs cursor-pointer" :disabled="isSavingEdit">
              <Loader2 v-if="isSavingEdit" class="h-3.5 w-3.5 animate-spin" />
              <span>{{ isSavingEdit ? 'Saving...' : 'Save Changes' }}</span>
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>

    <!-- ─── Add Supervisor: the office's chief becomes its supervisor (useAddSupervisor via useUserManagement) ─── -->
    <Dialog :open="isAddSupervisorOpen" @update:open="(val: boolean) => (!val ? supervisor.close() : null)">
      <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle class="text-base sm:text-lg">Add Supervisor</DialogTitle>
          <DialogDescription class="text-xs">Pick an office; its chief becomes the supervisor.</DialogDescription>
        </DialogHeader>

        <form class="space-y-4 py-2" novalidate @submit.prevent="supervisor.submit">
          <!-- Office (its chief fills the name) -->
          <div class="space-y-1.5">
            <Label for="supervisor-office">Office <span class="text-destructive">*</span></Label>
            <SearchSelect
              id="supervisor-office"
              v-model="supervisor.form.officeId"
              :options="supervisor.officeOptions"
              placeholder="Select an office"
              search-placeholder="Search office, code or chief..."
              empty-text="No matching offices."
              :disabled="supervisor.isSubmitting || supervisor.isLoadingOffices"
              :invalid="!!supervisor.errors.officeId"
              @change="supervisor.onOfficeChange"
            />
            <p v-if="supervisor.errors.officeId" class="text-xs text-destructive">{{ supervisor.errors.officeId }}</p>
            <p v-else-if="supervisor.hasNoEligibleOffice" class="text-[11px] text-muted-foreground">
              Every office already has a supervisor or has no chief in the directory.
            </p>
            <p v-else-if="supervisor.chiefName" class="text-[11px] text-muted-foreground">
              Name filled from the chief: <span class="font-medium text-foreground">{{ supervisor.chiefName }}</span>. Edit it if needed.
            </p>
          </div>

          <!-- Name (auto-filled, editable) -->
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div class="space-y-1.5">
              <Label for="supervisor-firstname">First Name <span class="text-destructive">*</span></Label>
              <Input
                id="supervisor-firstname"
                v-model="supervisor.form.firstname"
                class="h-9 text-base md:text-xs"
                :disabled="supervisor.isSubmitting"
                :class="supervisor.errors.firstname ? 'border-destructive' : ''"
              />
              <p v-if="supervisor.errors.firstname" class="text-xs text-destructive">{{ supervisor.errors.firstname }}</p>
            </div>
            <div class="space-y-1.5">
              <Label for="supervisor-lastname">Last Name <span class="text-destructive">*</span></Label>
              <Input
                id="supervisor-lastname"
                v-model="supervisor.form.lastname"
                class="h-9 text-base md:text-xs"
                :disabled="supervisor.isSubmitting"
                :class="supervisor.errors.lastname ? 'border-destructive' : ''"
              />
              <p v-if="supervisor.errors.lastname" class="text-xs text-destructive">{{ supervisor.errors.lastname }}</p>
            </div>
          </div>
          <div class="space-y-1.5">
            <Label for="supervisor-middlename">Middle Name</Label>
            <Input
              id="supervisor-middlename"
              v-model="supervisor.form.middlename"
              class="h-9 text-base md:text-xs"
              :disabled="supervisor.isSubmitting"
            />
          </div>

          <!-- Login -->
          <div class="space-y-1.5">
            <Label for="supervisor-email">Email <span class="text-destructive">*</span></Label>
            <Input
              id="supervisor-email"
              v-model="supervisor.form.email"
              type="email"
              autocomplete="off"
              placeholder="lastname.firstname@peso.ph"
              class="h-9 text-base md:text-xs"
              :disabled="supervisor.isSubmitting"
              :class="supervisor.errors.email ? 'border-destructive' : ''"
            />
            <p v-if="supervisor.errors.email" class="text-xs text-destructive">{{ supervisor.errors.email }}</p>
            <p v-else class="text-[11px] text-muted-foreground">
              {{ supervisor.isEmailEdited ? 'Custom email. Clear it to use lastname.firstname@peso.ph.' : 'Filled from the name.' }}
            </p>
          </div>
          <div class="space-y-1.5">
            <Label for="supervisor-password">Password <span class="text-destructive">*</span></Label>
            <PasswordInput
              id="supervisor-password"
              v-model="supervisor.form.password"
              autocomplete="new-password"
              class="h-9 text-base md:text-xs"
              :disabled="supervisor.isSubmitting"
              :class="supervisor.errors.password ? 'border-destructive' : ''"
            />
            <p v-if="supervisor.errors.password" class="text-xs text-destructive">{{ supervisor.errors.password }}</p>
            <p v-else class="text-[11px] text-muted-foreground">{{ supervisor.passwordHint }}</p>
          </div>

          <div v-if="supervisor.errors.submit" class="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <ShieldAlert class="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <p class="text-xs text-destructive">{{ supervisor.errors.submit }}</p>
          </div>

          <DialogFooter class="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              class="text-xs cursor-pointer"
              :disabled="supervisor.isSubmitting"
              @click="supervisor.close"
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" class="gap-1.5 text-xs cursor-pointer" :disabled="supervisor.isSubmitting">
              <Loader2 v-if="supervisor.isSubmitting" class="h-3.5 w-3.5 animate-spin" />
              <span>{{ supervisor.isSubmitting ? 'Creating...' : 'Create Supervisor' }}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- ─── Add User Modal ─── -->
    <Dialog :open="isAddUserOpen" @update:open="(val: boolean) => { if (!val) closeAddUser() }">
      <DialogContent class="max-w-[95vw] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2 text-base sm:text-lg">
            Add New User
          </DialogTitle>
          <DialogDescription class="text-xs">
            Create a new user account and profile.
          </DialogDescription>
        </DialogHeader>

        <form class="space-y-4 py-2" @submit.prevent="handleAddUser">
          <!-- Name Fields -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="space-y-1.5">
              <label for="add-firstname" class="text-xs font-medium text-foreground">
                First Name <span class="text-destructive">*</span>
              </label>
              <Input
                id="add-firstname"
                v-model="formData.firstname"
                type="text"
                placeholder="Juan"
                class="text-xs h-9"
                :disabled="isSubmitting"
              />
            </div>
            <div class="space-y-1.5">
              <label for="add-lastname" class="text-xs font-medium text-foreground">
                Last Name <span class="text-destructive">*</span>
              </label>
              <Input
                id="add-lastname"
                v-model="formData.lastname"
                type="text"
                placeholder="Dela Cruz"
                class="text-xs h-9"
                :disabled="isSubmitting"
              />
            </div>
          </div>

          <div class="space-y-1.5">
            <label for="add-middlename" class="text-xs font-medium text-foreground">
              Middle Name
            </label>
            <Input
              id="add-middlename"
              v-model="formData.middlename"
              type="text"
              placeholder="Santos"
              class="text-xs h-9"
              :disabled="isSubmitting"
            />
          </div>

          <!-- Position -->
          <div class="space-y-1.5">
            <label for="add-position" class="text-xs font-medium text-foreground">
              Position <span class="text-destructive">*</span>
            </label>
            <SearchSelect
              id="add-position"
              v-model="formData.position"
              :options="addPositionOptions"
              :searchable="false"
              :disabled="isSubmitting"
            />
          </div>

          <!-- Funding (picks the accomplishment report form) -->
          <div class="space-y-1.5">
            <label for="add-funding" class="text-xs font-medium text-foreground">
              Funding <span class="text-destructive">*</span>
            </label>
            <SearchSelect
              id="add-funding"
              v-model="formData.funding"
              :options="addFundingOptions"
              placeholder="Select DOLE or PGAS"
              :searchable="false"
              :disabled="isSubmitting"
            />
            <p class="text-[11px] text-muted-foreground">Sets the accomplishment report form they fill in.</p>
          </div>

          <!-- Assigned Office -->
          <div class="space-y-1.5">
            <label for="add-office" class="text-xs font-medium text-foreground">
              Assigned Office
            </label>
            <div v-if="isOfficesLoading" class="flex items-center gap-2 h-9 px-3 text-xs text-muted-foreground">
              <Loader2 class="h-3.5 w-3.5 animate-spin" />
              <span>Loading offices...</span>
            </div>
            <SearchSelect
              v-else
              id="add-office"
              :model-value="formData.officeId ?? ''"
              :options="addOfficeSelectOptions"
              placeholder="Select an office"
              search-placeholder="Search office, code or head..."
              empty-text="No matching offices."
              :disabled="isSubmitting"
              @update:model-value="(value: string) => (formData.officeId = value)"
            />
            <p v-if="!isOfficesLoading && activeOffices.length === 0" class="text-[11px] text-muted-foreground">
              No active offices available. Create one in Office Management first.
            </p>
          </div>

          <!-- Auth Fields -->
          <div class="space-y-1.5">
            <label for="add-email" class="text-xs font-medium text-foreground">
              Email <span class="text-destructive">*</span>
            </label>
            <Input
              id="add-email"
              v-model="formData.email"
              type="email"
              autocomplete="off"
              placeholder="lastname.firstname@peso.ph"
              class="text-xs h-9"
              :disabled="isSubmitting"
            />
            <p class="text-[11px] text-muted-foreground">
              {{ isAddEmailEdited ? 'Custom email. Clear it to use lastname.firstname@peso.ph.' : 'Filled from the name.' }}
            </p>
          </div>

          <div class="space-y-1.5">
            <label for="add-password" class="text-xs font-medium text-foreground">
              Password <span class="text-destructive">*</span>
            </label>
            <PasswordInput
              id="add-password"
              v-model="formData.password"
              autocomplete="new-password"
              placeholder="Min. 6 characters"
              class="text-xs h-9"
              :disabled="isSubmitting"
            />
            <p class="text-[11px] text-muted-foreground">Default password is filled in. You can change it.</p>
          </div>

          <!-- Error Message -->
          <div v-if="submitError" class="rounded-md border border-destructive/30 bg-destructive/5 p-3 flex items-start gap-2">
            <ShieldAlert class="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p class="text-xs text-destructive">{{ submitError }}</p>
          </div>

          <!-- Success Message -->
          <div v-if="submitSuccess" class="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 flex items-start gap-2">
            <CheckCircle2 class="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <p class="text-xs text-emerald-600 dark:text-emerald-400">User created successfully!</p>
          </div>

          <DialogFooter class="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              class="text-xs cursor-pointer"
              :disabled="isSubmitting"
              @click="closeAddUser"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              class="gap-1.5 text-xs cursor-pointer"
              :disabled="isSubmitting || submitSuccess"
            >
              <Loader2 v-if="isSubmitting" class="h-3.5 w-3.5 animate-spin" />
              <Plus v-else class="h-3.5 w-3.5" />
              <span>{{ isSubmitting ? 'Creating...' : 'Create User' }}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- ─── Delete Confirmation Dialog ─── -->
    <Dialog :open="isDeleteDialogOpen" @update:open="(val) => (!val ? closeDeleteDialog() : null)">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <Trash2 class="h-5 w-5" />
            </div>
            <div>
              <DialogTitle class="text-base font-semibold text-foreground">
                Delete User Account
              </DialogTitle>
              <DialogDescription class="text-xs text-muted-foreground mt-0.5">
                Their login, profile and attendance records will be permanently deleted.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div v-if="profileToDelete" class="rounded-lg border bg-muted/30 p-3.5 text-xs space-y-2">
          <div class="flex justify-between">
            <span class="text-muted-foreground">User:</span>
            <span class="font-semibold text-foreground">{{ profileToDelete.fullName }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted-foreground">Position:</span>
            <span class="capitalize font-medium text-foreground">{{ profileToDelete.position }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted-foreground">Passcode:</span>
            <span v-if="profileToDelete.passcode" class="font-mono font-medium text-foreground bg-muted px-1.5 py-0.5 rounded">{{ profileToDelete.passcode }}</span>
            <span v-else class="text-muted-foreground">None</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted-foreground">Status:</span>
            <span class="capitalize font-medium text-foreground">{{ profileToDelete.status }}</span>
          </div>
        </div>

        <DialogFooter class="gap-2 mt-2">
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
            class="text-xs cursor-pointer gap-1.5"
            :disabled="isDeleting"
            @click="confirmDelete"
          >
            <Loader2 v-if="isDeleting" class="h-3.5 w-3.5 animate-spin" />
            <Trash2 v-else class="h-3.5 w-3.5" />
            <span>{{ isDeleting ? 'Deleting...' : 'Delete User' }}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>