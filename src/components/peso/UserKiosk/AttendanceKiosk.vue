<script setup lang="ts">
import { computed } from 'vue'
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Delete,
  Loader2,
  RotateCcw,
  Sparkles,
  X,
} from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAttendanceKiosk } from '@/composables/peso/useKiosk'
import {
  formatFullName,
  formatPunchTypeLabel,
  getStatusBadgeStyle,
} from '@/helpers/peso/kioskhelper'
import type { PunchMode } from '@/types/peso/kiosk'

const { store, currentTime, currentDate, currentPeriod } = useAttendanceKiosk()

const keypadRows = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['C', '0', '⌫'],
]

const punchModes: { mode: PunchMode; label: string; sub: string }[] = [
  { mode: 'auto', label: 'Auto', sub: 'Smart Detect' },
  { mode: 'am_in', label: 'AM In', sub: 'Morning In' },
  { mode: 'am_out', label: 'AM Out', sub: 'Lunch Out' },
  { mode: 'pm_in', label: 'PM In', sub: 'Afternoon In' },
  { mode: 'pm_out', label: 'PM Out', sub: 'Day Out' },
]

const handleKeypadPress = (key: string) => {
  if (key === 'C') {
    store.clearPasscode()
  } else if (key === '⌫') {
    store.deleteDigit()
  } else {
    store.appendDigit(key)
  }
}

