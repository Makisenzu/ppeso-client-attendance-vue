<script setup lang="ts">
import { ref } from 'vue'
import {
  AlertTriangle,
  Calendar,
  CalendarX2,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  Filter,
  Loader2,
  LogOut,
  RefreshCw,
  Search,
  Trash2,
  Users,
  X,
} from '@lucide/vue'
import DtrModal from './DtrModal.vue'
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
import { useAttendance } from '@/composables/peso/useAttendance'
import {
  formatDateDisplay,
  formatDateTimeDisplay,
  formatPunchStatusLabel,
  formatTimeDisplay,
  getInitials,
  getPositionBadgeClass,
  getPunchStatusBadgeClass,
  isRecordAbsent,
} from '@/helpers/peso/attendanceHelper'

const {
  attendances,
  filteredAttendances,
  paginatedAttendances,
  availablePositions,
  totalPages,
  statsSummary,
  isLoading,
  searchQuery,
  selectedPositionFilter,
  selectedStatusFilter,
  selectedDateFilter,
  customDateFilter,
  hasActiveFilters,
  visiblePages,
  currentPage,
  pageSize,
  selectedRecord,
  isDetailsOpen,
  recordToDelete,
  isDeleteDialogOpen,
  isDeleting,
  feedbackMessage,
  dismissFeedback,
  openDeleteDialog,
  closeDeleteDialog,
  confirmDelete,
  refreshAttendances,
  resetFilters,
  clearSearch,
  setPage,
  prevPage,
  nextPage,
  openDetails,
  closeDetails,
  exportCsv,
} = useAttendance()

// ─── Civil Service Form 48 DTR Modal ───
const isDtrModalOpen = ref(false)
const dtrProfileId = ref<string | null>(null)

const openDtrModal = (profileId?: string | null) => {
  dtrProfileId.value = profileId || null
  isDtrModalOpen.value = true
}
</script>

