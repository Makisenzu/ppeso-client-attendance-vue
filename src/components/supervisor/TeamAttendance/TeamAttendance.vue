<script setup lang="ts">
import { Building2, Calendar, CalendarX2, Eye, Filter, Loader2, RefreshCw, Search, X } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import SearchSelect from '@/components/common/SearchSelect.vue'
import SwipeRow from '@/components/vuebits/SwipeRow.vue'
import MobileFilters from '@/components/common/MobileFilters.vue'
import { useTeamAttendance } from '@/composables/supervisor/useTeamAttendance'

// Read-only list of the office team's DTRs: no selection or delete (DESIGN.md §11.1 exemption —
// only admins may change attendance records).
const {
  officeLabel,
  hasOffice,
  hasLoaded,
  records,
  filteredRecords,
  paginatedRecords,
  isLoading,
  statsSummary,
  fetchRecords,
  memberFilter,
  memberOptions,
  searchQuery,
  statusFilter,
  dateFilter,
  customDate,
  hasActiveFilters,
  activeMemberLabel,
  activeStatusLabel,
  activeDateLabel,
  resetFilters,
  clearMemberFilter,
  clearSearch,
  clearStatusFilter,
  clearDateFilter,
  clearCustomDate,
  statCards,
  selectStatCard,
  isStatCardActive,
  statusOptions,
  dateOptions,
  pageSizeOptions,
  currentPage,
  pageSizeValue,
  totalPages,
  visiblePages,
  pageRange,
  showFirstPageButton,
  showLeadingEllipsis,
  showTrailingEllipsis,
  showLastPageButton,
  setPage,
  prevPage,
  nextPage,
  selectedRecord,
  isDetailsOpen,
  openDetails,
  onDetailsOpenChange,
  closeDetails,
  punchSlots,
  getPunchCell,
  isRecordAbsent,
  getInitials,
  formatPositionLabel,
  formatAttendanceDate,
  formatPunchStatusLabel,
  getPunchStatusBadgeClass,
} = useTeamAttendance()

const COLUMN_COUNT = 6
const badgeClass = 'text-[10px] font-mono capitalize px-1.5 py-0 h-4'
</script>

