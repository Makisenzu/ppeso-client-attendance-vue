<script setup lang="ts">
import { ArrowLeft, FileText, Loader2, Printer, X } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
// The official Form 48 sheet, shared with the admin Generate DTR page.
import DtrPrintSheet from '@/components/peso/attendance/DtrPrintSheet.vue'
import { useMyDtr } from '@/composables/beneficiary/useMyDtr'

const {
  myName,
  isLoadingName,
  isGenerating,
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
  presets,
  formatMonthHeader,
  applyPreset,
  handleGenerate,
  handlePrint,
  goBack,
  clearFetchError,
} = useMyDtr()
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
          title="Back to My Attendance"
          aria-label="Back to My Attendance"
          @click="goBack"
        >
          <ArrowLeft class="h-4 w-4" />
        </Button>
        <div class="space-y-1">
          <h1 class="text-2xl font-bold tracking-tight sm:text-3xl text-foreground">My DTR</h1>
          <p class="text-sm text-muted-foreground">Your Civil Service Form No. 48 for a date range.</p>
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
      <!-- ─── Options ─── -->
      <Card class="print:hidden">
        <CardHeader>
          <CardTitle class="text-base">Options</CardTitle>
          <CardDescription class="text-xs">Choose the period and signatory.</CardDescription>
        </CardHeader>

        <CardContent class="space-y-5">
          <div
            v-if="fetchError"
            class="flex items-start justify-between gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs font-medium text-destructive"
          >
            <span>{{ fetchError }}</span>
            <button type="button" class="cursor-pointer hover:opacity-70" aria-label="Dismiss error" @click="clearFetchError">
              <X class="h-4 w-4" />
            </button>
          </div>

          <!-- 1. Employee (always the signed-in user) -->
          <div class="space-y-2">
            <span class="block text-xs font-semibold text-foreground">Employee</span>
            <div class="rounded-lg border bg-muted/20 p-2.5 text-xs font-semibold text-foreground truncate">
              {{ isLoadingName ? 'Loading...' : myName || '—' }}
            </div>
          </div>

          <!-- 2. Date range -->
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

          <!-- 3. Form 48 layout & signatory -->
          <div class="space-y-3 rounded-lg border bg-muted/10 p-3.5">
            <span class="block text-xs font-semibold text-foreground">Form 48 Layout &amp; Signatory</span>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <label class="space-y-1">
                <span class="block text-[11px] text-muted-foreground">Regular Days Hours</span>
                <Input v-model="regularHours" placeholder="e.g. 8:00 AM - 5:00 PM" class="h-8 bg-background text-base md:text-xs" />
              </label>
              <label class="space-y-1">
                <span class="block text-[11px] text-muted-foreground">Saturdays Hours</span>
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
                <input v-model="dualCopy" type="checkbox" class="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-input accent-primary" />
                <span class="font-medium text-foreground">2 copies side by side</span>
              </label>
              <label v-if="dualCopy" class="flex cursor-pointer select-none items-start gap-2 pl-6 text-xs text-muted-foreground">
                <input v-model="rightCopyHasName" type="checkbox" class="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-input accent-primary" />
                <span>Print my name on the right copy</span>
              </label>
            </div>
          </div>

          <Button
            class="w-full gap-1.5 text-xs font-semibold cursor-pointer"
            :disabled="isGenerating || isLoadingName"
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

