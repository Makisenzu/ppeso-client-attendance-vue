<script setup lang="ts">
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, Loader2, Pencil, Search, Sparkles, Users, Wrench, X } from '@lucide/vue'
import SwipeRow from '@/components/vuebits/SwipeRow.vue'
import PersonAvatar from '@/components/common/PersonAvatar.vue'
import EditPunchesDialog from './EditPunchesDialog.vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { useFixDtr } from '@/composables/peso/useFixDtr'
import { formatDisplayDateLong } from '@/helpers/common/dateFormatHelper'
import { formatSpecialDayLabel } from '@/helpers/common/specialDayHelper'
import {
  formatPunchStatusLabel,
  getInitials,
  getPunchStatusBadgeClass,
  getWeekdayShort,
} from '@/helpers/peso/attendanceHelper'

const {
  isLoading,
  loadError,
  loadGips,
  searchQuery,
  clearSearch,
  gips,
  filteredGips,
  paginatedGips,
  currentPage,
  totalPages,
  pageRange,
  prevPage,
  nextPage,
  goBack,
  selectedGip,
  isMonthDialogOpen,
  openMonthDialog,
  closeMonthDialog,
  selectedYear,
  selectedMonth,
  selectedMonthLabel,
  yearOptions,
  monthOptions,
  setYear,
  selectMonth,
  changeMonth,
  days,
  isLoadingMonth,
  monthError,
  loadMonth,
  dayPunches,
  isEditDialogOpen,
  isSavingEdit,
  editError,
  editForm,
  editSlots,
  editDescription,
  specialEnabled,
  specialScope,
  specialType,
  specialNote,
  specialDayOptions,
  isRemovingOfficeSpecialDay,
  openEditDialog,
  closeEditDialog,
  clearEditSlot,
  confirmEdit,
} = useFixDtr()

const punchHeaders = ['AM In', 'AM Out', 'PM In', 'PM Out']
/** Saturdays and Sundays (same raw-palette convention as the punch status badges in attendanceHelper) */
const weekendText = 'text-yellow-600 dark:text-yellow-400'
</script>

