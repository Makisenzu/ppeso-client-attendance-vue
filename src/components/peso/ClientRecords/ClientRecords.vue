<script setup lang="ts">
import {
  AlertCircle,
  Briefcase,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Eye,
  LogOut,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  User,
  UserCheck,
  Users,
  X,
} from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { useClientRecords } from '@/composables/peso/useClientRecords'
import {
  formatPurposeLabel,
  formatPurposeShortLabel,
  getGenderBadgeClass,
  getPurposeBadgeClass,
  GENDER_OPTIONS,
  PURPOSE_OPTIONS,
} from '@/helpers/peso/clientRecordHelper'
import ClientRecordSheet from './ClientRecordSheet.vue'

const {
  filteredRecords,
  paginatedRecords,
  isLoading,
  isSubmitting,
  searchQuery,
  selectedPurposeFilter,
  selectedGenderFilter,
  selectedDateFilter,
  currentPage,
  pageSize,
  totalPages,
  statsSummary,
  isSheetOpen,
  selectedRecord,
  isDetailsOpen,
  feedbackMessage,
  dismissFeedback,
  refreshRecords,
  resetFilters,
  clearSearch,
  prevPage,
  nextPage,
  openAddSheet,
  openDetails,
  closeDetails,
  handleAddClient,
  handleCheckOut,
  exportCsv,
} = useClientRecords()
</script>

