<script setup lang="ts">
import { computed } from 'vue'
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  X,
} from '@lucide/vue'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAttendanceKiosk } from '@/composables/peso/useKiosk'
import {
  formatFullName,
  formatPunchTypeLabel,
} from '@/helpers/peso/kioskhelper'

const { store, currentTime, currentDate, currentPeriod } = useAttendanceKiosk()

const resultTimeDisplay = computed(() => {
  if (!store.lastResult?.timestamp) return ''
  try {
    const d = new Date(store.lastResult.timestamp)
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    })
  } catch {
    return store.lastResult.timestamp
  }
})
</script>


<template>
  <div class="mx-auto max-w-xl space-y-6 pb-12">
    <!-- ─── Live Clock & Station Banner ─── -->
    <Card class="overflow-hidden border-primary/20 bg-linear-to-br from-card via-card to-primary/5 shadow-sm">
      <CardContent class="p-5 sm:p-6 text-center space-y-3">
        <!-- Live Digital Time Display -->
        <div class="flex items-baseline justify-center gap-2 font-mono">
          <span class="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground">
            {{ currentTime || '--:--:--' }}
          </span>
          <Badge variant="outline" class="text-xs font-bold uppercase tracking-wider px-2 py-0.5 border-primary/40 bg-primary/10 text-primary">
            {{ currentPeriod }}
          </Badge>
        </div>

        <!-- Date Display -->
        <div class="flex items-center justify-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
          <CalendarDays class="size-4 text-primary" />
          <span>{{ currentDate || 'Loading date...' }}</span>
        </div>
      </CardContent>
    </Card>

    <!-- Already Recorded Banner -->
    <div
      v-if="store.lastResult && store.lastResult.alreadyRecorded"
      class="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-300 flex items-start gap-3 shadow-xs animate-in fade-in duration-150"
    >
      <AlertCircle class="size-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
      <div class="flex-1 text-sm text-left">
        <p class="font-semibold text-amber-900 dark:text-amber-200">Already Recorded</p>
        <p class="text-xs text-amber-700/90 dark:text-amber-300/90 mt-0.5">
          {{ store.lastResult.punchType ? formatPunchTypeLabel(store.lastResult.punchType) : 'Attendance' }} was already recorded
          <span v-if="store.lastResult.profile">for {{ formatFullName(store.lastResult.profile) }}</span>
          at <span class="font-mono font-medium text-foreground">{{ resultTimeDisplay }}</span>. Please wait 5 minutes before punching again.
        </p>
      </div>
      <button
        type="button"
        class="p-1 text-amber-600/80 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200 transition-colors cursor-pointer"
        @click="store.dismissResult"
      >
        <X class="size-4" />
      </button>
    </div>

    <!-- Success Punch Banner -->
    <div
      v-else-if="store.lastResult && !store.lastResult.alreadyRecorded"
      class="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-800 dark:text-emerald-300 flex items-start gap-3 shadow-xs animate-in fade-in duration-150"
    >
      <CheckCircle2 class="size-5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
      <div class="flex-1 text-sm text-left">
        <p class="font-semibold text-emerald-900 dark:text-emerald-200">
          {{ store.lastResult.punchType ? formatPunchTypeLabel(store.lastResult.punchType) : 'Attendance' }} Recorded
        </p>
        <p class="text-xs text-emerald-700/90 dark:text-emerald-300/90 mt-0.5">
          Recorded successfully
          <span v-if="store.lastResult.profile">for <span class="font-semibold text-foreground">{{ formatFullName(store.lastResult.profile) }}</span></span>
          at <span class="font-mono font-medium text-foreground">{{ resultTimeDisplay }}</span>.
        </p>
      </div>
      <button
        type="button"
        class="p-1 text-emerald-600/80 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-200 transition-colors cursor-pointer"
        @click="store.dismissResult"
      >
        <X class="size-4" />
      </button>
    </div>

    <!-- Error Notice (Matches Photo) -->
    <div
      v-if="store.error"
      class="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-destructive flex items-start gap-3 shadow-xs animate-in fade-in duration-150"
    >
      <AlertCircle class="size-5 shrink-0 mt-0.5" />
      <div class="flex-1 text-sm text-left">
        <p class="font-semibold">Unable to Complete Punch</p>
        <p class="text-xs opacity-90 mt-0.5">{{ store.error }}</p>
      </div>
      <button
        type="button"
        class="p-1 text-destructive/80 hover:text-destructive transition-colors cursor-pointer"
        @click="store.error = null"
      >
        <X class="size-4" />
      </button>
    </div>

    <!-- ─── Passcode PIN Boxes ─── -->
    <div class="space-y-3">
      <div class="text-center space-y-1">
        <p class="text-sm font-semibold text-foreground">
          Enter 6-Digit Passcode
        </p>
        <p class="text-xs text-muted-foreground">
          Type your employee passcode to automatically log attendance
        </p>
      </div>

      <div class="flex justify-center gap-2.5 py-2">
        <div
          v-for="i in 6"
          :key="i"
          class="flex size-12 sm:size-14 items-center justify-center rounded-xl border-2 text-2xl font-bold font-mono transition-all duration-150 shadow-xs select-none"
          :class="[
            store.passcode[i - 1]
              ? 'border-primary bg-primary/10 text-primary scale-105 shadow-primary/20'
              : 'border-border/60 bg-muted/40 text-muted-foreground/30'
          ]"
        >
          <span v-if="store.passcode[i - 1]" class="inline-block transform scale-125">
            •
          </span>
          <span v-else class="text-xs text-muted-foreground/40 font-normal">
            {{ i }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>