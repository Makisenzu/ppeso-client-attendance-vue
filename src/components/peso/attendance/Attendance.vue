<script setup lang="ts">
import {
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  Filter,
  Loader2,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  UserCheck,
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
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAttendance } from '@/composables/peso/useAttendance'
import {
  calculateDurationDisplay,
  formatClassificationLabel,
  formatDateDisplay,
  formatDateTimeDisplay,
  formatTimeDisplay,
  getInitials,
  getStatusBadgeClass,
  getStatusBadgeVariant,
  getTypeBadgeClass,
} from '@/helpers/peso/attendanceHelper'

const {
  attendances,
  filteredAttendances,
  paginatedAttendances,
  availableCategories,
  totalPages,
  statsSummary,
  isLoading,
  searchQuery,
  selectedTypeFilter,
  selectedStatusFilter,
  selectedCategoryFilter,
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
          User Attendance
        </h1>
        <p class="text-sm text-muted-foreground">
          Real-time logs and time records for registered personnel and walk-in clients.
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
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <!-- 1. Total Attendance -->
      <Card
        class="border shadow-xs bg-card/60 backdrop-blur-xs hover:border-primary/40 transition-all cursor-pointer"
        :class="selectedTypeFilter === 'ALL' && selectedStatusFilter === 'ALL' ? 'border-primary ring-2 ring-primary/20 shadow-sm' : ''"
        @click="resetFilters"
      >
        <CardContent class="p-4 flex items-center justify-between">
          <div class="space-y-0.5 min-w-0">
            <p class="text-xs font-medium text-muted-foreground truncate">Total Records</p>
            <p class="text-2xl font-bold tracking-tight font-mono text-foreground">
              {{ statsSummary.total.toLocaleString() }}
            </p>
            <p class="text-[11px] text-muted-foreground truncate">
              All attendance sessions
            </p>
          </div>
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Users class="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      <!-- 2. Currently Checked-In (Active) -->
      <Card
        class="border shadow-xs bg-card/60 backdrop-blur-xs hover:border-emerald-500/40 transition-all cursor-pointer"
        :class="selectedStatusFilter === 'active' ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm' : ''"
        @click="selectedStatusFilter = selectedStatusFilter === 'active' ? 'ALL' : 'active'"
      >
        <CardContent class="p-4 flex items-center justify-between">
          <div class="space-y-0.5 min-w-0">
            <p class="text-xs font-medium text-muted-foreground truncate">Active Now</p>
            <p class="text-2xl font-bold tracking-tight font-mono text-emerald-600 dark:text-emerald-400">
              {{ statsSummary.active.toLocaleString() }}
            </p>
            <p class="text-[11px] text-muted-foreground truncate">
              Currently checked in
            </p>
          </div>
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Clock class="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      <!-- 3. Completed Sessions -->
      <Card
        class="border shadow-xs bg-card/60 backdrop-blur-xs hover:border-blue-500/40 transition-all cursor-pointer"
        :class="selectedStatusFilter === 'completed' ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-sm' : ''"
        @click="selectedStatusFilter = selectedStatusFilter === 'completed' ? 'ALL' : 'completed'"
      >
        <CardContent class="p-4 flex items-center justify-between">
          <div class="space-y-0.5 min-w-0">
            <p class="text-xs font-medium text-muted-foreground truncate">Completed</p>
            <p class="text-2xl font-bold tracking-tight font-mono text-blue-600 dark:text-blue-400">
              {{ statsSummary.completed.toLocaleString() }}
            </p>
            <p class="text-[11px] text-muted-foreground truncate">
              Checked-out logs
            </p>
          </div>
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <CheckCircle2 class="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      <!-- 4. Walk-in Clients -->
      <Card
        class="border shadow-xs bg-card/60 backdrop-blur-xs hover:border-amber-500/40 transition-all cursor-pointer"
        :class="selectedTypeFilter === 'walkin' ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-sm' : ''"
        @click="selectedTypeFilter = selectedTypeFilter === 'walkin' ? 'ALL' : 'walkin'"
      >
        <CardContent class="p-4 flex items-center justify-between">
          <div class="space-y-0.5 min-w-0">
            <p class="text-xs font-medium text-muted-foreground truncate">Walk-in Clients</p>
            <p class="text-2xl font-bold tracking-tight font-mono text-amber-600 dark:text-amber-400">
              {{ statsSummary.walkinCount.toLocaleString() }}
            </p>
            <p class="text-[11px] text-muted-foreground truncate">
              Public service walk-ins
            </p>
          </div>
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <UserCheck class="h-5 w-5" />
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
              Attendance Records
            </CardTitle>
            <CardDescription class="text-xs">
              Showing {{ filteredAttendances.length }} of {{ attendances.length }} total attendance records
            </CardDescription>
          </div>
        </div>

        <!-- ─── Search & Multi-Filter Bar ─── -->
        <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <!-- Search input -->
          <div class="sm:col-span-2 relative">
            <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              v-model="searchQuery"
              placeholder="Search by name, contact, purpose..."
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

          <!-- Type Filter -->
          <div>
            <select
              v-model="selectedTypeFilter"
              class="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="ALL">All Types</option>
              <option value="registered">Registered Personnel</option>
              <option value="walkin">Walk-in Clients</option>
            </select>
          </div>

          <!-- Status Filter -->
          <div>
            <select
              v-model="selectedStatusFilter"
              class="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="ALL">All Status</option>
              <option value="active">Active (Checked In)</option>
              <option value="completed">Completed (Checked Out)</option>
            </select>
          </div>

          <!-- Category / Classification Filter -->
          <div>
            <select
              v-model="selectedCategoryFilter"
              class="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="ALL">All Categories</option>
              <option v-for="cat in availableCategories" :key="cat" :value="cat">
                {{ cat }}
              </option>
            </select>
          </div>

          <!-- Date Preset Filter -->
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
        <!-- ─── Table ─── -->
        <div class="relative overflow-x-auto border-t">
          <Table>
            <TableHeader class="bg-muted/40">
              <TableRow>
                <TableHead class="w-64 text-xs font-semibold">Personnel / Client</TableHead>
                <TableHead class="text-xs font-semibold">Type & Classification</TableHead>
                <TableHead class="text-xs font-semibold">Date</TableHead>
                <TableHead class="text-xs font-semibold">Time In</TableHead>
                <TableHead class="text-xs font-semibold">Time Out</TableHead>
                <TableHead class="text-xs font-semibold">Duration</TableHead>
                <TableHead class="text-xs font-semibold">Status</TableHead>
                <TableHead class="text-right text-xs font-semibold">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <!-- Loading State -->
              <template v-if="isLoading">
                <TableRow>
                  <TableCell colspan="8" class="h-44 text-center text-muted-foreground">
                    <div class="flex flex-col items-center justify-center gap-2 py-6">
                      <Loader2 class="h-8 w-8 animate-spin text-primary" />
                      <p class="text-xs text-muted-foreground">Loading attendance records...</p>
                    </div>
                  </TableCell>
                </TableRow>
              </template>

              <!-- Data Rows -->
              <template v-else-if="paginatedAttendances.length > 0">
                <TableRow
                  v-for="record in paginatedAttendances"
                  :key="record.id"
                  class="transition-colors hover:bg-muted/30"
                >
                  <!-- Personnel / Client Profile -->
                  <TableCell class="py-3">
                    <div class="flex items-center gap-3">
                      <Avatar class="h-8 w-8 text-xs shrink-0 font-medium">
                        <AvatarFallback class="bg-primary/10 text-primary">
                          {{ getInitials(record.fullName) }}
                        </AvatarFallback>
                      </Avatar>
                      <div class="flex flex-col min-w-0">
                        <span class="font-semibold text-xs sm:text-sm text-foreground truncate">
                          {{ record.fullName }}
                        </span>
                        <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
                          <Phone v-if="record.contactNumber" class="h-3 w-3 shrink-0" />
                          <span class="font-mono truncate">
                            {{ record.contactNumber || record.email || 'No contact specified' }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  <!-- Type & Classification -->
                  <TableCell class="py-3">
                    <div class="flex flex-col gap-1 items-start">
                      <Badge
                        variant="outline"
                        :class="[getTypeBadgeClass(record.attendanceType), 'text-[11px] font-medium']"
                      >
                        {{ record.attendanceType === 'registered' ? 'Registered' : 'Walk-in' }}
                      </Badge>
                      <span class="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">
                        {{ formatClassificationLabel(record) }}
                      </span>
                    </div>
                  </TableCell>

                  <!-- Date -->
                  <TableCell class="py-3">
                    <div class="flex items-center gap-1.5 text-xs text-foreground">
                      <Calendar class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span>{{ formatDateDisplay(record.checkIn) }}</span>
                    </div>
                  </TableCell>

                  <!-- Time In -->
                  <TableCell class="py-3">
                    <div class="flex items-center gap-1.5 text-xs font-mono font-medium text-foreground">
                      <span class="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                      <span>{{ formatTimeDisplay(record.checkIn) }}</span>
                    </div>
                  </TableCell>

                  <!-- Time Out -->
                  <TableCell class="py-3">
                    <div v-if="record.checkOut" class="flex items-center gap-1.5 text-xs font-mono font-medium text-foreground">
                      <span class="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0"></span>
                      <span>{{ formatTimeDisplay(record.checkOut) }}</span>
                    </div>
                    <div v-else class="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      <span class="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                      <span>In Session</span>
                    </div>
                  </TableCell>

                  <!-- Duration -->
                  <TableCell class="py-3">
                    <span class="text-xs font-mono text-muted-foreground">
                      {{ calculateDurationDisplay(record.checkIn, record.checkOut) }}
                    </span>
                  </TableCell>

                  <!-- Status -->
                  <TableCell class="py-3">
                    <Badge
                      :variant="getStatusBadgeVariant(record.status)"
                      :class="[getStatusBadgeClass(record.status), 'text-[11px] capitalize gap-1']"
                    >
                      <span
                        class="h-1.5 w-1.5 rounded-full shrink-0"
                        :class="record.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500'"
                      ></span>
                      {{ record.status === 'active' ? 'Checked In' : 'Completed' }}
                    </Badge>
                  </TableCell>

                  <!-- Actions -->
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

              <!-- Empty State -->
              <TableRow v-else>
                <TableCell colspan="8" class="h-44 text-center text-muted-foreground">
                  <div class="flex flex-col items-center justify-center gap-2 py-6">
                    <Filter class="h-8 w-8 text-muted-foreground/50" />
                    <p class="text-sm font-semibold text-foreground">
                      {{ attendances.length === 0 ? 'No attendance records found' : 'No matching attendance records' }}
                    </p>
                    <p class="text-xs text-muted-foreground max-w-sm">
                      {{ attendances.length === 0
                        ? 'Attendance logs will appear here when personnel and clients check in.'
                        : 'Try adjusting your search query or filter options.'
                      }}
                    </p>
                    <Button
                      v-if="attendances.length > 0"
                      size="sm"
                      variant="outline"
                      class="mt-2 text-xs cursor-pointer"
                      @click="resetFilters"
                    >
                      Clear Filters
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <!-- ─── Table Pagination Footer ─── -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t text-xs text-muted-foreground">
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
            Attendance Record Details
          </DialogTitle>
          <DialogDescription class="text-xs">
            Complete information and verification for this attendance entry.
          </DialogDescription>
        </DialogHeader>

        <div v-if="selectedRecord" class="space-y-4 py-2 text-xs">
          <!-- Personnel / Client Card -->
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
                  :class="getTypeBadgeClass(selectedRecord.attendanceType)"
                  class="text-[10px]"
                >
                  {{ selectedRecord.attendanceType === 'registered' ? 'Registered User' : 'Walk-in Client' }}
                </Badge>
              </div>
              <p class="text-muted-foreground text-[11px]">
                Classification: <span class="font-semibold text-foreground uppercase">{{ formatClassificationLabel(selectedRecord) }}</span>
              </p>
            </div>
          </div>

          <!-- Key Details Grid -->
          <div class="grid grid-cols-2 gap-3 p-3 rounded-lg border bg-card">
            <div>
              <p class="text-[11px] text-muted-foreground">Session Status</p>
              <Badge
                :variant="getStatusBadgeVariant(selectedRecord.status)"
                :class="[getStatusBadgeClass(selectedRecord.status), 'mt-1 text-[11px] capitalize']"
              >
                {{ selectedRecord.status === 'active' ? 'Active (Checked In)' : 'Completed' }}
              </Badge>
            </div>
            <div>
              <p class="text-[11px] text-muted-foreground">Total Duration</p>
              <p class="font-medium font-mono text-foreground mt-1">
                {{ calculateDurationDisplay(selectedRecord.checkIn, selectedRecord.checkOut) }}
              </p>
            </div>
            <div>
              <p class="text-[11px] text-muted-foreground">Check-in Timestamp</p>
              <p class="font-medium text-foreground mt-0.5">
                {{ formatDateTimeDisplay(selectedRecord.checkIn) }}
              </p>
            </div>
            <div>
              <p class="text-[11px] text-muted-foreground">Check-out Timestamp</p>
              <p class="font-medium text-foreground mt-0.5">
                {{ selectedRecord.checkOut ? formatDateTimeDisplay(selectedRecord.checkOut) : 'Currently active' }}
              </p>
            </div>
          </div>

          <!-- Contact & Location Info -->
          <div class="space-y-2 p-3 rounded-lg border bg-card">
            <p class="font-semibold text-foreground">Additional Information</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-muted-foreground">
              <div>
                <span class="text-[11px]">Contact Number:</span>
                <p class="font-medium text-foreground font-mono">
                  {{ selectedRecord.contactNumber || 'Not provided' }}
                </p>
              </div>
              <div>
                <span class="text-[11px]">Email / Account:</span>
                <p class="font-medium text-foreground truncate">
                  {{ selectedRecord.email || 'N/A' }}
                </p>
              </div>
              <div v-if="selectedRecord.address?.fullAddress" class="sm:col-span-2">
                <span class="text-[11px]">Address:</span>
                <p class="font-medium text-foreground flex items-center gap-1 mt-0.5">
                  <MapPin class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>{{ selectedRecord.address.fullAddress }}</span>
                </p>
              </div>
              <div class="sm:col-span-2 text-[10px] text-muted-foreground/80 font-mono pt-1 border-t">
                Record ID: {{ selectedRecord.id }}
              </div>
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