<template>
  <div class="flex flex-col gap-6 pb-12">
    <!-- ─── Header & Title ─── -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="space-y-1">
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
          Attendance Records
        </h1>
        <p class="text-sm text-muted-foreground">
          Daily Time Records (DTR) and punch logs.
        </p>
      </div>

      <!-- Quick Action Buttons -->
      <div class="flex items-center gap-2 self-start sm:self-auto flex-wrap">
        <Button
          variant="default"
          size="sm"
          class="gap-1.5 text-xs cursor-pointer shadow-xs font-semibold"
          @click="openDtrModal()"
        >
          <FileText class="h-3.5 w-3.5" />
          <span>Generate DTR</span>
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
          @click="refreshAttendances"
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
      :class="feedbackMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' : 'bg-destructive/10 text-destructive border-destructive/20'"
    >
      <div class="flex items-center gap-2">
        <CheckCircle2 v-if="feedbackMessage.type === 'success'" class="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <AlertTriangle v-else class="h-4 w-4 shrink-0" />
        <span class="font-medium">{{ feedbackMessage.text }}</span>
      </div>
      <button @click="dismissFeedback" class="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer">
        <X class="h-3.5 w-3.5" />
      </button>
    </div>

    <!-- ─── Metric Cards Grid ─── -->
    <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
      <!-- 1. Total Logs -->
      <Card
        class="border shadow-xs bg-card/60 backdrop-blur-xs hover:border-primary/40 transition-all cursor-pointer"
        :class="!hasActiveFilters ? 'border-primary ring-2 ring-primary/20 shadow-sm' : ''"
        @click="resetFilters"
      >
        <CardContent class="p-4 flex items-center justify-between">
          <div class="space-y-0.5 min-w-0">
            <p class="text-xs font-medium text-muted-foreground truncate">Total DTR Logs</p>
            <p class="text-2xl font-bold tracking-tight font-mono text-foreground">
              {{ statsSummary.total.toLocaleString() }}
            </p>
            <p class="text-[11px] text-muted-foreground truncate">
              All time entries
            </p>
          </div>
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Users class="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      <!-- 2. On-Time Entries -->
      <Card
        class="border shadow-xs bg-card/60 backdrop-blur-xs hover:border-emerald-500/40 transition-all cursor-pointer"
        :class="selectedStatusFilter === 'ontime' ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm' : ''"
        @click="selectedStatusFilter = selectedStatusFilter === 'ontime' ? 'ALL' : 'ontime'"
      >
        <CardContent class="p-4 flex items-center justify-between">
          <div class="space-y-0.5 min-w-0">
            <p class="text-xs font-medium text-muted-foreground truncate">On Time</p>
            <p class="text-2xl font-bold tracking-tight font-mono text-emerald-600 dark:text-emerald-400">
              {{ statsSummary.onTimeCount.toLocaleString() }}
            </p>
            <p class="text-[11px] text-muted-foreground truncate">
              Punctual punches
            </p>
          </div>
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 class="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      <!-- 3. Late Punches -->
      <Card
        class="border shadow-xs bg-card/60 backdrop-blur-xs hover:border-amber-500/40 transition-all cursor-pointer"
        :class="selectedStatusFilter === 'late' ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-sm' : ''"
        @click="selectedStatusFilter = selectedStatusFilter === 'late' ? 'ALL' : 'late'"
      >
        <CardContent class="p-4 flex items-center justify-between">
          <div class="space-y-0.5 min-w-0">
            <p class="text-xs font-medium text-muted-foreground truncate">Late Arrivals</p>
            <p class="text-2xl font-bold tracking-tight font-mono text-amber-600 dark:text-amber-400">
              {{ statsSummary.lateCount.toLocaleString() }}
            </p>
            <p class="text-[11px] text-muted-foreground truncate">
              AM/PM late logs
            </p>
          </div>
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Clock class="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      <!-- 4. Early Out -->
      <Card
        class="border shadow-xs bg-card/60 backdrop-blur-xs hover:border-orange-500/40 transition-all cursor-pointer"
        :class="selectedStatusFilter === 'early_out' ? 'border-orange-500 ring-2 ring-orange-500/20 shadow-sm' : ''"
        @click="selectedStatusFilter = selectedStatusFilter === 'early_out' ? 'ALL' : 'early_out'"
      >
        <CardContent class="p-4 flex items-center justify-between">
          <div class="space-y-0.5 min-w-0">
            <p class="text-xs font-medium text-muted-foreground truncate">Early Out</p>
            <p class="text-2xl font-bold tracking-tight font-mono text-orange-600 dark:text-orange-400">
              {{ statsSummary.earlyOutCount.toLocaleString() }}
            </p>
            <p class="text-[11px] text-muted-foreground truncate">
              Early departures
            </p>
          </div>
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
            <LogOut class="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      <!-- 5. Absent -->
      <Card
        class="border shadow-xs bg-card/60 backdrop-blur-xs hover:border-rose-500/40 transition-all cursor-pointer"
        :class="selectedStatusFilter === 'absent' ? 'border-rose-500 ring-2 ring-rose-500/20 shadow-sm' : ''"
        @click="selectedStatusFilter = selectedStatusFilter === 'absent' ? 'ALL' : 'absent'"
      >
        <CardContent class="p-4 flex items-center justify-between">
          <div class="space-y-0.5 min-w-0">
            <p class="text-xs font-medium text-muted-foreground truncate">Absent</p>
            <p class="text-2xl font-bold tracking-tight font-mono text-rose-600 dark:text-rose-400">
              {{ statsSummary.absentCount.toLocaleString() }}
            </p>
            <p class="text-[11px] text-muted-foreground truncate">
              No attendance logged
            </p>
          </div>
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <AlertTriangle class="h-5 w-5" />
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
              Employee Attendance Record
            </CardTitle>
            <CardDescription class="text-xs">
              Showing {{ filteredAttendances.length }} of {{ attendances.length }} total records
            </CardDescription>
          </div>

          <Button
            v-if="hasActiveFilters"
            variant="ghost"
            size="sm"
            class="gap-1.5 text-xs text-muted-foreground hover:text-foreground h-8 self-start sm:self-auto cursor-pointer"
            @click="resetFilters"
          >
            <X class="h-3.5 w-3.5" />
            <span>Clear all filters</span>
          </Button>
        </div>

        <!-- ─── Search & Multi-Filter Bar ─── -->
        <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          <!-- Search input -->
          <div class="sm:col-span-2 relative">
            <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              v-model="searchQuery"
              placeholder="Search by employee name, position, or date..."
              class="pl-9 pr-8 text-xs h-9"
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
              class="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer dark:scheme [&_option]:bg-white [&_option]:text-neutral-900 dark:[&_option]:bg-neutral-900 dark:[&_option]:text-neutral-100"
            >
              <option value="ALL">All Positions</option>
              <option v-for="pos in availablePositions" :key="pos" :value="pos">
                {{ pos }}
              </option>
            </select>
          </div>

          <!-- Punch Status Filter -->
          <div>
            <select
              v-model="selectedStatusFilter"
              class="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer dark:scheme [&_option]:bg-white [&_option]:text-neutral-900 dark:[&_option]:bg-neutral-900 dark:[&_option]:text-neutral-100"
            >
              <option value="ALL">All Punch Statuses</option>
              <option value="ontime">On Time</option>
              <option value="late">Late</option>
              <option value="early_out">Early Out</option>
              <option value="absent">Absent</option>
            </select>
          </div>

          <!-- Date Filter -->
          <div>
            <select
              v-model="selectedDateFilter"
              class="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer dark:scheme [&_option]:bg-white [&_option]:text-neutral-900 dark:[&_option]:bg-neutral-900 dark:[&_option]:text-neutral-100"
            >
              <option value="ALL">All Dates</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="custom">Custom Date...</option>
            </select>
          </div>
        </div>

        <!-- Custom Date Picker row when 'custom' is selected -->
        <div v-if="selectedDateFilter === 'custom'" class="mt-3 flex items-center gap-2">
          <span class="text-xs text-muted-foreground font-medium">Select Date:</span>
          <Input
            v-model="customDateFilter"
            type="date"
            class="h-8 max-w-xs text-xs"
          />
          <Button
            v-if="customDateFilter"
            variant="ghost"
            size="sm"
            class="h-8 px-2 text-xs"
            @click="customDateFilter = ''"
          >
            Clear Date
          </Button>
        </div>

        <!-- Active Filter Badges -->
        <div v-if="hasActiveFilters" class="mt-3 flex flex-wrap items-center gap-1.5 pt-2 border-t text-xs">
          <span class="text-[11px] text-muted-foreground font-medium mr-1">Active filters:</span>

          <Badge
            v-if="searchQuery.trim()"
            variant="secondary"
            class="gap-1 text-[11px] font-normal py-0.5"
          >
            <span>Search: "{{ searchQuery }}"</span>
            <button class="hover:text-foreground cursor-pointer" @click="clearSearch">
              <X class="h-3 w-3" />
            </button>
          </Badge>

          <Badge
            v-if="selectedPositionFilter !== 'ALL'"
            variant="secondary"
            class="gap-1 text-[11px] font-normal py-0.5"
          >
            <span>Position: {{ selectedPositionFilter }}</span>
            <button class="hover:text-foreground cursor-pointer" @click="selectedPositionFilter = 'ALL'">
              <X class="h-3 w-3" />
            </button>
          </Badge>

          <Badge
            v-if="selectedStatusFilter !== 'ALL'"
            variant="secondary"
            class="gap-1 text-[11px] font-normal py-0.5 capitalize"
          >
            <span>Status: {{ formatPunchStatusLabel(selectedStatusFilter) }}</span>
            <button class="hover:text-foreground cursor-pointer" @click="selectedStatusFilter = 'ALL'">
              <X class="h-3 w-3" />
            </button>
          </Badge>

          <Badge
            v-if="selectedDateFilter !== 'ALL'"
            variant="secondary"
            class="gap-1 text-[11px] font-normal py-0.5 capitalize"
          >
            <span>Date: {{ selectedDateFilter === 'custom' ? (customDateFilter || 'Custom Date') : selectedDateFilter.replace('_', ' ') }}</span>
            <button class="hover:text-foreground cursor-pointer" @click="selectedDateFilter = 'ALL'; customDateFilter = ''">
              <X class="h-3 w-3" />
            </button>
          </Badge>

          <Button
            variant="ghost"
            size="sm"
            class="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground cursor-pointer"
            @click="resetFilters"
          >
            Reset All
          </Button>
        </div>
      </CardHeader>

      <CardContent class="p-0">
        <!-- ─── Table following core.attendances columns ─── -->
        <div class="relative overflow-x-auto border-t">
          <Table>
            <TableHeader class="bg-muted/40">
              <TableRow>
                <TableHead class="min-w-44 text-xs font-semibold">Employee</TableHead>
                <TableHead class="min-w-28 text-xs font-semibold">Attendance Date</TableHead>
                <TableHead class="min-w-28 text-xs font-semibold">AM Check In</TableHead>
                <TableHead class="min-w-28 text-xs font-semibold">AM Check Out</TableHead>
                <TableHead class="min-w-28 text-xs font-semibold">PM Check In</TableHead>
                <TableHead class="min-w-28 text-xs font-semibold">PM Check Out</TableHead>
                <TableHead class="text-right min-w-28 text-xs font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <!-- Loading State -->
              <template v-if="isLoading">
                <TableRow>
                  <TableCell colspan="7" class="h-44 text-center text-muted-foreground">
                    <div class="flex flex-col items-center justify-center gap-2 py-6">
                      <Loader2 class="h-8 w-8 animate-spin text-primary" />
                      <p class="text-xs text-muted-foreground">Loading records from core.attendances...</p>
                    </div>
                  </TableCell>
                </TableRow>
              </template>

              <!-- Data Rows following core.attendances columns -->
              <template v-else-if="paginatedAttendances.length > 0">
                <TableRow
                  v-for="record in paginatedAttendances"
                  :key="record.id"
                  class="transition-colors"
                  :class="[isRecordAbsent(record) ? 'bg-destructive/3 hover:bg-destructive/8' : 'hover:bg-muted/30']"
                >
                  <!-- 1. Employee (profile_id) -->
                  <TableCell class="py-3">
                    <div class="flex items-center gap-2.5">
                      <Avatar class="h-8 w-8 text-xs shrink-0 font-medium">
                        <AvatarFallback class="bg-primary/10 text-primary">
                          {{ getInitials(record.fullName) }}
                        </AvatarFallback>
                      </Avatar>
                      <div class="flex flex-col min-w-0">
                        <span class="font-semibold text-xs sm:text-sm text-foreground truncate">
                          {{ record.fullName }}
                        </span>
                        <div class="flex items-center gap-1.5 mt-0.5">
                          <Badge
                            variant="outline"
                            :class="[getPositionBadgeClass(record.position), 'text-[10px] uppercase font-mono px-1.5 py-0 h-4']"
                          >
                            {{ record.position || 'Employee' }}
                          </Badge>
                          <Badge
                            v-if="isRecordAbsent(record)"
                            variant="outline"
                            :class="[getPunchStatusBadgeClass('absent'), 'text-[10px] uppercase font-mono px-1.5 py-0 h-4']"
                          >
                            Absent
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  <!-- 2. Attendance Date (attendance_date) -->
                  <TableCell class="py-3">
                    <div class="flex items-center gap-1.5 text-xs font-mono font-medium text-foreground">
                      <Calendar class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span>{{ formatDateDisplay(record.attendanceDate) }}</span>
                    </div>
                  </TableCell>

                  <!-- 3. AM Check In (am_check_in & am_in_status) -->
                  <TableCell class="py-3">
                    <div v-if="record.amCheckIn" class="flex flex-col gap-1 items-start">
                      <span class="text-xs font-mono font-medium text-foreground">
                        {{ formatTimeDisplay(record.amCheckIn) }}
                      </span>
                      <Badge
                        v-if="record.amInStatus"
                        variant="outline"
                        :class="[getPunchStatusBadgeClass(record.amInStatus), 'text-[10px] font-mono capitalize px-1.5 py-0 h-4']"
                      >
                        {{ formatPunchStatusLabel(record.amInStatus) }}
                      </Badge>
                    </div>
                    <div v-else-if="record.amInStatus === 'absent' || (isRecordAbsent(record) && !record.amCheckIn)" class="flex flex-col gap-1 items-start">
                      <Badge
                        variant="outline"
                        :class="[getPunchStatusBadgeClass('absent'), 'text-[10px] font-mono capitalize px-1.5 py-0 h-4']"
                      >
                        Absent
                      </Badge>
                    </div>
                    <div v-else-if="record.amInStatus" class="flex flex-col gap-1 items-start">
                      <Badge
                        variant="outline"
                        :class="[getPunchStatusBadgeClass(record.amInStatus), 'text-[10px] font-mono capitalize px-1.5 py-0 h-4']"
                      >
                        {{ formatPunchStatusLabel(record.amInStatus) }}
                      </Badge>
                    </div>
                    <span v-else class="text-muted-foreground/60 text-xs font-mono">—</span>
                  </TableCell>

                  <!-- 4. AM Check Out (am_check_out & am_out_status) -->
                  <TableCell class="py-3">
                    <div v-if="record.amCheckOut" class="flex flex-col gap-1 items-start">
                      <span class="text-xs font-mono font-medium text-foreground">
                        {{ formatTimeDisplay(record.amCheckOut) }}
                      </span>
                      <Badge
                        v-if="record.amOutStatus"
                        variant="outline"
                        :class="[getPunchStatusBadgeClass(record.amOutStatus), 'text-[10px] font-mono capitalize px-1.5 py-0 h-4']"
                      >
                        {{ formatPunchStatusLabel(record.amOutStatus) }}
                      </Badge>
                    </div>
                    <div v-else-if="record.amOutStatus === 'absent' || (isRecordAbsent(record) && !record.amCheckOut)" class="flex flex-col gap-1 items-start">
                      <Badge
                        variant="outline"
                        :class="[getPunchStatusBadgeClass('absent'), 'text-[10px] font-mono capitalize px-1.5 py-0 h-4']"
                      >
                        Absent
                      </Badge>
                    </div>
                    <div v-else-if="record.amOutStatus" class="flex flex-col gap-1 items-start">
                      <Badge
                        variant="outline"
                        :class="[getPunchStatusBadgeClass(record.amOutStatus), 'text-[10px] font-mono capitalize px-1.5 py-0 h-4']"
                      >
                        {{ formatPunchStatusLabel(record.amOutStatus) }}
                      </Badge>
                    </div>
                    <span v-else class="text-muted-foreground/60 text-xs font-mono">—</span>
                  </TableCell>

                  <!-- 5. PM Check In (pm_check_in & pm_in_status) -->
                  <TableCell class="py-3">
                    <div v-if="record.pmCheckIn" class="flex flex-col gap-1 items-start">
                      <span class="text-xs font-mono font-medium text-foreground">
                        {{ formatTimeDisplay(record.pmCheckIn) }}
                      </span>
                      <Badge
                        v-if="record.pmInStatus"
                        variant="outline"
                        :class="[getPunchStatusBadgeClass(record.pmInStatus), 'text-[10px] font-mono capitalize px-1.5 py-0 h-4']"
                      >
                        {{ formatPunchStatusLabel(record.pmInStatus) }}
                      </Badge>
                    </div>
                    <div v-else-if="record.pmInStatus === 'absent' || (isRecordAbsent(record) && !record.pmCheckIn)" class="flex flex-col gap-1 items-start">
                      <Badge
                        variant="outline"
                        :class="[getPunchStatusBadgeClass('absent'), 'text-[10px] font-mono capitalize px-1.5 py-0 h-4']"
                      >
                        Absent
                      </Badge>
                    </div>
                    <div v-else-if="record.pmInStatus" class="flex flex-col gap-1 items-start">
                      <Badge
                        variant="outline"
                        :class="[getPunchStatusBadgeClass(record.pmInStatus), 'text-[10px] font-mono capitalize px-1.5 py-0 h-4']"
                      >
                        {{ formatPunchStatusLabel(record.pmInStatus) }}
                      </Badge>
                    </div>
                    <span v-else class="text-muted-foreground/60 text-xs font-mono">—</span>
                  </TableCell>

                  <!-- 6. PM Check Out (pm_check_out & pm_out_status) -->
                  <TableCell class="py-3">
                    <div v-if="record.pmCheckOut" class="flex flex-col gap-1 items-start">
                      <span class="text-xs font-mono font-medium text-foreground">
                        {{ formatTimeDisplay(record.pmCheckOut) }}
                      </span>
                      <Badge
                        v-if="record.pmOutStatus"
                        variant="outline"
                        :class="[getPunchStatusBadgeClass(record.pmOutStatus), 'text-[10px] font-mono capitalize px-1.5 py-0 h-4']"
                      >
                        {{ formatPunchStatusLabel(record.pmOutStatus) }}
                      </Badge>
                    </div>
                    <div v-else-if="record.pmOutStatus === 'absent' || (isRecordAbsent(record) && !record.pmCheckOut)" class="flex flex-col gap-1 items-start">
                      <Badge
                        variant="outline"
                        :class="[getPunchStatusBadgeClass('absent'), 'text-[10px] font-mono capitalize px-1.5 py-0 h-4']"
                      >
                        Absent
                      </Badge>
                    </div>
                    <div v-else-if="record.pmOutStatus" class="flex flex-col gap-1 items-start">
                      <Badge
                        variant="outline"
                        :class="[getPunchStatusBadgeClass(record.pmOutStatus), 'text-[10px] font-mono capitalize px-1.5 py-0 h-4']"
                      >
                        {{ formatPunchStatusLabel(record.pmOutStatus) }}
                      </Badge>
                    </div>
                    <span v-else class="text-muted-foreground/60 text-xs font-mono">—</span>
                  </TableCell>

                  <!-- 7. Actions / Details, DTR & Delete -->
                  <TableCell class="py-3 text-right">
                    <div class="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        class="h-8 gap-1.5 text-xs cursor-pointer"
                        @click="openDetails(record)"
                      >
                        <Eye class="h-3.5 w-3.5" />
                        <span class="hidden sm:inline">Details</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        class="h-8 w-8 text-destructive/80 hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                        title="Delete record"
                        @click="openDeleteDialog(record)"
                      >
                        <Trash2 class="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              </template>

              <!-- Empty State using UI Empty Component -->
              <TableEmpty v-else :colspan="7">
                <Empty class="border-0 p-6 md:p-8">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <CalendarX2 v-if="attendances.length === 0" class="size-5 text-muted-foreground" />
                      <Filter v-else class="size-5 text-muted-foreground" />
                    </EmptyMedia>
                    <EmptyTitle>
                      {{ attendances.length === 0 ? 'No attendance records found' : 'No matching attendance records' }}
                    </EmptyTitle>
                    <EmptyDescription>
                      {{ attendances.length === 0
                        ? 'No attendance records have been logged yet.'
                        : 'No attendance records match your current search query or filter criteria.'
                      }}
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button
                      v-if="attendances.length > 0"
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
                      variant="outline"
                      class="gap-1.5 text-xs cursor-pointer"
                      :disabled="isLoading"
                      @click="refreshAttendances"
                    >
                      <RefreshCw :class="['h-3.5 w-3.5', isLoading && 'animate-spin']" />
                      <span>Refresh Records</span>
                    </Button>
                  </EmptyContent>
                </Empty>
              </TableEmpty>
            </TableBody>
          </Table>
        </div>

        <!-- ─── Table Pagination Footer ─── -->
        <div v-if="filteredAttendances.length > 0" class="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 border-t text-xs text-muted-foreground bg-muted/10">
          <div>
            Showing <span class="font-medium text-foreground">{{ filteredAttendances.length === 0 ? 0 : (currentPage - 1) * pageSize + 1 }}</span>
            to <span class="font-medium text-foreground">{{ Math.min(currentPage * pageSize, filteredAttendances.length) }}</span>
            of <span class="font-medium text-foreground">{{ filteredAttendances.length }}</span> records
          </div>

          <div class="flex items-center gap-2 flex-wrap">
            <!-- Rows per page selector -->
            <div class="flex items-center gap-1.5 mr-2">
              <span class="text-[11px]">Rows:</span>
              <select
                v-model.number="pageSize"
                class="h-7 rounded border border-input bg-background px-1.5 text-xs text-foreground cursor-pointer dark:scheme [&_option]:bg-white [&_option]:text-neutral-900 dark:[&_option]:bg-neutral-900 dark:[&_option]:text-neutral-100"
              >
                <option :value="10">10</option>
                <option :value="25">25</option>
                <option :value="50">50</option>
                <option :value="100">100</option>
              </select>
            </div>

            <Button
              variant="outline"
              size="sm"
              class="h-7 text-xs px-2 cursor-pointer"
              :disabled="currentPage <= 1"
              @click="prevPage"
            >
              Previous
            </Button>
            <div class="flex items-center gap-1">
              <Button
                v-if="visiblePages.length > 0 && visiblePages[0] > 1"
                size="sm"
                variant="outline"
                class="h-7 w-7 p-0 text-xs cursor-pointer"
                @click="setPage(1)"
              >
                1
              </Button>
              <span v-if="visiblePages.length > 0 && visiblePages[0] > 2" class="text-xs px-0.5">...</span>

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

              <span v-if="visiblePages.length > 0 && visiblePages[visiblePages.length - 1] < totalPages - 1" class="text-xs px-0.5">...</span>
              <Button
                v-if="visiblePages.length > 0 && visiblePages[visiblePages.length - 1] < totalPages"
                size="sm"
                variant="outline"
                class="h-7 w-7 p-0 text-xs cursor-pointer"
                @click="setPage(totalPages)"
              >
                {{ totalPages }}
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              class="h-7 text-xs px-2 cursor-pointer"
              :disabled="currentPage >= totalPages"
              @click="nextPage"
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- ─── Attendance Details Modal ─── -->
    <Dialog :open="isDetailsOpen" @update:open="(val: boolean) => { if (!val) closeDetails() }">
      <DialogContent class="max-w-[95vw] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2 text-base sm:text-lg">
            Daily Time Record Details
          </DialogTitle>
          <DialogDescription class="text-xs">
            Detailed view of attendance entry in core.attendances.
          </DialogDescription>
        </DialogHeader>

        <div v-if="selectedRecord" class="space-y-4 py-2 text-xs">
          <!-- Personnel Card -->
          <div class="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
            <Avatar class="h-10 w-10 text-sm font-semibold">
              <AvatarFallback class="bg-primary/10 text-primary">
                {{ getInitials(selectedRecord.fullName) }}
              </AvatarFallback>
            </Avatar>
            <div class="min-w-0 space-y-0.5">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-semibold text-sm text-foreground">
                  {{ selectedRecord.fullName }}
                </span>
                <Badge
                  variant="outline"
                  :class="getPositionBadgeClass(selectedRecord.position)"
                  class="text-[10px] uppercase font-mono"
                >
                  {{ selectedRecord.position || 'Employee' }}
                </Badge>
                <Badge
                  v-if="isRecordAbsent(selectedRecord)"
                  variant="outline"
                  :class="getPunchStatusBadgeClass('absent')"
                  class="text-[10px] uppercase font-mono"
                >
                  Absent
                </Badge>
              </div>
              <p class="text-muted-foreground text-[11px] font-mono">
                Date: <span class="font-semibold text-foreground">{{ formatDateDisplay(selectedRecord.attendanceDate) }}</span>
              </p>
            </div>
          </div>

          <!-- AM Session Punches -->
          <div class="p-3 rounded-lg border bg-card space-y-2">
            <p class="font-semibold text-xs text-foreground flex items-center gap-1.5">
              <Clock class="h-3.5 w-3.5 text-primary" />
              <span>Morning Session (AM)</span>
            </p>
            <div class="grid grid-cols-2 gap-3 pt-1">
              <div>
                <p class="text-[11px] text-muted-foreground">AM Check-In</p>
                <p class="font-medium font-mono text-foreground mt-0.5">
                  {{ formatTimeDisplay(selectedRecord.amCheckIn) }}
                </p>
                <Badge
                  v-if="selectedRecord.amInStatus"
                  variant="outline"
                  :class="[getPunchStatusBadgeClass(selectedRecord.amInStatus), 'mt-1 text-[10px] font-mono capitalize']"
                >
                  {{ formatPunchStatusLabel(selectedRecord.amInStatus) }}
                </Badge>
              </div>
              <div>
                <p class="text-[11px] text-muted-foreground">AM Check-Out</p>
                <p class="font-medium font-mono text-foreground mt-0.5">
                  {{ formatTimeDisplay(selectedRecord.amCheckOut) }}
                </p>
                <Badge
                  v-if="selectedRecord.amOutStatus"
                  variant="outline"
                  :class="[getPunchStatusBadgeClass(selectedRecord.amOutStatus), 'mt-1 text-[10px] font-mono capitalize']"
                >
                  {{ formatPunchStatusLabel(selectedRecord.amOutStatus) }}
                </Badge>
              </div>
            </div>
          </div>

          <!-- PM Session Punches -->
          <div class="p-3 rounded-lg border bg-card space-y-2">
            <p class="font-semibold text-xs text-foreground flex items-center gap-1.5">
              <Clock class="h-3.5 w-3.5 text-primary" />
              <span>Afternoon Session (PM)</span>
            </p>
            <div class="grid grid-cols-2 gap-3 pt-1">
              <div>
                <p class="text-[11px] text-muted-foreground">PM Check-In</p>
                <p class="font-medium font-mono text-foreground mt-0.5">
                  {{ formatTimeDisplay(selectedRecord.pmCheckIn) }}
                </p>
                <Badge
                  v-if="selectedRecord.pmInStatus"
                  variant="outline"
                  :class="[getPunchStatusBadgeClass(selectedRecord.pmInStatus), 'mt-1 text-[10px] font-mono capitalize']"
                >
                  {{ formatPunchStatusLabel(selectedRecord.pmInStatus) }}
                </Badge>
              </div>
              <div>
                <p class="text-[11px] text-muted-foreground">PM Check-Out</p>
                <p class="font-medium font-mono text-foreground mt-0.5">
                  {{ formatTimeDisplay(selectedRecord.pmCheckOut) }}
                </p>
                <Badge
                  v-if="selectedRecord.pmOutStatus"
                  variant="outline"
                  :class="[getPunchStatusBadgeClass(selectedRecord.pmOutStatus), 'mt-1 text-[10px] font-mono capitalize']"
                >
                  {{ formatPunchStatusLabel(selectedRecord.pmOutStatus) }}
                </Badge>
              </div>
            </div>
          </div>

          <!-- Metadata -->
          <div class="p-3 rounded-lg border bg-muted/20 space-y-1.5 text-muted-foreground text-[11px] font-mono">
            <div class="flex justify-between">
              <span>Profile ID:</span>
              <span class="text-foreground truncate max-w-64">{{ selectedRecord.profileId }}</span>
            </div>
            <div class="flex justify-between">
              <span>Record ID:</span>
              <span class="text-foreground truncate max-w-64">{{ selectedRecord.id }}</span>
            </div>
            <div class="flex justify-between">
              <span>Created At:</span>
              <span class="text-foreground">{{ formatDateTimeDisplay(selectedRecord.createdAt) }}</span>
            </div>
          </div>
        </div>

        <DialogFooter class="flex flex-col-reverse sm:flex-row sm:justify-between items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            class="text-xs cursor-pointer gap-1.5 w-full sm:w-auto"
            @click="(() => { const pid = selectedRecord?.profileId; closeDetails(); openDtrModal(pid); })()"
          >
            <FileText class="h-3.5 w-3.5 text-primary" />
            <span>Generate DTR Form 48</span>
          </Button>
          <Button variant="outline" size="sm" class="text-xs cursor-pointer w-full sm:w-auto" @click="closeDetails">
            Close
          </Button>
        </DialogFooter>
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
                Delete Attendance Record
              </DialogTitle>
              <DialogDescription class="text-xs text-muted-foreground mt-0.5">
                This action cannot be undone. Are you sure you want to permanently delete this DTR log?
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div v-if="recordToDelete" class="rounded-lg border bg-muted/30 p-3.5 text-xs space-y-2">
          <div class="flex justify-between">
            <span class="text-muted-foreground">Employee:</span>
            <span class="font-semibold text-foreground">{{ recordToDelete.fullName }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted-foreground">Date:</span>
            <span class="font-mono font-medium text-foreground">{{ formatDateDisplay(recordToDelete.attendanceDate) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted-foreground">Position:</span>
            <span class="capitalize font-medium text-foreground">{{ recordToDelete.position || 'Employee' }}</span>
          </div>
          <div class="flex justify-between" v-if="recordToDelete.amCheckIn || recordToDelete.pmCheckIn">
            <span class="text-muted-foreground">Logged Punches:</span>
            <span class="font-mono text-foreground">
              {{ recordToDelete.amCheckIn ? 'AM: ' + formatTimeDisplay(recordToDelete.amCheckIn) : '' }}
              {{ recordToDelete.pmCheckIn ? ' PM: ' + formatTimeDisplay(recordToDelete.pmCheckIn) : '' }}
            </span>
          </div>
          <div class="flex justify-between" v-else-if="isRecordAbsent(recordToDelete)">
            <span class="text-muted-foreground">Status:</span>
            <Badge variant="outline" :class="[getPunchStatusBadgeClass('absent'), 'text-[10px] font-mono capitalize']">
              Absent
            </Badge>
          </div>
        </div>

        <DialogFooter class="gap-2 sm:gap-0 mt-2">
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
            <span>{{ isDeleting ? 'Deleting...' : 'Delete Record' }}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- ─── Civil Service Form 48 DTR Generation Modal ─── -->
    <DtrModal
      v-model:open="isDtrModalOpen"
      :initial-profile-id="dtrProfileId"
      :existing-attendances="attendances"
    />
  </div>
</template>