<template>
  <div class="flex flex-col gap-6 pb-12">
    <!-- ─── Header & Action Buttons ─── -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="space-y-1">
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
          Client Records
        </h1>
        <p class="text-sm text-muted-foreground">
          Manage and monitor walk-in client attendance, inquiries, and PESO services.
        </p>
      </div>

      <!-- Action Buttons (Add client, Export CSV, Refresh) -->
      <div class="flex items-center gap-2 self-start sm:self-auto flex-wrap">
        <Button
          size="sm"
          class="gap-1.5 text-xs cursor-pointer shadow-xs"
          @click="openAddSheet"
        >
          <Plus class="h-4 w-4" />
          <span>Add Client</span>
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
          @click="refreshRecords"
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
        <AlertCircle v-else class="h-4 w-4 shrink-0" />
        <span class="font-medium">{{ feedbackMessage.text }}</span>
      </div>
      <button @click="dismissFeedback" class="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer">
        <X class="h-3.5 w-3.5" />
      </button>
    </div>

    <!-- ─── Analytics Metric Cards Grid ─── -->
    <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
      <!-- 1. Total Walk-in Clients -->
      <Card
        class="border shadow-xs bg-card/60 backdrop-blur-xs hover:border-primary/40 transition-all cursor-pointer"
        :class="selectedDateFilter === 'ALL' && selectedPurposeFilter === 'ALL' && selectedGenderFilter === 'ALL' ? 'border-primary ring-2 ring-primary/20 shadow-sm' : ''"
        @click="resetFilters"
      >
        <CardContent class="p-4 flex items-center justify-between">
          <div class="space-y-0.5 min-w-0">
            <p class="text-xs font-medium text-muted-foreground truncate">Total Clients</p>
            <p class="text-2xl font-bold tracking-tight font-mono text-foreground">
              {{ statsSummary.total.toLocaleString() }}
            </p>
            <p class="text-[11px] text-muted-foreground truncate">
              All time walk-ins
            </p>
          </div>
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Users class="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      <!-- 2. Today's Walk-in Clients -->
      <Card
        class="border shadow-xs bg-card/60 backdrop-blur-xs hover:border-emerald-500/40 transition-all cursor-pointer"
        :class="selectedDateFilter === 'today' ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm' : ''"
        @click="selectedDateFilter = selectedDateFilter === 'today' ? 'ALL' : 'today'"
      >
        <CardContent class="p-4 flex items-center justify-between">
          <div class="space-y-0.5 min-w-0">
            <p class="text-xs font-medium text-muted-foreground truncate">Today's Clients</p>
            <p class="text-2xl font-bold tracking-tight font-mono text-emerald-600 dark:text-emerald-400">
              {{ statsSummary.today.toLocaleString() }}
            </p>
            <p class="text-[11px] text-muted-foreground truncate">
              Checked in today
            </p>
          </div>
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Clock class="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      <!-- 3. Male Clients -->
      <Card
        class="border shadow-xs bg-card/60 backdrop-blur-xs hover:border-sky-500/40 transition-all cursor-pointer"
        :class="selectedGenderFilter === 'male' ? 'border-sky-500 ring-2 ring-sky-500/20 shadow-sm' : ''"
        @click="selectedGenderFilter = selectedGenderFilter === 'male' ? 'ALL' : 'male'"
      >
        <CardContent class="p-4 flex items-center justify-between">
          <div class="space-y-0.5 min-w-0">
            <p class="text-xs font-medium text-muted-foreground truncate">Male Clients</p>
            <p class="text-2xl font-bold tracking-tight font-mono text-sky-600 dark:text-sky-400">
              {{ statsSummary.male.toLocaleString() }}
            </p>
            <p class="text-[11px] text-muted-foreground truncate">
              {{ statsSummary.total > 0 ? Math.round((statsSummary.male / statsSummary.total) * 100) : 0 }}% of total
            </p>
          </div>
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
            <User class="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      <!-- 4. Female Clients -->
      <Card
        class="border shadow-xs bg-card/60 backdrop-blur-xs hover:border-pink-500/40 transition-all cursor-pointer"
        :class="selectedGenderFilter === 'female' ? 'border-pink-500 ring-2 ring-pink-500/20 shadow-sm' : ''"
        @click="selectedGenderFilter = selectedGenderFilter === 'female' ? 'ALL' : 'female'"
      >
        <CardContent class="p-4 flex items-center justify-between">
          <div class="space-y-0.5 min-w-0">
            <p class="text-xs font-medium text-muted-foreground truncate">Female Clients</p>
            <p class="text-2xl font-bold tracking-tight font-mono text-pink-600 dark:text-pink-400">
              {{ statsSummary.female.toLocaleString() }}
            </p>
            <p class="text-[11px] text-muted-foreground truncate">
              {{ statsSummary.total > 0 ? Math.round((statsSummary.female / statsSummary.total) * 100) : 0 }}% of total
            </p>
          </div>
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400">
            <UserCheck class="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      <!-- 5. Top Program / Service -->
      <Card class="border shadow-xs bg-card/60 backdrop-blur-xs col-span-2 md:col-span-1">
        <CardContent class="p-4 flex items-center justify-between">
          <div class="space-y-0.5 min-w-0">
            <p class="text-xs font-medium text-muted-foreground truncate">Top PESO Program</p>
            <p class="text-lg font-bold tracking-tight text-foreground truncate">
              {{ statsSummary.topPurpose }}
            </p>
            <p class="text-[11px] text-muted-foreground truncate">
              Most requested service
            </p>
          </div>
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Briefcase class="h-5 w-5" />
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- ─── Filter & Search Toolbar ─── -->
    <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between bg-card p-3 rounded-xl border shadow-2xs">
      <div class="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <!-- Search Input -->
        <div class="relative flex-1 min-w-[200px] max-w-md">
          <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            v-model="searchQuery"
            placeholder="Search by client name, address, contact..."
            class="pl-8 pr-8 h-9 text-xs"
          />
          <button
            v-if="searchQuery"
            @click="clearSearch"
            class="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <!-- Purpose Filter -->
        <div class="w-full sm:w-[190px]">
          <select
            v-model="selectedPurposeFilter"
            class="w-full h-9 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground cursor-pointer dark:[color-scheme:dark] [&_option]:bg-white [&_option]:text-neutral-900 dark:[&_option]:bg-neutral-900 dark:[&_option]:text-neutral-100"
          >
            <option value="ALL">All Services / Programs</option>
            <option v-for="opt in PURPOSE_OPTIONS" :key="opt.value" :value="opt.value">
              {{ opt.shortLabel }} - {{ opt.label }}
            </option>
          </select>
        </div>

        <!-- Gender Filter -->
        <div class="w-full sm:w-[130px]">
          <select
            v-model="selectedGenderFilter"
            class="w-full h-9 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground cursor-pointer dark:[color-scheme:dark] [&_option]:bg-white [&_option]:text-neutral-900 dark:[&_option]:bg-neutral-900 dark:[&_option]:text-neutral-100"
          >
            <option value="ALL">All Genders</option>
            <option v-for="g in GENDER_OPTIONS" :key="g.value" :value="g.value">
              {{ g.label }}
            </option>
          </select>
        </div>
      </div>

      <!-- Date Filter Pills & Reset Button -->
      <div class="flex items-center gap-1.5 self-end lg:self-auto flex-wrap">
        <div class="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/50 text-xs">
          <button
            class="px-2.5 py-1 rounded-md transition-all cursor-pointer"
            :class="selectedDateFilter === 'ALL' ? 'bg-background shadow-xs font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground'"
            @click="selectedDateFilter = 'ALL'"
          >
            All
          </button>
          <button
            class="px-2.5 py-1 rounded-md transition-all cursor-pointer"
            :class="selectedDateFilter === 'today' ? 'bg-background shadow-xs font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground'"
            @click="selectedDateFilter = 'today'"
          >
            Today
          </button>
          <button
            class="px-2.5 py-1 rounded-md transition-all cursor-pointer"
            :class="selectedDateFilter === 'this_week' ? 'bg-background shadow-xs font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground'"
            @click="selectedDateFilter = 'this_week'"
          >
            This Week
          </button>
          <button
            class="px-2.5 py-1 rounded-md transition-all cursor-pointer"
            :class="selectedDateFilter === 'this_month' ? 'bg-background shadow-xs font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground'"
            @click="selectedDateFilter = 'this_month'"
          >
            This Month
          </button>
        </div>

        <Button
          v-if="searchQuery || selectedPurposeFilter !== 'ALL' || selectedGenderFilter !== 'ALL' || selectedDateFilter !== 'ALL'"
          variant="ghost"
          size="sm"
          class="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
          @click="resetFilters"
        >
          <X class="h-3 w-3" />
          <span>Reset</span>
        </Button>
      </div>
    </div>

    <!-- ─── Client Records Data Table ─── -->
    <div class="rounded-xl border bg-card shadow-2xs overflow-hidden">
      <div class="overflow-x-auto">
        <Table>
          <TableHeader class="bg-muted/40">
            <TableRow class="hover:bg-transparent">
              <TableHead class="text-xs font-semibold text-foreground w-[220px]">Client Name</TableHead>
              <TableHead class="text-xs font-semibold text-foreground w-[90px]">Gender</TableHead>
              <TableHead class="text-xs font-semibold text-foreground w-[140px]">Contact</TableHead>
              <TableHead class="text-xs font-semibold text-foreground min-w-[200px]">Residential Address</TableHead>
              <TableHead class="text-xs font-semibold text-foreground w-[160px]">Service Required</TableHead>
              <TableHead class="text-xs font-semibold text-foreground w-[150px]">Check-in</TableHead>
              <TableHead class="text-xs font-semibold text-foreground text-right w-[80px]">Action</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            <!-- Loading skeleton rows -->
            <template v-if="isLoading">
              <TableRow v-for="n in 5" :key="'skeleton-' + n" class="animate-pulse">
                <TableCell><div class="h-8 w-36 bg-muted rounded-md"></div></TableCell>
                <TableCell><div class="h-5 w-14 bg-muted rounded-md"></div></TableCell>
                <TableCell><div class="h-5 w-24 bg-muted rounded-md"></div></TableCell>
                <TableCell><div class="h-5 w-44 bg-muted rounded-md"></div></TableCell>
                <TableCell><div class="h-5 w-20 bg-muted rounded-md"></div></TableCell>
                <TableCell><div class="h-5 w-28 bg-muted rounded-md"></div></TableCell>
                <TableCell><div class="h-5 w-16 bg-muted rounded-md"></div></TableCell>
                <TableCell class="text-right"><div class="h-7 w-7 ml-auto bg-muted rounded-md"></div></TableCell>
              </TableRow>
            </template>

            <!-- Data Rows -->
            <template v-else-if="paginatedRecords.length > 0">
              <TableRow
                v-for="client in paginatedRecords"
                :key="client.id"
                class="transition-colors hover:bg-muted/40 cursor-pointer"
                @click="openDetails(client)"
              >
                <!-- Client Name & Avatar -->
                <TableCell>
                  <div class="flex items-center gap-2.5">
                    <Avatar class="h-8 w-8 text-xs font-semibold border border-primary/20 shrink-0">
                      <AvatarFallback class="bg-primary/10 text-primary">
                        {{ client.initials }}
                      </AvatarFallback>
                    </Avatar>
                    <div class="min-w-0">
                      <p class="font-medium text-xs text-foreground truncate">
                        {{ client.fullName }}
                      </p>
                      <p class="text-[10px] text-muted-foreground truncate font-mono">
                        ID: {{ client.id.slice(0, 8) }}
                      </p>
                    </div>
                  </div>
                </TableCell>

                <!-- Gender -->
                <TableCell>
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border capitalize"
                    :class="getGenderBadgeClass(client.gender)"
                  >
                    {{ client.gender || 'N/A' }}
                  </span>
                </TableCell>

                <!-- Contact Number -->
                <TableCell>
                  <div class="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                    <Phone class="h-3 w-3 shrink-0 text-muted-foreground/60" />
                    <span>{{ client.contact_number || 'None' }}</span>
                  </div>
                </TableCell>

                <!-- Address -->
                <TableCell>
                  <div class="flex items-center gap-1.5 text-xs text-foreground truncate max-w-[280px]">
                    <MapPin class="h-3 w-3 shrink-0 text-primary/70" />
                    <span class="truncate" :title="client.formattedAddress">
                      {{ client.formattedAddress || 'No address specified' }}
                    </span>
                  </div>
                </TableCell>

                <!-- Service / Purpose -->
                <TableCell>
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border"
                    :class="getPurposeBadgeClass(client.purpose)"
                  >
                    {{ formatPurposeShortLabel(client.purpose) }}
                  </span>
                </TableCell>

                <!-- Check-in Time -->
                <TableCell>
                  <div class="text-xs text-foreground font-mono">
                    {{ client.formattedCheckIn || 'N/A' }}
                  </div>
                </TableCell>

              

                <!-- Action Button -->
                <TableCell class="text-right" @click.stop>
                  <Button
                    variant="ghost"
                    size="icon"
                    class="h-7 w-7 text-muted-foreground hover:text-foreground"
                    title="View details"
                    @click="openDetails(client)"
                  >
                    <Eye class="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            </template>

            <!-- Empty State -->
            <TableEmpty v-else :colspan="8" class="py-12">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia>
                    <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                      <Users class="h-6 w-6" />
                    </div>
                  </EmptyMedia>
                  <EmptyTitle class="text-sm font-semibold">No Client Records Found</EmptyTitle>
                  <EmptyDescription class="text-xs text-muted-foreground max-w-sm mx-auto">
                    {{ searchQuery || selectedPurposeFilter !== 'ALL' || selectedGenderFilter !== 'ALL'
                      ? 'No walk-in clients match your active filters. Try resetting your search parameters.'
                      : 'No walk-in attendance records have been registered yet. Click "Add Client" to record a new walk-in client.'
                    }}
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent v-if="searchQuery || selectedPurposeFilter !== 'ALL' || selectedGenderFilter !== 'ALL' || selectedDateFilter !== 'ALL'">
                  <Button variant="outline" size="sm" class="text-xs mt-2" @click="resetFilters">
                    Reset Filters
                  </Button>
                </EmptyContent>
                <EmptyContent v-else>
                  <Button size="sm" class="text-xs mt-2 gap-1.5" @click="openAddSheet">
                    <Plus class="h-3.5 w-3.5" />
                    <span>Add First Client</span>
                  </Button>
                </EmptyContent>
              </Empty>
            </TableEmpty>
          </TableBody>
        </Table>
      </div>

      <!-- ─── Table Pagination Footer ─── -->
      <div class="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 border-t border-border bg-muted/20 text-xs text-muted-foreground">
        <div>
          Showing
          <span class="font-semibold text-foreground">
            {{ filteredRecords.length === 0 ? 0 : (currentPage - 1) * pageSize + 1 }}
          </span>
          to
          <span class="font-semibold text-foreground">
            {{ Math.min(currentPage * pageSize, filteredRecords.length) }}
          </span>
          of
          <span class="font-semibold text-foreground">{{ filteredRecords.length }}</span>
          entries
        </div>

        <div class="flex items-center gap-2">
          <!-- Page size selector -->
          <div class="flex items-center gap-1.5 mr-2">
            <span class="text-[11px]">Rows:</span>
            <select
              v-model.number="pageSize"
              class="h-7 rounded border border-input bg-background px-1.5 text-xs text-foreground cursor-pointer dark:[color-scheme:dark] [&_option]:bg-white [&_option]:text-neutral-900 dark:[&_option]:bg-neutral-900 dark:[&_option]:text-neutral-100"
            >
              <option :value="5">5</option>
              <option :value="10">10</option>
              <option :value="25">25</option>
              <option :value="50">50</option>
            </select>
          </div>

          <!-- Page Navigation -->
          <div class="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              class="h-7 w-7"
              :disabled="currentPage <= 1"
              @click="prevPage"
            >
              <ChevronLeft class="h-3.5 w-3.5" />
            </Button>
            <span class="px-2 text-xs font-medium text-foreground">
              {{ currentPage }} / {{ totalPages }}
            </span>
            <Button
              variant="outline"
              size="icon"
              class="h-7 w-7"
              :disabled="currentPage >= totalPages"
              @click="nextPage"
            >
              <ChevronRight class="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- ─── Insert Client Modal (Shadcn Sheet Component) ─── -->
    <ClientRecordSheet
      :open="isSheetOpen"
      :is-submitting="isSubmitting"
      @update:open="isSheetOpen = $event"
      @submit="handleAddClient"
    />

    <!-- ─── View Details Dialog ─── -->
    <Dialog :open="isDetailsOpen" @update:open="closeDetails">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <div class="flex items-center gap-3">
            <Avatar class="h-10 w-10 text-sm font-semibold border border-primary/20">
              <AvatarFallback class="bg-primary/10 text-primary">
                {{ selectedRecord?.initials }}
              </AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle class="text-base font-bold">{{ selectedRecord?.fullName }}</DialogTitle>
              <DialogDescription class="text-xs">
                Walk-in Client Record • ID: {{ selectedRecord?.id }}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div v-if="selectedRecord" class="space-y-3.5 py-2 text-xs">
          <!-- Information grid -->
          <div class="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/40 border border-border/50">
            <div>
              <span class="text-muted-foreground block text-[10px] uppercase tracking-wider font-semibold">Gender</span>
              <span class="font-medium capitalize text-foreground">{{ selectedRecord.gender || 'Not specified' }}</span>
            </div>
            <div>
              <span class="text-muted-foreground block text-[10px] uppercase tracking-wider font-semibold">Contact</span>
              <span class="font-medium text-foreground font-mono">{{ selectedRecord.contact_number || 'N/A' }}</span>
            </div>
            <div class="col-span-2">
              <span class="text-muted-foreground block text-[10px] uppercase tracking-wider font-semibold">Address</span>
              <span class="font-medium text-foreground">{{ selectedRecord.formattedAddress }}</span>
            </div>
            <div class="col-span-2">
              <span class="text-muted-foreground block text-[10px] uppercase tracking-wider font-semibold">Service Requested</span>
              <span
                class="inline-flex items-center mt-1 px-2.5 py-0.5 rounded-md text-xs font-medium border"
                :class="getPurposeBadgeClass(selectedRecord.purpose)"
              >
                {{ formatPurposeLabel(selectedRecord.purpose) }}
              </span>
            </div>
          </div>

          <!-- Timeline -->
          <div class="space-y-2 p-3 rounded-lg border border-border/50 bg-background">
            <div class="flex items-center justify-between text-xs">
              <span class="text-muted-foreground flex items-center gap-1.5">
                <Clock class="h-3.5 w-3.5 text-primary" />
                <span>Check-in:</span>
              </span>
              <span class="font-medium font-mono text-foreground">{{ selectedRecord.formattedCheckIn }}</span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-muted-foreground flex items-center gap-1.5">
                <LogOut class="h-3.5 w-3.5 text-muted-foreground" />
                <span>Check-out:</span>
              </span>
              <span class="font-medium font-mono text-foreground">
                {{ selectedRecord.formattedCheckOut || 'Still in office' }}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter class="flex sm:flex-row gap-2">
          <Button
            v-if="selectedRecord && !selectedRecord.check_out"
            variant="outline"
            size="sm"
            class="text-xs gap-1.5 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
            @click="handleCheckOut(selectedRecord.id)"
          >
            <LogOut class="h-3.5 w-3.5" />
            <span>Mark as Checked Out</span>
          </Button>
          <Button
            variant="default"
            size="sm"
            class="text-xs"
            @click="closeDetails"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>