<script setup lang="ts">
import { CalendarDays, PieChart as PieChartIcon, RefreshCw, Users } from '@lucide/vue'
import { Bar, Doughnut, Line, Pie } from 'vue-chartjs'
import { useDashboardCharts } from '@/composables/peso/useDashboardCharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

const {
  isLoading,
  isRefreshing,
  refreshAll,
  clientsTodayCount,
  totalAttendanceLogs,
  activePersonnelCount,
  onTimeRate,
  onTimeRateBarWidth,
  attendanceStatusDistribution,
  clientPurposeDistribution,
  genderDistribution,
  purposeLegendItems,
  togglePurposeVisibility,
  attendanceStatusChartData,
  clientPurposeChartData,
  weeklyAttendanceChartData,
  weeklyClientChartData,
  personnelPositionChartData,
  genderChartData,
  doughnutOptions,
  pieOptions,
  lineChartOptions,
  barChartOptions,
  hasData,
} = useDashboardCharts()
</script>

<template>
  <div class="space-y-6 pb-12">
    <!-- Header Section -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="space-y-1">
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
          Analytics Dashboard
        </h1>
        <p class="text-sm text-muted-foreground">
          Real-time metrics, attendance performance, and walk-in client analytics
        </p>
      </div>

      <div class="flex items-center gap-2 self-start sm:self-auto">
        <Button
          variant="outline"
          size="sm"
          class="gap-2 cursor-pointer transition-all active:scale-95"
          :disabled="isLoading || isRefreshing"
          @click="refreshAll"
        >
          <RefreshCw
            class="h-4 w-4"
            :class="{ 'animate-spin': isRefreshing || isLoading }"
          />
          <span>Refresh</span>
        </Button>
      </div>
    </div>

    <!-- ─── Row 1: KPI Summary Cards ─── -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <!-- Card 1: Clients Checked In Today -->
      <Card class="relative overflow-hidden border shadow-xs transition-all hover:shadow-md hover:border-primary/30">
        <CardHeader class="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Clients Today
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div v-if="isLoading" class="space-y-2">
            <Skeleton class="h-8 w-20" />
            <Skeleton class="h-3.5 w-32" />
          </div>
          <div v-else>
            <div class="text-3xl font-bold tracking-tight text-foreground">
              {{ clientsTodayCount }}
            </div>
            <p class="mt-1 text-xs text-muted-foreground flex items-center gap-1">
              <span>Walk-in visitors checked in today</span>
            </p>
          </div>
        </CardContent>
      </Card>

      <!-- Card 2: Total Attendance Logs -->
      <Card class="relative overflow-hidden border shadow-xs transition-all hover:shadow-md hover:border-primary/30">
        <CardHeader class="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            DTR Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div v-if="isLoading" class="space-y-2">
            <Skeleton class="h-8 w-20" />
            <Skeleton class="h-3.5 w-32" />
          </div>
          <div v-else>
            <div class="text-3xl font-bold tracking-tight text-foreground">
              {{ totalAttendanceLogs }}
            </div>
            <p class="mt-1 text-xs text-muted-foreground flex items-center gap-1">
              <span>Total recorded punch logs</span>
            </p>
          </div>
        </CardContent>
      </Card>

      <!-- Card 3: Active Personnel -->
      <Card class="relative overflow-hidden border shadow-xs transition-all hover:shadow-md hover:border-primary/30">
        <CardHeader class="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Active Personnel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div v-if="isLoading" class="space-y-2">
            <Skeleton class="h-8 w-20" />
            <Skeleton class="h-3.5 w-32" />
          </div>
          <div v-else>
            <div class="text-3xl font-bold tracking-tight text-foreground">
              {{ activePersonnelCount }}
            </div>
            <p class="mt-1 text-xs text-muted-foreground flex items-center gap-1">
              <span>Active staff and registered trainees</span>
            </p>
          </div>
        </CardContent>
      </Card>

      <!-- Card 4: On-Time Rate -->
      <Card class="relative overflow-hidden border shadow-xs transition-all hover:shadow-md hover:border-primary/30">
        <CardHeader class="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            On-Time Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div v-if="isLoading" class="space-y-2">
            <Skeleton class="h-8 w-20" />
            <Skeleton class="h-3.5 w-32" />
          </div>
          <div v-else>
            <div class="text-3xl font-bold tracking-tight text-foreground">
              {{ onTimeRate }}%
            </div>
            <div class="mt-1 flex items-center gap-2">
              <div class="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :class="onTimeRate >= 80 ? 'bg-emerald-500' : onTimeRate >= 60 ? 'bg-amber-500' : 'bg-rose-500'"
                  :style="{ width: onTimeRateBarWidth }"
                ></div>
              </div>
              <span class="text-xs text-muted-foreground whitespace-nowrap">Punctuality</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- ─── Row 2: Charts - Attendance Status & Purpose Breakdown ─── -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <!-- Attendance Status (Doughnut) -->
      <Card class="border shadow-xs">
        <CardHeader class="pb-2">
          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <CardTitle class="text-base font-semibold flex items-center gap-2">
                Attendance Status Distribution
              </CardTitle>
              <CardDescription>
                Punctuality breakdown for recorded employee and staff logs
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div v-if="isLoading" class="flex flex-col items-center justify-center h-64 gap-3">
            <Skeleton class="h-44 w-44 rounded-full" />
            <Skeleton class="h-4 w-48" />
          </div>
          <div v-else>
            <div
              v-if="hasData([attendanceStatusDistribution.ontime, attendanceStatusDistribution.late, attendanceStatusDistribution.earlyOut, attendanceStatusDistribution.absent])"
              class="relative h-64 w-full flex items-center justify-center"
            >
              <Doughnut
                :data="attendanceStatusChartData"
                :options="doughnutOptions"
              />
            </div>
            <div
              v-else
              class="h-64 flex flex-col items-center justify-center text-center text-muted-foreground space-y-2"
            >
              <PieChartIcon class="h-10 w-10 stroke-1 opacity-40" />
              <p class="text-sm font-medium">No attendance records logged yet</p>
              <p class="text-xs text-muted-foreground/70">Attendance punch logs will be summarized here</p>
            </div>

            <!-- Detailed Stat Pills -->
            <div class="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t">
              <div class="rounded-lg bg-emerald-500/10 p-2.5 text-center border border-emerald-500/20">
                <div class="flex items-center justify-center gap-1.5 mb-1">
                  <span class="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                  <span class="text-xs text-muted-foreground font-medium">On-Time</span>
                </div>
                <p class="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {{ attendanceStatusDistribution.ontime }}
                </p>
              </div>
              <div class="rounded-lg bg-amber-500/10 p-2.5 text-center border border-amber-500/20">
                <div class="flex items-center justify-center gap-1.5 mb-1">
                  <span class="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                  <span class="text-xs text-muted-foreground font-medium">Late</span>
                </div>
                <p class="text-lg font-bold text-amber-600 dark:text-amber-400">
                  {{ attendanceStatusDistribution.late }}
                </p>
              </div>
              <div class="rounded-lg bg-rose-500/10 p-2.5 text-center border border-rose-500/20">
                <div class="flex items-center justify-center gap-1.5 mb-1">
                  <span class="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                  <span class="text-xs text-muted-foreground font-medium">Early Out</span>
                </div>
                <p class="text-lg font-bold text-rose-600 dark:text-rose-400">
                  {{ attendanceStatusDistribution.earlyOut }}
                </p>
              </div>
              <div class="rounded-lg bg-slate-500/10 p-2.5 text-center border border-slate-500/20">
                <div class="flex items-center justify-center gap-1.5 mb-1">
                  <span class="h-2 w-2 rounded-full bg-slate-500 shrink-0" />
                  <span class="text-xs text-muted-foreground font-medium">Absent</span>
                </div>
                <p class="text-lg font-bold text-slate-600 dark:text-slate-400">
                  {{ attendanceStatusDistribution.absent }}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Client Visit Purpose (Pie Chart) -->
      <Card class="border shadow-xs">
        <CardHeader class="pb-2">
          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <CardTitle class="text-base font-semibold flex items-center gap-2">
                Walk-In Client Purpose Breakdown
              </CardTitle>
              <CardDescription>
                Distribution of client services and PESO program inquiries
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div v-if="isLoading" class="flex flex-col items-center justify-center h-64 gap-3">
            <Skeleton class="h-44 w-44 rounded-full" />
            <Skeleton class="h-4 w-48" />
          </div>
          <div v-else>
            <div
              v-if="hasData(clientPurposeDistribution.data)"
              class="relative h-64 w-full flex items-center justify-center"
            >
              <Pie
                ref="purposePieChart"
                :data="clientPurposeChartData"
                :options="pieOptions"
              />
            </div>
            <div
              v-else
              class="h-64 flex flex-col items-center justify-center text-center text-muted-foreground space-y-2"
            >
              <Briefcase class="h-10 w-10 stroke-1 opacity-40" />
              <p class="text-sm font-medium">No walk-in client records logged yet</p>
              <p class="text-xs text-muted-foreground/70">Client visits will appear once recorded at the kiosk</p>
            </div>

            <!-- Refactored Purpose Breakdown Legend -->
            <div class="mt-4 flex flex-wrap items-center justify-center gap-2 pt-3 border-t">
              <button
                v-for="item in purposeLegendItems"
                :key="item.label"
                type="button"
                class="group inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all duration-150 cursor-pointer select-none"
                :class="[
                  item.hidden
                    ? 'opacity-35 line-through bg-muted/20 border-transparent text-muted-foreground'
                    : item.count > 0
                    ? 'bg-card border-border/80 text-foreground shadow-xs hover:border-primary/50 hover:bg-accent/40 active:scale-95'
                    : 'bg-muted/30 border-transparent text-muted-foreground/80 hover:border-border/50 hover:bg-muted/50 active:scale-95',
                ]"
                :title="`Click to toggle ${item.label} on chart`"
                @click="togglePurposeVisibility(item.index)"
              >
                <!-- Vibrant Solid Color Circle Dot -->
                <span
                  class="h-2.5 w-2.5 rounded-full shrink-0 transition-transform duration-150 group-hover:scale-125"
                  :style="{ backgroundColor: item.color }"
                />
                <!-- Label Description -->
                <span :class="{ 'font-semibold text-foreground': !item.hidden && item.count > 0 }">
                  {{ item.label }}
                </span>
                <!-- Value Count Badge -->
                <span
                  class="inline-flex items-center justify-center rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums"
                  :class="[
                    item.count > 0
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted/60 text-muted-foreground/60',
                  ]"
                >
                  {{ item.count }}
                </span>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- ─── Row 3: Trend Analysis (Weekly Line Graphs) ─── -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <!-- 7-Day Attendance Trend -->
      <Card class="border shadow-xs">
        <CardHeader class="pb-2">
          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <CardTitle class="text-base font-semibold flex items-center gap-2">
                7-Day Attendance Punch Trend
              </CardTitle>
              <CardDescription>
                Daily volume of client visits over the past week
              </CardDescription>
            </div>
            <Badge variant="secondary" class="text-xs gap-1 font-normal">
              <CalendarDays class="h-3 w-3" />
              Past 7 Days
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div v-if="isLoading" class="flex flex-col justify-end h-64 gap-2">
            <Skeleton class="h-full w-full rounded-lg" />
          </div>
          <div v-else>
            <div class="relative h-64 w-full">
              <Line
                :data="weeklyAttendanceChartData"
                :options="lineChartOptions"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- 7-Day Walk-In Client Trend -->
      <Card class="border shadow-xs">
        <CardHeader class="pb-2">
          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <CardTitle class="text-base font-semibold flex items-center gap-2">
                7-Day Walk-In Client Visits Trend
              </CardTitle>
              <CardDescription>
                Daily visitor traffic visiting the PESO office
              </CardDescription>
            </div>
            <Badge variant="secondary" class="text-xs gap-1 font-normal">
              <CalendarDays class="h-3 w-3" />
              Past 7 Days
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div v-if="isLoading" class="flex flex-col justify-end h-64 gap-2">
            <Skeleton class="h-full w-full rounded-lg" />
          </div>
          <div v-else>
            <div class="relative h-64 w-full">
              <Line
                :data="weeklyClientChartData"
                :options="lineChartOptions"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- ─── Row 4: Personnel & Demographic Insights ─── -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <!-- Personnel by Position (Bar Chart) -->
      <Card class="border shadow-xs">
        <CardHeader class="pb-2">
          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <CardTitle class="text-base font-semibold flex items-center gap-2">
                Personnel by Position Classification
              </CardTitle>
              <CardDescription>
                Registered active and inactive profiles by role category
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div v-if="isLoading" class="flex flex-col justify-end h-64 gap-2">
            <Skeleton class="h-full w-full rounded-lg" />
          </div>
          <div v-else>
            <div class="relative h-64 w-full">
              <Bar
                :data="personnelPositionChartData"
                :options="barChartOptions"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Gender Demographics (Doughnut Chart) -->
      <Card class="border shadow-xs">
        <CardHeader class="pb-2">
          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <CardTitle class="text-base font-semibold flex items-center gap-2">
                Walk-In Client Gender Distribution
              </CardTitle>
              <CardDescription>
                Demographic breakdown of visitors utilizing PESO services
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div v-if="isLoading" class="flex flex-col items-center justify-center h-64 gap-3">
            <Skeleton class="h-44 w-44 rounded-full" />
            <Skeleton class="h-4 w-48" />
          </div>
          <div v-else>
            <div
              v-if="hasData([genderDistribution.male, genderDistribution.female, genderDistribution.notSpecified])"
              class="relative h-64 w-full flex items-center justify-center"
            >
              <Doughnut
                :data="genderChartData"
                :options="doughnutOptions"
              />
            </div>
            <div
              v-else
              class="h-64 flex flex-col items-center justify-center text-center text-muted-foreground space-y-2"
            >
              <Users class="h-10 w-10 stroke-1 opacity-40" />
              <p class="text-sm font-medium">No gender demographic data yet</p>
              <p class="text-xs text-muted-foreground/70">Demographics will be calculated as visitors register</p>
            </div>

            <!-- Quick Demographic Stats -->
            <div class="mt-4 grid grid-cols-3 gap-2 pt-3 border-t text-center">
              <div class="rounded-lg bg-blue-500/10 p-2.5 border border-blue-500/20">
                <div class="flex items-center justify-center gap-1.5 mb-1">
                  <span class="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                  <span class="text-xs text-muted-foreground font-medium">Male</span>
                </div>
                <p class="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {{ genderDistribution.male }}
                </p>
              </div>
              <div class="rounded-lg bg-pink-500/10 p-2.5 border border-pink-500/20">
                <div class="flex items-center justify-center gap-1.5 mb-1">
                  <span class="h-2 w-2 rounded-full bg-pink-500 shrink-0" />
                  <span class="text-xs text-muted-foreground font-medium">Female</span>
                </div>
                <p class="text-lg font-bold text-pink-600 dark:text-pink-400">
                  {{ genderDistribution.female }}
                </p>
              </div>
              <div class="rounded-lg bg-slate-500/10 p-2.5 border border-slate-500/20">
                <div class="flex items-center justify-center gap-1.5 mb-1">
                  <span class="h-2 w-2 rounded-full bg-slate-500 shrink-0" />
                  <span class="text-xs text-muted-foreground font-medium">Other / Unspecified</span>
                </div>
                <p class="text-lg font-bold text-slate-600 dark:text-slate-400">
                  {{ genderDistribution.notSpecified }}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>