<script setup lang="ts">
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CalendarDays,
  ClipboardList,
  Clock,
  FileText,
  Loader2,
  RefreshCw,
  Sparkles,
} from '@lucide/vue'
import SwipeRow from '@/components/vuebits/SwipeRow.vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useMyDashboard } from '@/composables/beneficiary/useMyDashboard'

// Read-only overview of the user's own data: no selection or delete (DESIGN.md §11.1 exemption).
const {
  todayLabel,
  greeting,
  officeLabel,
  isLoading,
  hasLoaded,
  loadError,
  fetchDashboard,
  todayRecord,
  todayPunches,
  todayNotice,
  statCards,
  monthLabel,
  monthReport,
  openReport,
  upcomingDays,
  recentRecords,
  recordPunches,
  openAttendance,
  openDtr,
  formatDisplayDateLong,
  getWeekdayShort,
  formatPunchStatusLabel,
  getPunchStatusBadgeClass,
  getReportStatusBadgeClass,
} = useMyDashboard()

const badgeClass = 'text-[10px] font-mono capitalize px-1.5 py-0 h-4'
const punchHeaders = ['AM In', 'AM Out', 'PM In', 'PM Out']
</script>

<template>
  <div class="flex flex-col gap-6 pb-12">
    <!-- ─── Header ─── -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="space-y-1">
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl text-foreground">{{ greeting }}</h1>
        <p class="text-sm text-muted-foreground">
          Today is <span class="font-medium text-foreground">{{ todayLabel }}</span>.
        </p>
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
          @click="fetchDashboard"
        >
          <RefreshCw :class="['h-3.5 w-3.5', isLoading && 'animate-spin']" />
          <span>Refresh</span>
        </Button>
      </div>
    </div>

    <!-- ─── Error ─── -->
    <div
      v-if="loadError"
      class="flex items-center justify-between gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive"
    >
      <span class="flex items-center gap-2"><AlertCircle class="h-4 w-4 shrink-0" />{{ loadError }}</span>
      <Button variant="outline" size="sm" class="h-7 text-xs cursor-pointer" @click="fetchDashboard">Retry</Button>
    </div>

    <!-- ─── First load ─── -->
    <div v-if="isLoading && !hasLoaded" class="flex flex-col items-center justify-center gap-2 py-24">
      <Loader2 class="h-8 w-8 animate-spin text-primary" />
      <p class="text-xs text-muted-foreground">Loading your dashboard...</p>
    </div>

    <template v-else-if="hasLoaded">
      <!-- ─── Today + Report ─── -->
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <!-- Today -->
        <Card class="border shadow-xs lg:col-span-2">
          <CardHeader class="pb-3">
            <div class="flex items-start justify-between gap-3">
              <div>
                <CardTitle class="flex items-center gap-2 text-base font-semibold">
                  <Clock class="h-4 w-4 text-muted-foreground" />
                  Today's Attendance
                </CardTitle>
                <CardDescription class="text-xs">
                  {{ todayRecord ? 'Your punches recorded at the kiosk today.' : 'No punch recorded yet today.' }}
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" class="h-8 gap-1 text-xs cursor-pointer" @click="openAttendance">
                <span>My Attendance</span>
                <ArrowRight class="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent class="space-y-3">
            <div
              v-if="todayNotice"
              class="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs"
            >
              <Sparkles class="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <div class="min-w-0">
                <p class="font-semibold text-foreground">
                  {{ todayNotice.label }}<template v-if="todayNotice.isOffice"> · whole office</template>
                </p>
                <p v-if="todayNotice.note" class="text-muted-foreground">{{ todayNotice.note }}</p>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div v-for="punch in todayPunches" :key="punch.key" class="rounded-lg border bg-muted/20 p-3">
                <p class="text-[11px] font-medium text-muted-foreground">{{ punch.label }}</p>
                <p class="mt-1 font-mono text-lg font-semibold" :class="punch.time ? 'text-foreground' : 'text-muted-foreground/60'">
                  {{ punch.time ?? '—' }}
                </p>
                <Badge
                  v-if="punch.status"
                  variant="outline"
                  :class="[getPunchStatusBadgeClass(punch.status), badgeClass, 'mt-1']"
                >
                  {{ formatPunchStatusLabel(punch.status) }}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- This month's accomplishment report -->
        <Card class="border shadow-xs">
          <CardHeader class="pb-3">
            <CardTitle class="flex items-center gap-2 text-base font-semibold">
              <ClipboardList class="h-4 w-4 text-muted-foreground" />
              Accomplishment Report
            </CardTitle>
            <CardDescription class="text-xs">{{ monthLabel }}</CardDescription>
          </CardHeader>
          <CardContent class="space-y-3">
            <template v-if="monthReport">
              <div class="flex items-center justify-between gap-2">
                <span class="text-xs text-muted-foreground">Status</span>
                <Badge variant="outline" :class="[getReportStatusBadgeClass(monthReport.status), 'text-[11px]']">
                  {{ monthReport.status }}
                </Badge>
              </div>
              <p class="text-xs text-muted-foreground">
                {{ formatDisplayDateLong(monthReport.periodStart) }} to {{ formatDisplayDateLong(monthReport.periodEnd) }}
              </p>
              <p
                v-if="monthReport.status === 'Returned' && monthReport.reviewRemarks"
                class="rounded-md border border-destructive/20 bg-destructive/5 p-2.5 text-xs text-foreground"
              >
                <span class="font-semibold">Remarks:</span> {{ monthReport.reviewRemarks }}
              </p>
            </template>
            <p v-else class="text-xs text-muted-foreground">You haven't started this month's report yet.</p>

            <Button size="sm" class="w-full gap-1.5 text-xs cursor-pointer" @click="openReport">
              <span>{{ monthReport ? (monthReport.status === 'Draft' || monthReport.status === 'Returned' ? 'Continue report' : 'View report') : 'Start report' }}</span>
              <ArrowRight class="h-3.5 w-3.5" />
            </Button>
          </CardContent>
        </Card>
      </div>

      <!-- ─── This month ─── -->
      <div class="space-y-2">
        <h2 class="text-sm font-semibold text-foreground">This month · {{ monthLabel }}</h2>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Card v-for="stat in statCards" :key="stat.key" class="border shadow-xs bg-card/60">
            <CardContent class="space-y-0.5 p-4">
              <p class="truncate text-xs font-medium text-muted-foreground">{{ stat.label }}</p>
              <p class="font-mono text-2xl font-bold tracking-tight" :class="stat.valueClass">{{ stat.value }}</p>
              <p class="truncate text-[11px] text-muted-foreground">{{ stat.hint }}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <!-- ─── Recent + Coming up ─── -->
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <!-- Recent attendance -->
        <Card class="border shadow-xs lg:col-span-2">
          <CardHeader class="pb-3">
            <div class="flex items-start justify-between gap-3">
              <div>
                <CardTitle class="text-base font-semibold">Recent Attendance</CardTitle>
                <CardDescription class="text-xs">Your latest daily time records.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" class="h-8 gap-1 text-xs cursor-pointer" @click="openDtr">
                <FileText class="h-3.5 w-3.5" />
                <span>My DTR</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent class="p-0">
            <!-- Mobile: swipe rows (DESIGN.md §11.2); read-only, so no actions -->
            <div class="divide-y border-t md:hidden">
              <template v-if="recentRecords.length > 0">
                <SwipeRow v-for="record in recentRecords" :key="record.id" :label="formatDisplayDateLong(record.attendanceDate)">
                  <div class="min-w-0 flex-1 space-y-1">
                    <p class="text-sm font-semibold text-foreground">
                      {{ formatDisplayDateLong(record.attendanceDate) }}
                      <span class="text-xs font-normal text-muted-foreground">· {{ getWeekdayShort(record.attendanceDate) }}</span>
                    </p>
                    <div class="grid grid-cols-4 gap-1 font-mono text-[11px]">
                      <span v-for="cell in recordPunches(record)" :key="cell.key" class="truncate">
                        <template v-if="cell.time">{{ cell.time }}</template>
                        <span v-else-if="cell.status === 'absent'" class="text-destructive">Absent</span>
                        <span v-else class="text-muted-foreground/60">—</span>
                      </span>
                    </div>
                  </div>
                </SwipeRow>
              </template>
              <p v-else class="py-10 text-center text-xs text-muted-foreground">No attendance records yet.</p>
            </div>

            <!-- Desktop table -->
            <div class="hidden overflow-x-auto border-t md:block">
              <Table>
                <TableHeader class="bg-muted/40">
                  <TableRow>
                    <TableHead class="min-w-44 text-xs font-semibold">Date</TableHead>
                    <TableHead v-for="header in punchHeaders" :key="header" class="min-w-24 text-xs font-semibold">
                      {{ header }}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <template v-if="recentRecords.length > 0">
                    <TableRow v-for="record in recentRecords" :key="record.id" class="hover:bg-muted/30">
                      <TableCell class="py-2.5">
                        <div class="flex flex-col">
                          <span class="text-xs font-semibold text-foreground">{{ formatDisplayDateLong(record.attendanceDate) }}</span>
                          <span class="text-[11px] text-muted-foreground">{{ getWeekdayShort(record.attendanceDate) }}</span>
                        </div>
                      </TableCell>
                      <TableCell v-for="cell in recordPunches(record)" :key="cell.key" class="py-2.5">
                        <div v-if="cell.time" class="flex flex-col items-start gap-1">
                          <span class="font-mono text-xs text-foreground">{{ cell.time }}</span>
                          <Badge v-if="cell.status" variant="outline" :class="[getPunchStatusBadgeClass(cell.status), badgeClass]">
                            {{ formatPunchStatusLabel(cell.status) }}
                          </Badge>
                        </div>
                        <Badge
                          v-else-if="cell.status === 'absent'"
                          variant="outline"
                          :class="[getPunchStatusBadgeClass('absent'), badgeClass]"
                        >
                          Absent
                        </Badge>
                        <span v-else class="font-mono text-xs text-muted-foreground/60">—</span>
                      </TableCell>
                    </TableRow>
                  </template>
                  <TableRow v-else>
                    <TableCell colspan="5" class="py-10 text-center text-xs text-muted-foreground">
                      No attendance records yet.
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <!-- Coming up -->
        <Card class="border shadow-xs">
          <CardHeader class="pb-3">
            <CardTitle class="flex items-center gap-2 text-base font-semibold">
              <CalendarDays class="h-4 w-4 text-muted-foreground" />
              Coming Up
            </CardTitle>
            <CardDescription class="text-xs">Holidays and special days in the next 30 days.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul v-if="upcomingDays.length > 0" class="divide-y">
              <li v-for="day in upcomingDays" :key="`${day.kind}-${day.date}`" class="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                <div class="w-12 shrink-0 rounded-md border bg-muted/30 py-1 text-center">
                  <p class="text-[10px] font-medium uppercase text-muted-foreground">{{ getWeekdayShort(day.date) }}</p>
                  <p class="font-mono text-sm font-bold text-foreground">{{ Number(day.date.slice(8)) }}</p>
                </div>
                <div class="min-w-0">
                  <p class="truncate text-xs font-semibold text-foreground">{{ day.label }}</p>
                  <p class="text-[11px] text-muted-foreground">{{ formatDisplayDateLong(day.date) }}</p>
                  <p v-if="day.note" class="truncate text-[11px] text-muted-foreground">{{ day.note }}</p>
                </div>
                <Badge variant="outline" class="ml-auto shrink-0 text-[10px]">
                  {{ day.kind === 'holiday' ? 'Holiday' : 'Special' }}
                </Badge>
              </li>
            </ul>
            <p v-else class="py-6 text-center text-xs text-muted-foreground">Nothing coming up.</p>
          </CardContent>
        </Card>
      </div>
    </template>
  </div>
</template>