const userInitials = computed(() => {
  const profile = store.lastResult?.profile
  if (!profile) return 'U'
  const first = profile.firstname ? profile.firstname.charAt(0) : ''
  const last = profile.lastname ? profile.lastname.charAt(0) : ''
  return (first + last).toUpperCase() || 'U'
})

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
        <div class="flex items-center justify-center gap-2">
          <span class="relative flex h-2.5 w-2.5">
            <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
          </span>
          <span class="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
            Attendance Kiosk Station
          </span>
        </div>

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

    <!-- ─── Punch Mode Selector Pills ─── -->
    <div class="space-y-1.5">
      <div class="flex items-center justify-between px-1">
        <span class="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <Clock class="size-3.5" /> Punch Mode
        </span>
        <span class="text-[11px] text-muted-foreground">
          {{ store.punchMode === 'auto' ? 'Auto-detecting based on shift & time' : 'Manual selection active' }}
        </span>
      </div>

      <div class="grid grid-cols-5 gap-1.5 p-1 rounded-xl bg-muted/50 border">
        <button
          v-for="item in punchModes"
          :key="item.mode"
          type="button"
          class="flex flex-col items-center justify-center py-2 px-1 rounded-lg text-xs font-semibold transition-all cursor-pointer"
          :class="[
            store.punchMode === item.mode
              ? 'bg-primary text-primary-foreground shadow-xs font-bold'
              : 'text-muted-foreground hover:bg-background hover:text-foreground'
          ]"
          @click="store.setPunchMode(item.mode)"
        >
          <span>{{ item.label }}</span>
          <span class="text-[9px] opacity-75 font-normal truncate max-w-full">
            {{ item.sub }}
          </span>
        </button>
      </div>
    </div>

    <!-- ─── Success Confirmation Card ─── -->
    <div
      v-if="store.lastResult"
      class="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-5 shadow-sm space-y-4 animate-in fade-in zoom-in-95 duration-200"
    >
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-center gap-3">
          <Avatar class="size-12 border-2 border-emerald-500/30">
            <AvatarFallback class="bg-emerald-600 text-white font-bold text-base">
              {{ userInitials }}
            </AvatarFallback>
          </Avatar>

          <div class="space-y-0.5 text-left">
            <p class="font-bold text-base text-foreground">
              {{ store.lastResult.profile ? formatFullName(store.lastResult.profile) : 'Employee' }}
            </p>
            <div class="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" class="text-[10px] uppercase font-semibold">
                {{ store.lastResult.profile?.position || 'Employee' }}
              </Badge>
              <Badge
                v-if="store.lastResult.status"
                class="text-[10px] uppercase font-bold border"
                :class="getStatusBadgeStyle(store.lastResult.status)"
              >
                {{ store.lastResult.status.replace('_', ' ') }}
              </Badge>
            </div>
          </div>
        </div>

        <button
          type="button"
          class="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-emerald-500/20 transition-colors"
          title="Dismiss"
          @click="store.dismissResult"
        >
          <X class="size-4" />
        </button>
      </div>

      <div class="rounded-lg bg-background/80 backdrop-blur-xs p-3 border border-emerald-500/20 text-center space-y-1">
        <div class="flex items-center justify-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
          <CheckCircle2 class="size-4 shrink-0" />
          <span>{{ store.lastResult.punchType ? formatPunchTypeLabel(store.lastResult.punchType) : 'Punch' }} Recorded</span>
        </div>
        <p class="text-xs text-muted-foreground">
          Logged at <span class="font-mono font-medium text-foreground">{{ resultTimeDisplay }}</span>
        </p>
      </div>

      <!-- Auto dismiss progress -->
      <div class="flex items-center justify-between text-[11px] text-muted-foreground px-1">
        <span>Ready for next employee</span>
        <button
          type="button"
          class="underline font-medium hover:text-foreground cursor-pointer"
          @click="store.dismissResult"
        >
          Dismiss ({{ store.countdown }}s)
        </button>
      </div>
    </div>

    <!-- ─── Error Notice ─── -->
    <div
      v-if="store.error"
      class="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-destructive flex items-start gap-3 shadow-xs animate-in fade-in duration-150"
    >
      <AlertCircle class="size-5 shrink-0 mt-0.5" />
      <div class="flex-1 text-sm text-left">
        <p class="font-semibold">Unable to Complete Punch</p>
        <p class="text-xs opacity-90 mt-0.5">{{ store.error }}</p>
      </div>
      <button
        type="button"
        class="p-1 text-destructive/80 hover:text-destructive transition-colors"
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
          Type your employee passcode using the keypad or keyboard
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

    <!-- ─── Keypad Grid ─── -->
    <div class="grid grid-cols-3 gap-2.5 sm:gap-3 max-w-sm mx-auto">
      <template v-for="row in keypadRows" :key="row.join('')">
        <Button
          v-for="digit in row"
          :key="digit"
          type="button"
          :variant="digit === 'C' ? 'destructive' : digit === '⌫' ? 'secondary' : 'outline'"
          class="h-14 sm:h-16 text-xl sm:text-2xl font-semibold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
          :class="[
            digit === 'C'
              ? 'bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground border-destructive/20'
              : digit === '⌫'
              ? 'hover:bg-accent'
              : 'hover:border-primary/50 hover:bg-primary/5 font-mono'
          ]"
          :disabled="store.loading"
          @click="handleKeypadPress(digit)"
        >
          <span v-if="digit === 'C'" class="flex items-center gap-1 text-sm font-bold uppercase tracking-wider">
            <RotateCcw class="size-4" /> Clear
          </span>
          <span v-else-if="digit === '⌫'" class="flex items-center justify-center">
            <Delete class="size-6" />
          </span>
          <span v-else>
            {{ digit }}
          </span>
        </Button>
      </template>
    </div>

    <!-- ─── Action Button ─── -->
    <div class="max-w-sm mx-auto pt-2 space-y-2">
      <Button
        type="button"
        size="lg"
        class="w-full h-13 text-base font-bold shadow-md cursor-pointer transition-all"
        :disabled="store.passcode.length !== 6 || store.loading"
        @click="store.submitAttendance"
      >
        <Loader2 v-if="store.loading" class="size-5 animate-spin mr-2" />
        <Sparkles v-else class="size-5 mr-2" />
        <span>{{ store.loading ? 'Recording Attendance...' : 'Submit Attendance' }}</span>
      </Button>

      <p class="text-[11px] text-muted-foreground text-center">
        Tip: Press <kbd class="px-1.5 py-0.5 text-[10px] font-semibold bg-muted rounded border">Enter</kbd> to submit or <kbd class="px-1.5 py-0.5 text-[10px] font-semibold bg-muted rounded border">Esc</kbd> to clear.
      </p>
    </div>
  </div>
</template>