<script setup lang="ts">
import { Building2, CircleAlert, ClipboardCheck, Filter, Loader2, RefreshCw, Search, UsersRound, X } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import SearchSelect from '@/components/common/SearchSelect.vue'
import { useTeamEvaluations } from '@/composables/supervisor/useTeamEvaluations'

// A list of people, not records: nothing to select or bulk delete here (DESIGN.md §11.1 exemption).
const {
  officeLabel,
  periodLabel,
  hasOffice,
  hasQuestions,
  hasLoaded,
  isLoading,
  fetchAll,
  rows,
  filteredRows,
  summary,
  searchQuery,
  statusFilter,
  statusOptions,
  hasActiveFilters,
  resetFilters,
  clearSearch,
  openEvaluation,
  canOpenRow,
  getRowStatus,
  getRowScore,
  getRowScoreLabel,
  getRowUpdatedLabel,
  getEvaluateActionLabel,
  formatEvaluationStatusLabel,
  getEvaluationStatusBadgeClass,
  getInitials,
} = useTeamEvaluations()

const COLUMN_COUNT = 5
</script>

<template>
  <div class="flex flex-col gap-6 pb-12">
    <!-- ─── Header ─── -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="space-y-1">
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl text-foreground">Evaluation</h1>
        <p class="text-sm text-muted-foreground">Rate the performance and attitude of your GIPs for {{ periodLabel }}.</p>
      </div>
      <div class="flex flex-wrap items-center gap-2 self-start sm:self-auto">
        <Badge v-if="officeLabel" variant="outline" class="gap-1.5 h-8 px-2.5 text-xs font-medium">
          <Building2 class="h-3.5 w-3.5 text-muted-foreground" />
          <span>{{ officeLabel }}</span>
        </Badge>
        <Button variant="outline" size="sm" class="gap-1.5 text-xs cursor-pointer shadow-xs" :disabled="isLoading" @click="fetchAll">
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
      <!-- ─── No questions yet ─── -->
      <div
        v-if="hasLoaded && !isLoading && !hasQuestions"
        class="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4 text-sm"
      >
        <CircleAlert class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <p class="text-muted-foreground">There are no evaluation questions yet. Ask a PESO admin to add them.</p>
      </div>

      <!-- ─── Counts ─── -->
      <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card class="border shadow-xs bg-card/60">
          <CardContent class="p-4">
            <p class="text-xs font-medium text-muted-foreground">Active GIPs</p>
            <p class="text-2xl font-bold tracking-tight font-mono text-foreground">{{ summary.gips.toLocaleString() }}</p>
            <p class="text-[11px] text-muted-foreground">To evaluate this month</p>
          </CardContent>
        </Card>
        <Card class="border shadow-xs bg-card/60">
          <CardContent class="p-4">
            <p class="text-xs font-medium text-muted-foreground">Submitted</p>
            <p class="text-2xl font-bold tracking-tight font-mono text-success">{{ summary.submitted.toLocaleString() }}</p>
            <p class="text-[11px] text-muted-foreground">Done for {{ periodLabel }}</p>
          </CardContent>
        </Card>
        <Card class="border shadow-xs bg-card/60">
          <CardContent class="p-4">
            <p class="text-xs font-medium text-muted-foreground">Drafts</p>
            <p class="text-2xl font-bold tracking-tight font-mono text-foreground">{{ summary.drafts.toLocaleString() }}</p>
            <p class="text-[11px] text-muted-foreground">Started, not submitted</p>
          </CardContent>
        </Card>
        <Card class="border shadow-xs bg-card/60">
          <CardContent class="p-4">
            <p class="text-xs font-medium text-muted-foreground">Not Started</p>
            <p class="text-2xl font-bold tracking-tight font-mono text-primary">{{ summary.notStarted.toLocaleString() }}</p>
            <p class="text-[11px] text-muted-foreground">No evaluation yet</p>
          </CardContent>
        </Card>
      </div>

      <!-- ─── GIP list ─── -->
      <Card class="border shadow-xs">
        <CardHeader class="pb-4">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle class="text-lg font-semibold">GIPs</CardTitle>
              <CardDescription class="text-xs">Showing {{ filteredRows.length }} of {{ rows.length }} active GIPs</CardDescription>
            </div>
            <Button
              v-if="hasActiveFilters"
              variant="ghost"
              size="sm"
              class="gap-1.5 text-xs text-muted-foreground hover:text-foreground h-8 self-start sm:self-auto cursor-pointer"
              @click="resetFilters"
            >
              <X class="h-3.5 w-3.5" />
              <span>Clear filters</span>
            </Button>
          </div>
          <div class="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div class="sm:col-span-2 relative">
              <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input v-model="searchQuery" placeholder="Search by name..." class="pl-9 pr-8 h-9 text-base md:text-xs" />
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
            <SearchSelect v-model="statusFilter" :options="statusOptions" :searchable="false" />
          </div>
        </CardHeader>

        <CardContent class="p-0">
          <div class="relative overflow-x-auto border-t">
            <Table>
              <TableHeader class="bg-muted/40">
                <TableRow>
                  <TableHead class="min-w-56 pl-4 text-xs font-semibold">GIP</TableHead>
                  <TableHead class="min-w-28 text-xs font-semibold">{{ periodLabel }}</TableHead>
                  <TableHead class="min-w-40 text-xs font-semibold">Overall Rating</TableHead>
                  <TableHead class="min-w-40 text-xs font-semibold">Last Updated</TableHead>
                  <TableHead class="min-w-28 pr-4 text-right text-xs font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <!-- Loading -->
                <TableRow v-if="isLoading && rows.length === 0">
                  <TableCell :colspan="COLUMN_COUNT" class="h-40 text-center">
                    <div class="flex flex-col items-center justify-center gap-2 py-6">
                      <Loader2 class="h-8 w-8 animate-spin text-primary" />
                      <p class="text-xs text-muted-foreground">Loading the GIPs in your office...</p>
                    </div>
                  </TableCell>
                </TableRow>

                <!-- Rows -->
                <template v-else-if="filteredRows.length > 0">
                  <TableRow v-for="row in filteredRows" :key="row.member.id" class="hover:bg-muted/30 transition-colors">
                    <TableCell class="py-3 pl-4">
                      <div class="flex items-center gap-2.5 min-w-0">
                        <Avatar class="h-8 w-8 text-xs shrink-0 font-medium">
                          <AvatarFallback class="bg-primary/10 text-primary">{{ getInitials(row.member.fullName) }}</AvatarFallback>
                        </Avatar>
                        <span class="truncate text-xs sm:text-sm font-semibold text-foreground">{{ row.member.fullName }}</span>
                      </div>
                    </TableCell>
                    <TableCell class="py-3">
                      <Badge variant="outline" :class="[getEvaluationStatusBadgeClass(getRowStatus(row)), 'text-[10px]']">
                        {{ formatEvaluationStatusLabel(getRowStatus(row)) }}
                      </Badge>
                    </TableCell>
                    <TableCell class="py-3 text-xs whitespace-nowrap">
                      <span class="font-mono text-foreground">{{ getRowScore(row) }}</span>
                      <span v-if="getRowScoreLabel(row)" class="text-muted-foreground"> · {{ getRowScoreLabel(row) }}</span>
                    </TableCell>
                    <TableCell class="py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {{ getRowUpdatedLabel(row) }}
                    </TableCell>
                    <TableCell class="py-3 pr-4 text-right">
                      <Button
                        :variant="row.evaluation?.status === 'Submitted' ? 'ghost' : 'outline'"
                        size="sm"
                        class="h-8 gap-1.5 text-xs cursor-pointer"
                        :disabled="!canOpenRow(row)"
                        :aria-label="`${getEvaluateActionLabel(row)} ${row.member.fullName}`"
                        @click="openEvaluation(row)"
                      >
                        <ClipboardCheck class="h-3.5 w-3.5" />
                        <span>{{ getEvaluateActionLabel(row) }}</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                </template>

                <!-- Empty -->
                <TableEmpty v-else :colspan="COLUMN_COUNT">
                  <Empty class="border-0 p-6 md:p-8">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <UsersRound v-if="rows.length === 0" class="size-5 text-muted-foreground" />
                        <Filter v-else class="size-5 text-muted-foreground" />
                      </EmptyMedia>
                      <EmptyTitle>{{ rows.length === 0 ? 'No active GIPs in your office' : 'No matching GIPs' }}</EmptyTitle>
                      <EmptyDescription>
                        {{
                          rows.length === 0
                            ? 'Active GIP beneficiaries assigned to your office will appear here.'
                            : 'No GIPs match your search or filter.'
                        }}
                      </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent v-if="rows.length > 0">
                      <Button size="sm" variant="outline" class="text-xs cursor-pointer" @click="resetFilters">Clear Filters</Button>
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