<template>
  <div class="flex flex-col gap-6 pb-12">
    <!-- ─── Header ─── -->
    <div class="flex items-start gap-3">
      <Button
        variant="outline"
        size="icon"
        class="h-9 w-9 shrink-0 cursor-pointer"
        title="Back to Attendance Records"
        aria-label="Back to Attendance Records"
        @click="goBack"
      >
        <ArrowLeft class="h-4 w-4" />
      </Button>
      <div class="space-y-1">
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl text-foreground">Fix DTR</h1>
        <p class="text-sm text-muted-foreground">Correct a GIP beneficiary's punches for any date.</p>
      </div>
    </div>

    <!-- ─── GIP Beneficiaries ─── -->
    <Card class="border shadow-xs">
      <CardHeader class="pb-4">
        <CardTitle class="text-lg font-semibold">GIP Beneficiaries</CardTitle>
        <CardDescription class="text-xs">
          Showing {{ filteredGips.length }} of {{ gips.length }} GIP beneficiaries
        </CardDescription>
        <div class="relative mt-4">
          <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input v-model="searchQuery" placeholder="Search by name or office..." class="pl-9 h-9 text-base md:text-xs" />
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
      </CardHeader>

      <CardContent class="p-0">
        <div v-if="loadError" class="flex items-center justify-between gap-2 border-t px-4 py-3 text-xs text-destructive">
          <span>{{ loadError }}</span>
          <Button variant="outline" size="sm" class="h-7 text-xs cursor-pointer" @click="loadGips">Retry</Button>
        </div>

        <!-- Mobile: swipe rows (DESIGN.md §11.2) -->
        <div class="divide-y border-t md:hidden">
          <div v-if="isLoading" class="flex justify-center py-10">
            <Loader2 class="h-6 w-6 animate-spin text-primary" />
          </div>
          <template v-else-if="paginatedGips.length > 0">
            <SwipeRow
              v-for="gip in paginatedGips"
              :key="gip.id"
              :label="gip.fullName"
              :actions="[
                { id: 'edit', label: 'Edit', icon: Pencil, color: 'var(--primary)', textColor: 'var(--primary-foreground)', onSelect: () => openMonthDialog(gip) },
              ]"
            >
              <PersonAvatar
                :path="gip.avatarPath"
                :initials="getInitials(gip.fullName)"
                :alt="gip.fullName"
                class="h-8 w-8 shrink-0 text-xs font-medium"
              />
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-semibold text-foreground">{{ gip.fullName }}</p>
                <p class="truncate text-xs text-muted-foreground">{{ gip.officeName || 'No office assigned' }}</p>
              </div>
            </SwipeRow>
          </template>
          <p v-else class="py-10 text-center text-xs text-muted-foreground">No GIP beneficiaries found.</p>
        </div>

        <!-- Desktop table -->
        <div class="relative hidden overflow-x-auto border-t md:block">
          <Table>
            <TableHeader class="bg-muted/40">
              <TableRow>
                <TableHead class="min-w-60 text-xs font-semibold">Beneficiary</TableHead>
                <TableHead class="min-w-52 text-xs font-semibold">Assigned Office</TableHead>
                <TableHead class="w-28 text-right text-xs font-semibold">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-if="isLoading">
                <TableCell colspan="3" class="h-40 text-center">
                  <div class="flex flex-col items-center justify-center gap-2">
                    <Loader2 class="h-7 w-7 animate-spin text-primary" />
                    <p class="text-xs text-muted-foreground">Loading GIP beneficiaries...</p>
                  </div>
                </TableCell>
              </TableRow>

              <template v-else-if="paginatedGips.length > 0">
                <TableRow v-for="gip in paginatedGips" :key="gip.id" class="hover:bg-muted/30">
                  <TableCell class="py-3">
                    <div class="flex items-center gap-2.5">
                      <PersonAvatar
                        :path="gip.avatarPath"
                        :initials="getInitials(gip.fullName)"
                        :alt="gip.fullName"
                        class="h-8 w-8 shrink-0 text-xs font-medium"
                      />
                      <span class="truncate text-xs font-semibold text-foreground sm:text-sm">{{ gip.fullName }}</span>
                    </div>
                  </TableCell>
                  <TableCell class="py-3">
                    <span v-if="gip.officeName" class="text-xs text-foreground sm:text-sm">{{ gip.officeName }}</span>
                    <span v-else class="text-xs text-muted-foreground">No office assigned</span>
                  </TableCell>
                  <TableCell class="py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      class="h-8 gap-1 text-xs cursor-pointer text-muted-foreground hover:text-foreground"
                      title="Fix this beneficiary's DTR"
                      @click="openMonthDialog(gip)"
                    >
                      <Pencil class="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </Button>
                  </TableCell>
                </TableRow>
              </template>

              <TableRow v-else>
                <TableCell colspan="3" class="p-8">
                  <Empty class="border-0">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Users class="h-10 w-10 text-muted-foreground/60" />
                      </EmptyMedia>
                      <EmptyTitle class="text-sm font-semibold">No GIP beneficiaries found</EmptyTitle>
                      <EmptyDescription class="text-xs text-muted-foreground">
                        {{ searchQuery ? 'No one matches your search.' : 'There are no GIP beneficiaries yet.' }}
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <!-- Pagination -->
        <div
          v-if="filteredGips.length > 0"
          class="flex flex-col items-center justify-between gap-3 border-t bg-muted/20 px-4 py-3 text-xs text-muted-foreground sm:flex-row"
        >
          <div>
            Showing <span class="font-mono font-medium text-foreground">{{ pageRange.start }}</span>
            to <span class="font-mono font-medium text-foreground">{{ pageRange.end }}</span>
            of <span class="font-mono font-medium text-foreground">{{ filteredGips.length }}</span> entries
          </div>
          <div class="flex items-center gap-2">
            <span class="font-mono">Page {{ currentPage }} of {{ totalPages }}</span>
            <Button variant="outline" size="icon" class="h-7 w-7 cursor-pointer" :disabled="currentPage <= 1" aria-label="Previous page" @click="prevPage">
              <ChevronLeft class="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="icon" class="h-7 w-7 cursor-pointer" :disabled="currentPage >= totalPages" aria-label="Next page" @click="nextPage">
              <ChevronRight class="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- ─── Month view: pick a month, then the month's dates ─── -->
    <Dialog :open="isMonthDialogOpen" @update:open="(val) => (!val ? closeMonthDialog() : null)">
      <DialogContent class="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <div class="flex items-center gap-3">
            <PersonAvatar
              v-if="selectedGip"
              :path="selectedGip.avatarPath"
              :initials="getInitials(selectedGip.fullName)"
              :alt="selectedGip.fullName"
              class="h-10 w-10 shrink-0 text-sm font-medium"
            />
            <div class="min-w-0">
              <DialogTitle class="truncate text-base font-semibold text-foreground">
                {{ selectedGip?.fullName }}
              </DialogTitle>
              <DialogDescription class="text-xs text-muted-foreground mt-0.5">
                {{ selectedMonth === null ? 'Choose the month to fix.' : selectedMonthLabel }}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <!-- Step 1: month selection -->
        <div v-if="selectedMonth === null" class="space-y-4">
          <div class="flex items-center gap-2">
            <label for="fix-dtr-year" class="text-xs font-medium text-foreground">Year</label>
            <select
              id="fix-dtr-year"
              :value="selectedYear"
              class="h-9 rounded-md border border-input bg-background px-3 text-base md:text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              @change="setYear(Number(($event.target as HTMLSelectElement).value))"
            >
              <option v-for="year in yearOptions" :key="year" :value="year">{{ year }}</option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Button
              v-for="month in monthOptions"
              :key="month.index"
              variant="outline"
              class="h-11 justify-start gap-2 text-xs cursor-pointer"
              :disabled="month.disabled"
              @click="selectMonth(month.index)"
            >
              <CalendarDays class="h-3.5 w-3.5 text-muted-foreground" />
              {{ month.name }}
            </Button>
          </div>
        </div>

        <!-- Step 2: the month's dates -->
        <div v-else class="space-y-3">
          <div class="flex items-center justify-between gap-2">
            <Button variant="outline" size="sm" class="gap-1.5 text-xs cursor-pointer" @click="changeMonth">
              <ChevronLeft class="h-3.5 w-3.5" />
              <span>Change month</span>
            </Button>
            <p class="text-[11px] text-muted-foreground">Up to today only.</p>
          </div>

          <div v-if="isLoadingMonth" class="flex flex-col items-center justify-center gap-2 py-12">
            <Loader2 class="h-7 w-7 animate-spin text-primary" />
            <p class="text-xs text-muted-foreground">Loading {{ selectedMonthLabel }}...</p>
          </div>

          <div v-else-if="monthError" class="flex items-center justify-between gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
            <span>{{ monthError }}</span>
            <Button variant="outline" size="sm" class="h-7 text-xs cursor-pointer" @click="loadMonth">Retry</Button>
          </div>

          <template v-else>
            <!-- Mobile: swipe rows -->
            <div class="divide-y rounded-lg border md:hidden">
              <SwipeRow
                v-for="day in days"
                :key="day.date"
                :label="formatDisplayDateLong(day.date)"
                :actions="[
                  { id: 'fix', label: 'Fix', icon: Wrench, color: 'var(--primary)', textColor: 'var(--primary-foreground)', onSelect: () => openEditDialog(day) },
                ]"
              >
                <div class="min-w-0 flex-1 space-y-1">
                  <p class="text-sm font-semibold" :class="day.isWeekend ? weekendText : day.holidayName ? 'text-muted-foreground' : 'text-foreground'">
                    {{ formatDisplayDateLong(day.date) }}
                    <span class="text-xs font-normal" :class="day.isWeekend ? weekendText : 'text-muted-foreground'">· {{ getWeekdayShort(day.date) }}</span>
                  </p>
                  <p v-if="day.holidayName" class="truncate text-[11px] text-muted-foreground">{{ day.holidayName }}</p>
                  <Badge
                    v-if="day.specialDay"
                    variant="outline"
                    class="h-5 w-fit gap-1 border-primary/30 bg-primary/10 px-1.5 text-[10px] font-medium text-primary"
                    :title="day.specialDay.note || undefined"
                  >
                    <Sparkles class="h-3 w-3" />
                    {{ formatSpecialDayLabel(day.specialDay.dayType) }}<template v-if="day.specialDay.isOffice"> · Office</template>
                  </Badge>
                  <div class="grid grid-cols-4 gap-1 text-[11px] font-mono">
                    <span v-for="cell in dayPunches(day)" :key="cell.key" class="truncate">
                      <template v-if="cell.time">{{ cell.time }}</template>
                      <template v-else-if="cell.status === 'absent'"><span class="text-destructive">Absent</span></template>
                      <template v-else><span class="text-muted-foreground/60">—</span></template>
                    </span>
                  </div>
                </div>
              </SwipeRow>
            </div>

            <!-- Desktop table -->
            <div class="hidden overflow-x-auto rounded-lg border md:block">
              <Table>
                <TableHeader class="bg-muted/40">
                  <TableRow>
                    <TableHead class="min-w-44 text-xs font-semibold">Date</TableHead>
                    <TableHead v-for="header in punchHeaders" :key="header" class="min-w-24 text-xs font-semibold">
                      {{ header }}
                    </TableHead>
                    <TableHead class="w-20 text-right text-xs font-semibold">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="day in days" :key="day.date" :class="(day.isWeekend || day.holidayName) ? 'bg-muted/20' : 'hover:bg-muted/30'">
                    <TableCell class="py-2.5">
                      <div class="flex flex-col">
                        <span class="text-xs font-semibold" :class="day.isWeekend ? weekendText : day.holidayName ? 'text-muted-foreground' : 'text-foreground'">
                          {{ formatDisplayDateLong(day.date) }}
                        </span>
                        <span class="text-[11px]" :class="day.isWeekend ? weekendText : 'text-muted-foreground'">
                          {{ getWeekdayShort(day.date) }}<template v-if="day.holidayName"> · {{ day.holidayName }}</template>
                        </span>
                        <Badge
                          v-if="day.specialDay"
                          variant="outline"
                          class="mt-1 h-5 w-fit gap-1 border-primary/30 bg-primary/10 px-1.5 text-[10px] font-medium text-primary"
                          :title="day.specialDay.note || undefined"
                        >
                          <Sparkles class="h-3 w-3" />
                          {{ formatSpecialDayLabel(day.specialDay.dayType) }}<template v-if="day.specialDay.isOffice"> · Office</template>
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell v-for="cell in dayPunches(day)" :key="cell.key" class="py-2.5">
                      <div v-if="cell.time" class="flex flex-col items-start gap-1">
                        <span class="font-mono text-xs text-foreground">{{ cell.time }}</span>
                        <Badge
                          v-if="cell.status"
                          variant="outline"
                          :class="[getPunchStatusBadgeClass(cell.status), 'h-4 px-1.5 py-0 text-[10px] font-mono capitalize']"
                        >
                          {{ formatPunchStatusLabel(cell.status) }}
                        </Badge>
                      </div>
                      <Badge
                        v-else-if="cell.status === 'absent'"
                        variant="outline"
                        :class="[getPunchStatusBadgeClass('absent'), 'h-4 px-1.5 py-0 text-[10px] font-mono capitalize']"
                      >
                        Absent
                      </Badge>
                      <span v-else class="font-mono text-xs text-muted-foreground/60">—</span>
                    </TableCell>
                    <TableCell class="py-2.5 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        class="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                        :title="`Fix ${formatDisplayDateLong(day.date)}`"
                        @click="openEditDialog(day)"
                      >
                        <Wrench class="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </template>
        </div>
      </DialogContent>
    </Dialog>

    <!-- ─── Fix one date ─── -->
    <EditPunchesDialog
      v-model:form="editForm"
      :open="isEditDialogOpen"
      :description="editDescription"
      :slots="editSlots"
      :error="editError"
      :saving="isSavingEdit"
      @close="closeEditDialog"
      @save="confirmEdit"
      @clear="clearEditSlot"
    >
      <div class="space-y-3 rounded-lg border bg-muted/20 p-3">
        <label class="flex cursor-pointer items-start gap-2.5">
          <input
            v-model="specialEnabled"
            type="checkbox"
            class="mt-0.5 h-4 w-4 cursor-pointer rounded border-input accent-primary"
            :disabled="isSavingEdit"
          />
          <span class="space-y-0.5">
            <span class="block text-xs font-medium text-foreground">Special day</span>
            <span class="block text-[11px] text-muted-foreground">
              Excused, never counted as absent, and printed on the DTR. Punches stay optional.
            </span>
          </span>
        </label>

        <template v-if="specialEnabled">
          <div class="space-y-1.5">
            <span class="text-xs font-medium text-foreground">Applies to</span>
            <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label
                class="flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-2 text-xs"
                :class="specialScope === 'beneficiary' ? 'border-primary ring-1 ring-primary/30' : 'border-input'"
              >
                <input v-model="specialScope" type="radio" value="beneficiary" class="accent-primary" :disabled="isSavingEdit" />
                <span class="min-w-0 truncate">{{ selectedGip?.fullName || 'This beneficiary' }}</span>
              </label>
              <label
                class="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-xs"
                :class="[
                  specialScope === 'office' ? 'border-primary ring-1 ring-primary/30' : 'border-input',
                  selectedGip?.officeId ? 'cursor-pointer' : 'cursor-not-allowed opacity-50',
                ]"
              >
                <input
                  v-model="specialScope"
                  type="radio"
                  value="office"
                  class="accent-primary"
                  :disabled="isSavingEdit || !selectedGip?.officeId"
                />
                <span class="min-w-0 truncate">Whole office<template v-if="selectedGip?.officeName"> ({{ selectedGip.officeName }})</template></span>
              </label>
            </div>
          </div>

          <div class="space-y-1.5">
            <label for="fix-dtr-special-type" class="text-xs font-medium text-foreground">Type</label>
            <select
              id="fix-dtr-special-type"
              v-model="specialType"
              class="h-9 w-full rounded-md border border-input bg-background px-3 text-base md:text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              :disabled="isSavingEdit"
            >
              <option v-for="option in specialDayOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </div>

          <div class="space-y-1.5">
            <label for="fix-dtr-special-note" class="text-xs font-medium text-foreground">Note <span class="font-normal text-muted-foreground">(optional)</span></label>
            <Input
              id="fix-dtr-special-note"
              v-model="specialNote"
              maxlength="200"
              placeholder="e.g. Provincial job fair"
              class="h-9 text-base md:text-xs"
              :disabled="isSavingEdit"
            />
            <p class="text-[11px] text-muted-foreground">Don't write medical or other sensitive details.</p>
          </div>
        </template>

        <p v-else-if="isRemovingOfficeSpecialDay" class="text-[11px] text-destructive">
          This removes the special day for everyone in the office.
        </p>
      </div>
    </EditPunchesDialog>
  </div>
</template>
