<script setup lang="ts">
import {
  AlertTriangle,
  Calendar,
  CalendarX2,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  Filter,
  Loader2,
  LogOut,
  RefreshCw,
  Search,
  Users,
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
import { useAttendance } from '@/composables/peso/useAttendance'
import {
  formatDateDisplay,
  formatDateTimeDisplay,
  formatPunchStatusLabel,
  formatTimeDisplay,
  getInitials,
  getPositionBadgeClass,
  getPunchStatusBadgeClass,
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
  currentPage,
  pageSize,
  selectedRecord,
  isDetailsOpen,
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

    <!-- ─── Metric Cards Grid ─── -->
    <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
      <!-- 1. Total Logs -->
      <Card
        class="border shadow-xs bg-card/60 backdrop-blur-xs hover:border-primary/40 transition-all cursor-pointer"
        :class="selectedPositionFilter === 'ALL' && selectedStatusFilter === 'ALL' ? 'border-primary ring-2 ring-primary/20 shadow-sm' : ''"
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
        </div>

        <!-- ─── Search & Multi-Filter Bar ─── -->
        <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          <!-- Search input -->
          <div class="sm:col-span-2 relative">
            <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              v-model="searchQuery"
              placeholder="Search by employee name, position, or date..."
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

          <!-- Punch Status Filter -->
          <div>
            <select
              v-model="selectedStatusFilter"
              class="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
              class="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="ALL">All Dates</option>
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
            </select>
          </div>
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
                <TableHead class="text-right min-w-20 text-xs font-semibold">Action</TableHead>
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
                  class="transition-colors hover:bg-muted/30"
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
                    <span v-else class="text-muted-foreground/60 text-xs font-mono">—</span>
                  </TableCell>

                  <!-- 7. Actions / Details -->
                  <TableCell class="py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      class="h-8 gap-1.5 text-xs cursor-pointer"
                      @click="openDetails(record)"
                    >
                      <Eye class="h-3.5 w-3.5" />
                      <span>Details</span>
                    </Button>
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
        <div v-if="filteredAttendances.length > 0" class="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t text-xs text-muted-foreground">
          <div>
            Showing <span class="font-medium text-foreground">{{ filteredAttendances.length === 0 ? 0 : (currentPage - 1) * pageSize + 1 }}</span>
            to <span class="font-medium text-foreground">{{ Math.min(currentPage * pageSize, filteredAttendances.length) }}</span>
            of <span class="font-medium text-foreground">{{ filteredAttendances.length }}</span> records
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

        <DialogFooter>
          <Button variant="outline" size="sm" class="text-xs cursor-pointer" @click="closeDetails">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>