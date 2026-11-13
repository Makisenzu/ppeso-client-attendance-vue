<script setup lang="ts">
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, RefreshCw, Search, Users, X } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { useOfficeDetails } from '@/composables/peso/useOfficeDetails'
import { formatStatusLabel as formatOfficeStatus, getStatusBadgeClass as getOfficeStatusClass } from '@/helpers/peso/officeHelper'
import { formatStatusLabel as formatProfileStatus, getStatusBadgeClass as getProfileStatusClass } from '@/helpers/peso/userManagementHelper'
import { getInitials } from '@/helpers/peso/attendanceHelper'
import { formatDisplayDate } from '@/helpers/common/dateFormatHelper'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const {
  office,
  gips,
  filteredGips,
  paginatedGips,
  stats,
  isLoading,
  loadError,
  notFound,
  searchQuery,
  statusFilter,
  currentPage,
  pageSize,
  totalPages,
  prevPage,
  nextPage,
  resetFilters,
  loadOffice,
  goBack,
} = useOfficeDetails()

/*
 * Bulk selection / bulk delete exemption (DESIGN.md §11.1 rule 8): this table lists user accounts that
 * belong to an office. Accounts are created and deleted in User Management, never from an office view,
 * so this table is read-only.
 */
const COLUMN_COUNT = 4
</script>

