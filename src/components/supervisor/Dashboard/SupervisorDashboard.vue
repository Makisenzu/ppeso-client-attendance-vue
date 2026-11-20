<script setup lang="ts">
import { AlertCircle, ArrowRight, Building2, ClipboardList, Loader2, RefreshCw, UsersRound } from '@lucide/vue'
import SwipeRow from '@/components/vuebits/SwipeRow.vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { useSupervisorDashboard } from '@/composables/supervisor/useSupervisorDashboard'

// Read-only overview: no selection or delete (DESIGN.md §11.1 exemption — supervisors can't change DTRs).
const {
  officeLabel,
  hasOffice,
  todayLabel,
  todayRows,
  summary,
  pendingReviews,
  isLoading,
  hasLoaded,
  loadError,
  fetchDashboard,
  openTeamAttendance,
  openReviews,
  statCards,
  punchSlots,
  getPunchCell,
  getInitials,
  formatPositionLabel,
  formatTodayStatusLabel,
  getTodayStatusBadgeClass,
  formatPunchStatusLabel,
  getPunchStatusBadgeClass,
} = useSupervisorDashboard()

const COLUMN_COUNT = 6
const badgeClass = 'text-[10px] font-mono capitalize px-1.5 py-0 h-4'
</script>

<template>
  <div class="flex flex-col gap-6 pb-12">
    <!-- ─── Header ─── -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="space-y-1">
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl text-foreground">Dashboard</h1>
        <p class="text-sm text-muted-foreground">
          Your office's attendance for <span class="font-medium text-foreground">{{ todayLabel }}</span>.
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

    <!-- ─── Load error ─── -->
    <div
      v-if="loadError"
      role="alert"
      class="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs font-medium text-destructive"
    >
      <AlertCircle class="h-4 w-4 shrink-0" />
      <span>{{ loadError }}</span>
    </div>

    <!-- ─── No office assigned ─── -->
    <Card v-if="hasLoaded && !hasOffice && !loadError" class="border shadow-xs">
      <CardContent>
        <Empty class="border-0 p-6 md:p-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Building2 class="size-5 text-muted-foreground" />
            </EmptyMedia>
            <EmptyTitle>You're not assigned to an office yet</EmptyTitle>
            <EmptyDescription>
              Ask a PESO admin to set your office in User Management. Your team's attendance will show here after that.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </CardContent>
    </Card>

    <template v-else>
      <!-- ─── Stat cards ─── -->
      <div class="hidden md:grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card v-for="card in statCards" :key="card.key" class="border shadow-xs bg-card/60">
          <CardContent class="p-4">
            <div class="space-y-0.5 min-w-0">
              <p class="text-xs font-medium text-muted-foreground truncate">{{ card.label }}</p>
              <p class="text-2xl font-bold tracking-tight font-mono" :class="card.valueClass">
                {{ isLoading && !hasLoaded ? '—' : summary[card.key].toLocaleString() }}
              </p>
              <p class="text-[11px] text-muted-foreground truncate">{{ card.hint }}</p>
            </div>
          </CardContent>
        </Card>

        <!-- Reports to review: opens the review screen -->
        <Card
          class="col-span-2 lg:col-span-1 border shadow-xs bg-card/60 transition-all cursor-pointer hover:border-primary/40"
          role="link"
          tabindex="0"
          @click="openReviews"
          @keydown.enter="openReviews"
        >
          <CardContent class="p-4">
            <div class="flex items-start justify-between gap-2">
              <div class="space-y-0.5 min-w-0">
                <p class="text-xs font-medium text-muted-foreground truncate">Reports to Review</p>
                <p class="text-2xl font-bold tracking-tight font-mono text-primary">
                  {{ isLoading && !hasLoaded ? '—' : pendingReviews.toLocaleString() }}
                </p>
                <p class="text-[11px] text-muted-foreground truncate">Submitted accomplishments</p>
              </div>
              <ClipboardList class="h-4 w-4 shrink-0 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- ─── Today's attendance ─── -->
      <Card class="border shadow-xs">
        <CardHeader class="pb-4">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle class="text-lg font-semibold">Today's Attendance</CardTitle>
              <CardDescription class="text-xs">
                Active team members and their kiosk punches today. Late arrivals are listed first.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              class="gap-1.5 text-xs cursor-pointer self-start sm:self-auto"
              @click="openTeamAttendance"
            >
              <span>All Team Attendance</span>
              <ArrowRight class="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent class="p-0">
          <!-- Mobile: swipe rows (DESIGN.md §11.2) — no row actions -->
          <div class="divide-y border-t md:hidden">
            <div v-if="isLoading && todayRows.length === 0" class="flex justify-center py-10">
              <Loader2 class="h-6 w-6 animate-spin text-primary" />
            </div>
            <template v-else-if="todayRows.length > 0">
              <SwipeRow v-for="row in todayRows" :key="row.member.id" :label="row.member.fullName" :actions="[]">
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-semibold text-foreground">{{ row.member.fullName }}</p>
                  <p class="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                    <span v-for="slot in punchSlots" :key="slot.key">
                      {{ slot.label }}: <span class="font-mono text-foreground">{{ (row.record && getPunchCell(row.record, slot.key).time) || '—' }}</span>
                    </span>
                  </p>
                </div>
                <Badge variant="outline" :class="[getTodayStatusBadgeClass(row.status), 'shrink-0 text-[10px]']">
                  {{ formatTodayStatusLabel(row.status) }}
                </Badge>
              </SwipeRow>
            </template>
            <p v-else class="py-10 text-center text-xs text-muted-foreground">No team members yet.</p>
          </div>

          <div class="relative hidden overflow-x-auto border-t md:block">
            <Table>
              <TableHeader class="bg-muted/40">
                <TableRow>
                  <TableHead class="min-w-56 pl-4 text-xs font-semibold">Team Member</TableHead>
                  <TableHead v-for="slot in punchSlots" :key="slot.key" class="min-w-28 text-xs font-semibold">
                    {{ slot.label }}
                  </TableHead>
                  <TableHead class="min-w-24 pr-4 text-xs font-semibold">Today</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <!-- Loading -->
                <TableRow v-if="isLoading && todayRows.length === 0">
                  <TableCell :colspan="COLUMN_COUNT" class="h-44 text-center">
                    <div class="flex flex-col items-center justify-center gap-2 py-6">
                      <Loader2 class="h-8 w-8 animate-spin text-primary" />
                      <p class="text-xs text-muted-foreground">Loading your team...</p>
                    </div>
                  </TableCell>
                </TableRow>

                <!-- Rows -->
                <template v-else-if="todayRows.length > 0">
                  <TableRow v-for="row in todayRows" :key="row.member.id" class="hover:bg-muted/30 transition-colors">
                    <TableCell class="py-3 pl-4">
                      <div class="flex items-center gap-2.5 min-w-0">
                        <Avatar class="h-8 w-8 text-xs shrink-0 font-medium">
                          <AvatarFallback class="bg-primary/10 text-primary">{{ getInitials(row.member.fullName) }}</AvatarFallback>
                        </Avatar>
                        <div class="min-w-0">
                          <p class="truncate text-xs font-semibold text-foreground">{{ row.member.fullName }}</p>
                          <p class="text-[11px] text-muted-foreground">{{ formatPositionLabel(row.member.position) }}</p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell v-for="slot in punchSlots" :key="slot.key" class="py-3">
                      <template v-if="row.record && (getPunchCell(row.record, slot.key).time || getPunchCell(row.record, slot.key).status)">
                        <div class="flex flex-col gap-1 items-start">
                          <span v-if="getPunchCell(row.record, slot.key).time" class="text-xs font-mono font-medium text-foreground">
                            {{ getPunchCell(row.record, slot.key).time }}
                          </span>
                          <Badge
                            v-if="getPunchCell(row.record, slot.key).status"
                            variant="outline"
                            :class="[getPunchStatusBadgeClass(getPunchCell(row.record, slot.key).status), badgeClass]"
                          >
                            {{ formatPunchStatusLabel(getPunchCell(row.record, slot.key).status) }}
                          </Badge>
                        </div>
                      </template>
                      <span v-else class="text-muted-foreground/60 text-xs font-mono">—</span>
                    </TableCell>

                    <TableCell class="py-3 pr-4">
                      <Badge variant="outline" :class="[getTodayStatusBadgeClass(row.status), 'text-[10px] px-1.5 py-0 h-5']">
                        {{ formatTodayStatusLabel(row.status) }}
                      </Badge>
                    </TableCell>
                  </TableRow>
                </template>

                <!-- Empty -->
                <TableEmpty v-else :colspan="COLUMN_COUNT">
                  <Empty class="border-0 p-6 md:p-8">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <UsersRound class="size-5 text-muted-foreground" />
                      </EmptyMedia>
                      <EmptyTitle>No team members yet</EmptyTitle>
                      <EmptyDescription>
                        Active GIP and TUPAD beneficiaries assigned to your office will appear here.
                      </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                      <Button size="sm" variant="outline" class="gap-1.5 text-xs cursor-pointer" :disabled="isLoading" @click="fetchDashboard">
                        <RefreshCw class="h-3.5 w-3.5" />
                        <span>Refresh</span>
                      </Button>
                    </EmptyContent>
                  </Empty>
                </TableEmpty>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </template>
  </div>
</template>
