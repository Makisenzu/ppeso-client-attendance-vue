<script setup lang="ts">
import { ArrowLeft, Check, ChevronDown, FileText, Loader2, Printer, Search, X } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import DtrPrintSheet from './DtrPrintSheet.vue'
import { useDtrGenerator } from '@/composables/peso/useDtrGenerator'
import { formatMonthHeader } from '@/helpers/peso/dtrHelper'
import { getInitials } from '@/helpers/peso/attendanceHelper'

const {
  isLoadingProfiles,
  isGenerating,
  selectedProfileId,
  employeeSearch,
  isEmployeeDropdownOpen,
  startDate,
  endDate,
  regularHours,
  saturdayHours,
  supervisorName,
  supervisorTitle,
  dualCopy,
  rightCopyHasName,
  generatedData,
  fetchError,
  selectedEmployee,
  filteredEmployees,
  applyPreset,
  handleGenerate,
  handlePrint,
  goBack,
  selectEmployee,
  clearFetchError,
  presets,
} = useDtrGenerator()
</script>

<template>
  <div class="flex flex-col gap-6 pb-12">
    <!-- ─── Header ─── -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
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
          <h1 class="text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
            Generate DTR
          </h1>
          <p class="text-sm text-muted-foreground">
            Civil Service Form No. 48 for one employee and date range.
          </p>
        </div>
      </div>

      <Button
        size="sm"
        class="gap-1.5 text-xs cursor-pointer font-semibold self-start sm:self-auto"
        :disabled="!generatedData"
        @click="handlePrint"
      >
        <Printer class="h-3.5 w-3.5" />
        <span>Print DTR</span>
      </Button>
    </div>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
      <!-- ─── Configuration ─── -->
      <Card class="print:hidden">
        <CardHeader>
          <CardTitle class="text-base">Options</CardTitle>
          <CardDescription class="text-xs">Choose the employee, period and signatory.</CardDescription>
        </CardHeader>

        <CardContent class="space-y-5">
          <!-- Error Banner -->
          <div
            v-if="fetchError"
            class="flex items-start justify-between gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs font-medium text-destructive"
          >
            <span>{{ fetchError }}</span>
            <button
              type="button"
              class="cursor-pointer hover:opacity-70"
              aria-label="Dismiss error"
              @click="clearFetchError"
            >
              <X class="h-4 w-4" />
            </button>
          </div>

          <!-- 1. Employee -->
          <div class="space-y-2">
            <span class="block text-xs font-semibold text-foreground">Employee</span>

            <div class="relative">
              <button
                type="button"
                class="flex w-full items-center justify-between gap-2 rounded-lg border bg-card p-2.5 text-left transition-colors hover:bg-muted/30 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="isLoadingProfiles"
                :aria-expanded="isEmployeeDropdownOpen"
                @click="isEmployeeDropdownOpen = !isEmployeeDropdownOpen"
              >
                <div v-if="selectedEmployee" class="flex min-w-0 items-center gap-2.5">
                  <Avatar class="h-7 w-7 shrink-0 border text-xs">
                    <AvatarFallback class="bg-primary/10 font-semibold text-primary">
                      {{ getInitials(selectedEmployee.fullName) }}
                    </AvatarFallback>
                  </Avatar>
                  <div class="min-w-0">
                    <div class="truncate text-xs font-semibold leading-none text-foreground">
                      {{ selectedEmployee.fullName }}
                    </div>
                    <div class="mt-0.5 text-[11px] capitalize text-muted-foreground">
                      {{ selectedEmployee.position || 'Employee' }}
                    </div>
                  </div>
                </div>
                <span v-else class="text-xs text-muted-foreground">
                  {{ isLoadingProfiles ? 'Loading employees...' : 'Choose an employee...' }}
                </span>
                <ChevronDown class="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>

              <div
                v-if="isEmployeeDropdownOpen"
                class="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg animate-in fade-in zoom-in-95"
              >
                <div class="border-b bg-muted/20 p-2">
                  <div class="relative">
                    <Search class="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      v-model="employeeSearch"
                      placeholder="Search by name or position..."
                      class="h-8 bg-background pl-8 text-base md:text-xs"
                      auto-focus
                    />
                  </div>
                </div>

                <div class="max-h-60 divide-y divide-border/40 overflow-y-auto">
                  <button
                    v-for="p in filteredEmployees"
                    :key="p.id"
                    type="button"
                    class="flex w-full items-center justify-between p-2.5 text-left text-xs transition-colors hover:bg-muted/50 cursor-pointer"
                    @click="selectEmployee(p.id)"
                  >
                    <div class="flex min-w-0 items-center gap-2.5">
                      <Avatar class="h-6 w-6 shrink-0 border text-[10px]">
                        <AvatarFallback class="bg-primary/10 font-semibold text-primary">
                          {{ getInitials(p.fullName) }}
                        </AvatarFallback>
                      </Avatar>
                      <div class="min-w-0">
                        <div class="truncate font-medium text-foreground">{{ p.fullName }}</div>
                        <div class="text-[10px] capitalize text-muted-foreground">
                          {{ p.position || 'Employee' }}
                        </div>
                      </div>
                    </div>
                    <Check v-if="selectedProfileId === p.id" class="h-4 w-4 shrink-0 text-primary" />
                  </button>
                  <div v-if="filteredEmployees.length === 0" class="p-3 text-center text-xs text-muted-foreground">
                    No matching employees found.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 2. Date Range -->
          <div class="space-y-2">
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-semibold text-foreground">Date Range</span>
              <span class="text-[11px] text-muted-foreground">{{ formatMonthHeader(startDate, endDate) }}</span>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <label class="space-y-1">
                <span class="block text-[11px] text-muted-foreground">Start Date</span>
                <Input v-model="startDate" type="date" class="h-9 text-base md:text-xs" />
              </label>
              <label class="space-y-1">
                <span class="block text-[11px] text-muted-foreground">End Date</span>
                <Input v-model="endDate" type="date" class="h-9 text-base md:text-xs" />
              </label>
            </div>

            <div class="flex flex-wrap gap-1.5 pt-1">
              <Button
                v-for="preset in presets"
                :key="preset.key"
                variant="outline"
                size="sm"
                class="h-7 px-2 text-[11px] cursor-pointer"
                @click="applyPreset(preset.key)"
              >
                {{ preset.label }}
              </Button>
            </div>
          </div>

          <!-- 3. Form 48 Layout & Signatories -->
          <div class="space-y-3 rounded-lg border bg-muted/10 p-3.5">
            <span class="block text-xs font-semibold text-foreground">Form 48 Layout &amp; Signatory</span>

            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <label class="space-y-1">
                <span class="block text-[11px] text-muted-foreground">Regular Days</span>
                <Input v-model="regularHours" placeholder="e.g. Monday - Friday" class="h-8 bg-background text-base md:text-xs" />
              </label>
              <label class="space-y-1">
                <span class="block text-[11px] text-muted-foreground">Saturdays</span>
                <Input v-model="saturdayHours" placeholder="e.g. None" class="h-8 bg-background text-base md:text-xs" />
              </label>
              <label class="space-y-1">
                <span class="block text-[11px] text-muted-foreground">Supervisor Name</span>
                <Input v-model="supervisorName" placeholder="PGDH" class="h-8 bg-background text-base md:text-xs" />
              </label>
              <label class="space-y-1">
                <span class="block text-[11px] text-muted-foreground">Supervisor Title</span>
                <Input v-model="supervisorTitle" placeholder="(PESO Manager)" class="h-8 bg-background text-base md:text-xs" />
              </label>
            </div>

            <div class="flex flex-col gap-2 border-t pt-3">
              <label class="flex cursor-pointer select-none items-start gap-2 text-xs">
                <input
                  v-model="dualCopy"
                  type="checkbox"
                  class="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-input accent-primary"
                />
                <span class="font-medium text-foreground">2 copies side by side</span>
              </label>

              <label
                v-if="dualCopy"
                class="flex cursor-pointer select-none items-start gap-2 pl-6 text-xs text-muted-foreground"
              >
                <input
                  v-model="rightCopyHasName"
                  type="checkbox"
                  class="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-input accent-primary"
                />
                <span>Print the employee name on the right copy</span>
              </label>
            </div>
          </div>

          <Button
            class="w-full gap-1.5 text-xs font-semibold cursor-pointer"
            :disabled="isGenerating || !selectedProfileId"
            @click="handleGenerate"
          >
            <Loader2 v-if="isGenerating" class="h-3.5 w-3.5 animate-spin" />
            <FileText v-else class="h-3.5 w-3.5" />
            <span>{{ isGenerating ? 'Generating DTR...' : generatedData ? 'Regenerate DTR' : 'Generate DTR' }}</span>
          </Button>
        </CardContent>
      </Card>

      <!-- ─── Preview ─── -->
      <Card class="min-w-0 print:border-none print:shadow-none">
        <CardHeader class="print:hidden">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <CardTitle class="text-base">Preview</CardTitle>
            <div v-if="generatedData" class="flex flex-wrap items-center gap-2">
              <Badge variant="outline" class="font-mono text-xs">{{ generatedData.monthDisplay }}</Badge>
              <span class="text-xs text-muted-foreground">
                Days {{ generatedData.activeStartDay }}–{{ generatedData.activeEndDay }} of {{ generatedData.totalDaysInMonth }}
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent class="print:p-0">
          <div v-if="generatedData" class="overflow-x-auto rounded-lg bg-muted/30 p-4 print:overflow-visible print:bg-transparent print:p-0">
            <DtrPrintSheet :data="generatedData" :dual-copy="dualCopy" :right-copy-has-name="rightCopyHasName" />
          </div>

          <Empty v-else class="border border-dashed py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileText />
              </EmptyMedia>
              <EmptyTitle>No DTR generated yet</EmptyTitle>
              <EmptyDescription>Set the options, then select Generate DTR.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