<template>
  <div class="flex flex-col gap-6 pb-12">
    <!-- ─── Header ─── -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div class="flex min-w-0 items-start gap-3">
        <Button
          variant="outline"
          size="icon"
          class="h-9 w-9 shrink-0 cursor-pointer"
          title="Back to Offices"
          aria-label="Back to Offices"
          @click="goBack"
        >
          <ArrowLeft class="h-4 w-4" />
        </Button>
        <div class="min-w-0 space-y-1">
          <div class="flex flex-wrap items-center gap-2">
            <h1 class="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {{ office?.name || (isLoading ? 'Loading office...' : 'Office') }}
            </h1>
            <Badge
              v-if="office"
              variant="outline"
              :class="[getOfficeStatusClass(office.isActive), 'h-5 px-2 py-0.5 font-mono text-[11px] capitalize']"
            >
              {{ formatOfficeStatus(office.isActive) }}
            </Badge>
          </div>
          <p v-if="office" class="text-sm text-muted-foreground">
            <span v-if="office.code" class="font-mono font-medium text-foreground">{{ office.code }}</span>
            <span v-if="office.code"> · </span>
            Office Head: <span class="font-medium text-foreground">{{ office.officeHead || 'Not listed' }}</span>
          </p>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        class="gap-1.5 self-start text-xs cursor-pointer"
        :disabled="isLoading"
        @click="loadOffice"
      >
        <RefreshCw :class="['h-3.5 w-3.5', isLoading && 'animate-spin']" />
        <span>Refresh</span>
      </Button>
    </div>

    <!-- ─── Office not found / failed ─── -->
    <Empty v-if="notFound || (loadError && !office)" class="border border-dashed py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Users />
        </EmptyMedia>
        <EmptyTitle>{{ notFound ? 'Office not found' : 'Could not load this office' }}</EmptyTitle>
        <EmptyDescription>
          {{ notFound ? 'It may have been deleted.' : loadError }}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" size="sm" class="text-xs cursor-pointer" @click="notFound ? goBack() : loadOffice()">
          {{ notFound ? 'Back to Offices' : 'Try again' }}
        </Button>
      </EmptyContent>
    </Empty>

    <!-- ─── GIP Beneficiaries ─── -->
    <section v-else class="flex flex-col gap-4" aria-labelledby="gip-beneficiaries-heading">
      <!-- Title, counts, search & filter (outside the table card) -->
      <div class="space-y-1">
        <h2 id="gip-beneficiaries-heading" class="text-lg font-semibold text-foreground">GIP Beneficiaries</h2>
        <p class="text-xs text-muted-foreground">
          {{ stats.total }} total · {{ stats.active }} active · {{ stats.inactive }} inactive
          <template v-if="stats.pending"> · {{ stats.pending }} pending</template>
        </p>
      </div>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div class="relative sm:col-span-2">
          <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input v-model="searchQuery" placeholder="Search by name..." class="h-9 pl-9 text-base md:text-xs" />
          <button
            v-if="searchQuery"
            type="button"
            class="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
            aria-label="Clear search"
            @click="searchQuery = ''"
          >
            <X class="h-4 w-4" />
          </button>
        </div>
        <select
          v-model="statusFilter"
          class="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          aria-label="Filter by status"
        >
          <option value="ALL">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="pending">Pending</option>
        </select>
      </div>

    <!-- Table card: table + pagination only -->
    <Card class="gap-0 overflow-hidden border py-0 shadow-xs">
      <CardContent class="p-0">
        <div class="relative overflow-x-auto">
          <Table>
            <TableHeader class="bg-muted/40">
              <TableRow>
                <TableHead class="w-12 pl-4 text-xs font-semibold">#</TableHead>
                <TableHead class="min-w-56 text-xs font-semibold">Name</TableHead>
                <TableHead class="min-w-24 text-xs font-semibold">Status</TableHead>
                <TableHead class="min-w-28 text-xs font-semibold">Date Added</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              <TableRow v-if="isLoading">
                <TableCell :colspan="COLUMN_COUNT" class="h-44 text-center">
                  <div class="flex flex-col items-center justify-center gap-2 py-6">
                    <Loader2 class="h-8 w-8 animate-spin text-primary" />
                    <p class="text-xs text-muted-foreground">Loading GIP beneficiaries...</p>
                  </div>
                </TableCell>
              </TableRow>

              <template v-else-if="paginatedGips.length > 0">
                <TableRow v-for="(gip, index) in paginatedGips" :key="gip.id" class="hover:bg-muted/30">
                  <TableCell class="py-3 pl-4 font-mono text-xs text-muted-foreground">
                    {{ (currentPage - 1) * pageSize + index + 1 }}
                  </TableCell>
                  <TableCell class="py-3">
                    <div class="flex items-center gap-2.5">
                      <Avatar class="h-8 w-8 shrink-0 text-xs font-medium">
                        <AvatarFallback class="bg-primary/10 text-primary">{{ getInitials(gip.fullName) }}</AvatarFallback>
                      </Avatar>
                      <span class="truncate text-xs font-semibold text-foreground sm:text-sm">{{ gip.fullName }}</span>
                    </div>
                  </TableCell>
                  <TableCell class="py-3">
                    <Badge
                      variant="outline"
                      :class="[getProfileStatusClass(gip.status), 'h-5 px-2 py-0.5 font-mono text-[11px] capitalize']"
                    >
                      {{ formatProfileStatus(gip.status) }}
                    </Badge>
                  </TableCell>
                  <TableCell class="py-3 font-mono text-xs text-muted-foreground">
                    {{ formatDisplayDate(gip.createdAt) }}
                  </TableCell>
                </TableRow>
              </template>

              <TableEmpty v-else :colspan="COLUMN_COUNT">
                <Empty class="py-10">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Users />
                    </EmptyMedia>
                    <EmptyTitle>{{ gips.length === 0 ? 'No GIP beneficiaries yet' : 'No matches' }}</EmptyTitle>
                    <EmptyDescription>
                      {{
                        gips.length === 0
                          ? 'Assign GIP beneficiaries to this office in User Management.'
                          : 'No GIP beneficiaries match your search or filter.'
                      }}
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent v-if="gips.length > 0">
                    <Button variant="outline" size="sm" class="text-xs cursor-pointer" @click="resetFilters">
                      Reset filters
                    </Button>
                  </EmptyContent>
                </Empty>
              </TableEmpty>
            </TableBody>
          </Table>
        </div>

        <!-- ─── Pagination ─── -->
        <div
          v-if="filteredGips.length > 0"
          class="flex flex-col gap-3 border-t px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="flex items-center gap-2">
            <span>Rows per page</span>
            <select
              v-model.number="pageSize"
              class="h-8 rounded-md border border-input bg-background px-2 text-xs"
              aria-label="Rows per page"
            >
              <option :value="10">10</option>
              <option :value="25">25</option>
              <option :value="50">50</option>
            </select>
            <span>
              {{ (currentPage - 1) * pageSize + 1 }}–{{ Math.min(currentPage * pageSize, filteredGips.length) }}
              of {{ filteredGips.length }}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <span>Page {{ currentPage }} of {{ totalPages }}</span>
            <Button
              variant="outline"
              size="icon"
              class="h-8 w-8 cursor-pointer"
              :disabled="currentPage <= 1"
              aria-label="Previous page"
              @click="prevPage"
            >
              <ChevronLeft class="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              class="h-8 w-8 cursor-pointer"
              :disabled="currentPage >= totalPages"
              aria-label="Next page"
              @click="nextPage"
            >
              <ChevronRight class="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
    </section>
  </div>
</template>
