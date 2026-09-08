<script setup lang="ts">
import {
  CheckCircle2,
  Clock,
  Download,
  Eye,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
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
  pageSize,
  selectedProfile,
  isDetailsOpen,
  isAddUserOpen,
  isSubmitting,
  submitError,
  submitSuccess,
  formData,
  refreshProfiles,
  resetFilters,
  clearSearch,
  setPage,
  prevPage,
  nextPage,
  openDetails,
  closeDetails,
  openAddUser,
  closeAddUser,
  handleAddUser,
  exportCsv,
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
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Users class="h-5 w-5" />
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
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 class="h-5 w-5" />
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
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Clock class="h-5 w-5" />
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
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <UserX class="h-5 w-5" />
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
                <TableHead class="min-w-24 text-xs font-semibold">Status</TableHead>
                <TableHead class="min-w-24 text-xs font-semibold">Passcode</TableHead>
                <TableHead class="min-w-28 text-xs font-semibold">Created At</TableHead>
                <TableHead class="text-right min-w-20 text-xs font-semibold">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <!-- Loading State -->
              <template v-if="isLoading">
                <TableRow>
                  <TableCell colspan="5" class="h-44 text-center text-muted-foreground">
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

                  <!-- 2. Status -->
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
                    <span class="text-xs font-mono font-medium text-foreground bg-muted/60 px-2 py-0.5 rounded">
                      {{ profile.passcode }}
                    </span>
                  </TableCell>

                  <!-- 4. Created At -->
                  <TableCell class="py-3">
                    <span class="text-xs font-mono text-muted-foreground">
                      {{ formatDateDisplay(profile.createdAt) }}
                    </span>
                  </TableCell>

                  <!-- 5. Actions -->
                  <TableCell class="py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      class="h-8 gap-1.5 text-xs cursor-pointer"
                      @click="openDetails(profile)"
                    >
                      <Eye class="h-3.5 w-3.5" />
                      <span>Details</span>
                    </Button>
                  </TableCell>
                </TableRow>
              </template>

              <!-- Empty State -->
              <TableEmpty v-else :colspan="5">
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
            Showing <span class="font-medium text-foreground">{{ filteredProfiles.length === 0 ? 0 : (currentPage - 1) * pageSize + 1 }}</span>
            to <span class="font-medium text-foreground">{{ Math.min(currentPage * pageSize, filteredProfiles.length) }}</span>
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
                v-for="p in Math.min(totalPages, 5)"
                :key="p"
                size="sm"
                :variant="currentPage === p ? 'default' : 'outline'"
                class="h-8 w-8 p-0 text-xs cursor-pointer"
                @click="setPage(p)"
              >
                {{ p }}
              </Button>
              <span v-if="totalPages > 5" class="text-xs px-1">...</span>
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
            Detailed view of user profile from public.profiles.
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
                  <span class="bg-muted/60 px-2 py-0.5 rounded">{{ selectedProfile.passcode }}</span>
                </p>
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

        <DialogFooter>
          <Button variant="outline" size="sm" class="text-xs cursor-pointer" @click="closeDetails">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- ─── Add User Modal ─── -->
    <Dialog :open="isAddUserOpen" @update:open="(val: boolean) => { if (!val) closeAddUser() }">
      <DialogContent class="max-w-[95vw] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2 text-base sm:text-lg">
            <Plus class="h-4 w-4 text-primary" />
            Add New User
          </DialogTitle>
          <DialogDescription class="text-xs">
            Create a new user account and profile. This will register the user in auth.users and public.profiles.
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
            <select
              id="add-position"
              v-model="formData.position"
              class="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              :disabled="isSubmitting"
            >
              <option value="employee">Employee</option>
              <option value="gip">GIP</option>
              <option value="tupad">TUPAD</option>
              <option value="client">Client</option>
            </select>
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
              placeholder="user@example.com"
              class="text-xs h-9"
              :disabled="isSubmitting"
            />
          </div>

          <div class="space-y-1.5">
            <label for="add-password" class="text-xs font-medium text-foreground">
              Password <span class="text-destructive">*</span>
            </label>
            <Input
              id="add-password"
              v-model="formData.password"
              type="password"
              placeholder="Min. 6 characters"
              class="text-xs h-9"
              :disabled="isSubmitting"
            />
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
  </div>
</template>