<script setup lang="ts">
import { Loader2, Wrench, X } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { AttendancePunchTimes } from '@/types/peso/attendance'

/** Admin form for a day's four punch times (Attendance Records → Edit DTR, Fix DTR). Rendering only. */
defineProps<{
  open: boolean
  description: string
  slots: { key: keyof AttendancePunchTimes; label: string }[]
  error: string
  saving: boolean
}>()

const form = defineModel<Record<keyof AttendancePunchTimes, string>>('form', { required: true })

const emit = defineEmits<{
  close: []
  save: []
  clear: [key: keyof AttendancePunchTimes]
}>()
</script>

<template>
  <Dialog :open="open" @update:open="(val) => (!val ? emit('close') : null)">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Wrench class="h-5 w-5" />
          </div>
          <div>
            <DialogTitle class="text-base font-semibold text-foreground">Edit DTR</DialogTitle>
            <DialogDescription class="text-xs text-muted-foreground mt-0.5">{{ description }}</DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <form class="space-y-3" @submit.prevent="emit('save')">
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div v-for="slot in slots" :key="slot.key" class="space-y-1.5">
            <label :for="`edit-dtr-${slot.key}`" class="text-xs font-medium text-foreground">{{ slot.label }}</label>
            <div class="flex items-center gap-1">
              <Input
                :id="`edit-dtr-${slot.key}`"
                v-model="form[slot.key]"
                type="time"
                class="h-9 min-w-0 flex-1 text-base md:text-xs font-mono"
                :disabled="saving"
              />
              <Button
                v-if="form[slot.key]"
                type="button"
                variant="ghost"
                size="icon"
                class="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
                :title="`Clear ${slot.label}`"
                :disabled="saving"
                @click="emit('clear', slot.key)"
              >
                <X class="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        <!-- Extra fields (Fix DTR: special day) -->
        <slot />

        <p v-if="error" class="text-[11px] text-destructive">{{ error }}</p>

        <DialogFooter class="gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="text-xs cursor-pointer"
            :disabled="saving"
            @click="emit('close')"
          >
            Cancel
          </Button>
          <Button type="submit" size="sm" class="text-xs cursor-pointer gap-1.5" :disabled="saving">
            <Loader2 v-if="saving" class="h-3.5 w-3.5 animate-spin" />
            <span>{{ saving ? 'Saving...' : 'Save Changes' }}</span>
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