<template>
  <div class="flex flex-col gap-6 pb-12">
    <!-- ─── Header ─── -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="space-y-1">
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl text-foreground">Team Attendance</h1>
        <p class="text-sm text-muted-foreground">Daily time records of the beneficiaries in your office.</p>
      </div>
      <div class="flex flex-wrap items-center gap-2 self-start sm:self-auto">
        <Badge v-if="officeLabel" variant="outline" class="gap-1.5 h-8 px-2.5 text-xs font-medium">
          <Building2 class="h-3.5 w-3.5 text-muted-foreground" />
          <span>{{ officeLabel }}</span>
        </Badge>
        <Button
          variant="outline"
          size="sm"
          class="gap-1.5 text-xs cursor-pointer shadow-xs"
          :disabled="isLoading"
          @click="fetchRecords"
        >
          <RefreshCw :class="['h-3.5 w-3.5', isLoading && 'animate-spin']" />
          <span>Refresh</span>
        </Button>
      </div>
    </div>

    <!-- ─── No office assigned ─── -->
    <Card v-if="hasLoaded && !hasOffice" class="border shadow-xs">
      <CardContent>
        <Empty class="border-0 p-6 md:p-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Building2 class="size-5 text-muted-foreground" />
            </EmptyMedia>
            <EmptyTitle>You're not assigned to an office yet</EmptyTitle>
            <EmptyDescription>Ask a PESO admin to set your office in User Management.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </CardContent>
    </Card>

    <template v-else>
      <!-- ─── Stat cards (click to filter) ─── -->
      <div class="hidden md:grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card
          v-for="card in statCards"
          :key="card.key"
          class="border shadow-xs bg-card/60 transition-all cursor-pointer"
          :class="[card.hoverClass, isStatCardActive(card) ? card.activeClass : '']"
          @click="selectStatCard(card)"
        >
          <CardContent class="p-4">
            <div class="space-y-0.5 min-w-0">
              <p class="text-xs font-medium text-muted-foreground truncate">{{ card.label }}</p>
              <p class="text-2xl font-bold tracking-tight font-mono" :class="card.valueClass">
                {{ statsSummary[card.stat].toLocaleString() }}
              </p>
              <p class="text-[11px] text-muted-foreground truncate">{{ card.hint }}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- ─── Records table ─── -->
      <Card class="border shadow-xs">
        <CardHeader class="pb-4">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle class="text-lg font-semibold">Team Attendance Record</CardTitle>
              <CardDescription class="text-xs">
                Showing {{ filteredRecords.length }} of {{ records.length }} total records
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

          <!-- Search & filters -->
          <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div class="relative">
              <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                v-model="searchQuery"
                placeholder="Search by name, date, time, or status..."
                class="pl-9 pr-8 h-9 text-base md:text-xs"
              />
              <button
                v-if="searchQuery"
                type="button"
                class="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label="Clear search"
                @click="clearSearch"
              >
                <X class="h-4 w-4" />
              </button>
            </div>
            <MobileFilters :active="hasActiveFilters">
              <SearchSelect
                v-model="memberFilter"
                :options="memberOptions"
                search-placeholder="Search team members..."
                empty-text="No team members found."
              />
              <SearchSelect v-model="statusFilter" :options="statusOptions" :searchable="false" />
              <SearchSelect v-model="dateFilter" :options="dateOptions" :searchable="false" />
            </MobileFilters>
          </div>

          <!-- Custom date -->
          <div v-if="dateFilter === 'custom'" class="mt-3 flex flex-wrap items-center gap-2">
            <span class="text-xs text-muted-foreground font-medium">Select Date:</span>
            <Input v-model="customDate" type="date" class="h-8 max-w-xs text-base md:text-xs" />
            <Button v-if="customDate" variant="ghost" size="sm" class="h-8 px-2 text-xs" @click="clearCustomDate">
              Clear Date
            </Button>
          </div>

          <!-- Active filter badges -->
          <div v-if="hasActiveFilters" class="mt-3 hidden flex-wrap items-center gap-1.5 pt-2 border-t text-xs md:flex">
            <span class="text-[11px] text-muted-foreground font-medium mr-1">Active filters:</span>
            <Badge v-if="memberFilter !== 'ALL'" variant="secondary" class="gap-1 text-[11px] font-normal py-0.5">
              <span>Member: {{ activeMemberLabel }}</span>
              <button type="button" class="hover:text-foreground cursor-pointer" aria-label="Remove member filter" @click="clearMemberFilter">
                <X class="h-3 w-3" />
              </button>
            </Badge>
            <Badge v-if="searchQuery.trim()" variant="secondary" class="gap-1 text-[11px] font-normal py-0.5">
              <span>Search: "{{ searchQuery }}"</span>
              <button type="button" class="hover:text-foreground cursor-pointer" aria-label="Remove search filter" @click="clearSearch">
                <X class="h-3 w-3" />
              </button>
            </Badge>
            <Badge v-if="statusFilter !== 'ALL'" variant="secondary" class="gap-1 text-[11px] font-normal py-0.5">
              <span>Status: {{ activeStatusLabel }}</span>
              <button type="button" class="hover:text-foreground cursor-pointer" aria-label="Remove status filter" @click="clearStatusFilter">
                <X class="h-3 w-3" />
              </button>
            </Badge>
            <Badge v-if="dateFilter !== 'ALL'" variant="secondary" class="gap-1 text-[11px] font-normal py-0.5">
              <span>Date: {{ activeDateLabel }}</span>
              <button type="button" class="hover:text-foreground cursor-pointer" aria-label="Remove date filter" @click="clearDateFilter">
                <X class="h-3 w-3" />
              </button>
            </Badge>
          </div>
        </CardHeader>

        <CardContent class="p-0">
          <!-- Mobile: swipe rows (DESIGN.md §11.2) -->
          <div class="divide-y border-t md:hidden">
            <div v-if="isLoading" class="flex justify-center py-10">
              <Loader2 class="h-6 w-6 animate-spin text-primary" />
            </div>
            <template v-else-if="paginatedRecords.length > 0">
              <SwipeRow
                v-for="record in paginatedRecords"
                :key="record.id"
                :label="record.fullName"
                :actions="[
                  { id: 'view', label: 'Details', icon: Eye, color: 'var(--primary)', textColor: 'var(--primary-foreground)', onSelect: () => openDetails(record) },
                ]"
              >
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-semibold text-foreground">{{ record.fullName }}</p>
                  <p class="truncate text-xs text-muted-foreground">{{ formatAttendanceDate(record.attendanceDate) }}</p>
                </div>
                <Badge
                  v-if="isRecordAbsent(record)"
                  variant="outline"
                  :class="[getPunchStatusBadgeClass('absent'), 'shrink-0 text-[10px] uppercase']"
                >
                  Absent
                </Badge>
              </SwipeRow>
            </template>
            <p v-else class="py-10 text-center text-xs text-muted-foreground">No attendance records found.</p>
          </div>

          <div class="relative hidden overflow-x-auto border-t md:block">
            <Table>
              <TableHeader class="bg-muted/40">
                <TableRow>
                  <TableHead class="min-w-56 pl-4 text-xs font-semibold">Team Member</TableHead>
                  <TableHead class="min-w-40 text-xs font-semibold">Attendance Date</TableHead>
                  <TableHead v-for="slot in punchSlots" :key="slot.key" class="min-w-28 text-xs font-semibold">
                    {{ slot.label }}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <!-- Loading -->
                <TableRow v-if="isLoading">
                  <TableCell :colspan="COLUMN_COUNT" class="h-44 text-center">
                    <div class="flex flex-col items-center justify-center gap-2 py-6">
                      <Loader2 class="h-8 w-8 animate-spin text-primary" />
                      <p class="text-xs text-muted-foreground">Loading your team's attendance...</p>
                    </div>
                  </TableCell>
                </TableRow>

                <!-- Rows -->
                <template v-else-if="paginatedRecords.length > 0">
                  <TableRow
                    v-for="record in paginatedRecords"
                    :key="record.id"
                    class="transition-colors"
                    :class="isRecordAbsent(record) ? 'bg-destructive/3 hover:bg-destructive/8' : 'hover:bg-muted/30'"
                  >
                    <TableCell class="py-3 pl-4">
                      <div class="flex items-center gap-2.5 min-w-0">
                        <Avatar class="h-8 w-8 text-xs shrink-0 font-medium">
                          <AvatarFallback class="bg-primary/10 text-primary">{{ getInitials(record.fullName) }}</AvatarFallback>
                        </Avatar>
                        <div class="min-w-0">
                          <p class="truncate text-xs font-semibold text-foreground">{{ record.fullName }}</p>
                          <p class="text-[11px] text-muted-foreground">{{ formatPositionLabel(record.position) }}</p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell class="py-3">
                      <div class="flex items-center gap-1.5 text-xs font-medium text-foreground whitespace-nowrap">
                        <Calendar class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>{{ formatAttendanceDate(record.attendanceDate) }}</span>
                      </div>
                    </TableCell>

                    <TableCell v-for="slot in punchSlots" :key="slot.key" class="py-3">
                      <div
                        v-if="getPunchCell(record, slot.key).time || getPunchCell(record, slot.key).status"
                        class="flex flex-col gap-1 items-start"
                      >
                        <span v-if="getPunchCell(record, slot.key).time" class="text-xs font-mono font-medium text-foreground">
                          {{ getPunchCell(record, slot.key).time }}
                        </span>
                        <Badge
                          v-if="getPunchCell(record, slot.key).status"
                          variant="outline"
                          :class="[getPunchStatusBadgeClass(getPunchCell(record, slot.key).status), badgeClass]"
                        >
                          {{ formatPunchStatusLabel(getPunchCell(record, slot.key).status) }}
                        </Badge>
                      </div>
                      <span v-else class="text-muted-foreground/60 text-xs font-mono">—</span>
                    </TableCell>
                  </TableRow>
                </template>

                <!-- Empty -->
                <TableEmpty v-else :colspan="COLUMN_COUNT">
                  <Empty class="border-0 p-6 md:p-8">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <CalendarX2 v-if="records.length === 0" class="size-5 text-muted-foreground" />
                        <Filter v-else class="size-5 text-muted-foreground" />
                      </EmptyMedia>
                      <EmptyTitle>
                        {{ records.length === 0 ? 'No attendance records yet' : 'No matching records' }}
                      </EmptyTitle>
                      <EmptyDescription>
                        {{
                          records.length === 0
                            ? 'Kiosk punches of the beneficiaries in your office will appear here.'
                            : 'No records match your search or filters.'
                        }}
                      </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                      <Button v-if="records.length > 0" size="sm" variant="outline" class="text-xs cursor-pointer" @click="resetFilters">
                        Clear Filters
                      </Button>
                      <Button
                        v-else
                        size="sm"
                        variant="outline"
                        class="gap-1.5 text-xs cursor-pointer"
                        :disabled="isLoading"
                        @click="fetchRecords"
                      >
                        <RefreshCw class="h-3.5 w-3.5" />
                        <span>Refresh</span>
                      </Button>
                    </EmptyContent>
                  </Empty>
                </TableEmpty>
              </TableBody>
            </Table>
          </div>

          <!-- Pagination -->
          <div
            v-if="filteredRecords.length > 0"
            class="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 border-t text-xs text-muted-foreground bg-muted/10"
          >
            <div>
              Showing <span class="font-medium text-foreground">{{ pageRange.start }}</span>
              to <span class="font-medium text-foreground">{{ pageRange.end }}</span>
              of <span class="font-medium text-foreground">{{ filteredRecords.length }}</span> records
            </div>
            <div class="flex items-center gap-2 flex-wrap">
              <div class="flex items-center gap-1.5 mr-2">
                <span class="text-[11px]">Rows:</span>
                <SearchSelect v-model="pageSizeValue" :options="pageSizeOptions" :searchable="false" class="w-20" />
              </div>
              <Button variant="outline" size="sm" class="h-7 text-xs px-2 cursor-pointer" :disabled="currentPage <= 1" @click="prevPage">
                Previous
              </Button>
              <div class="flex items-center gap-1">
                <Button v-if="showFirstPageButton" size="sm" variant="outline" class="h-7 w-7 p-0 text-xs cursor-pointer" @click="setPage(1)">
                  1
                </Button>
                <span v-if="showLeadingEllipsis" class="text-xs px-0.5">...</span>
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
                <span v-if="showTrailingEllipsis" class="text-xs px-0.5">...</span>
                <Button
                  v-if="showLastPageButton"
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
    </template>

    <!-- ─── Details dialog ─── -->
    <Dialog :open="isDetailsOpen" @update:open="onDetailsOpenChange">
      <DialogContent class="max-w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle class="text-base sm:text-lg">Attendance Details</DialogTitle>
          <DialogDescription class="text-xs">
            {{ selectedRecord ? formatAttendanceDate(selectedRecord.attendanceDate) : '' }}
          </DialogDescription>
        </DialogHeader>

        <div v-if="selectedRecord" class="space-y-4 py-2">
          <div class="flex items-center gap-3">
            <Avatar class="h-10 w-10 shrink-0 text-sm font-medium">
              <AvatarFallback class="bg-primary/10 text-primary">{{ getInitials(selectedRecord.fullName) }}</AvatarFallback>
            </Avatar>
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold text-foreground">{{ selectedRecord.fullName }}</p>
              <p class="text-xs text-muted-foreground">{{ formatPositionLabel(selectedRecord.position) }}</p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div v-for="slot in punchSlots" :key="slot.key" class="space-y-1.5 rounded-lg border bg-muted/30 p-3">
              <p class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{{ slot.label }}</p>
              <p
                class="font-mono text-sm font-semibold"
                :class="getPunchCell(selectedRecord, slot.key).time ? 'text-foreground' : 'text-muted-foreground/60'"
              >
                {{ getPunchCell(selectedRecord, slot.key).time || '—' }}
              </p>
              <Badge
                v-if="getPunchCell(selectedRecord, slot.key).status"
                variant="outline"
                :class="[getPunchStatusBadgeClass(getPunchCell(selectedRecord, slot.key).status), badgeClass]"
              >
                {{ formatPunchStatusLabel(getPunchCell(selectedRecord, slot.key).status) }}
              </Badge>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" class="text-xs cursor-pointer w-full sm:w-auto" @click="closeDetails">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
