<script setup lang="ts">
import { AlertTriangle, CheckCircle2, X } from '@lucide/vue'
import { useToastAlert } from '@/composables/common/useToastAlert'

/** Top-right toast stack for CRUD results. Mounted once in App.vue. */
const { toasts, dismiss } = useToastAlert()
</script>

<template>
  <Teleport to="body">
    <div
      class="pointer-events-none fixed inset-x-4 top-4 z-[100] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-4 sm:w-96"
      aria-live="polite"
      aria-atomic="false"
    >
      <TransitionGroup
        enter-active-class="transition duration-200 ease-out motion-reduce:transition-none"
        enter-from-class="translate-x-4 opacity-0"
        leave-active-class="transition duration-150 ease-in motion-reduce:transition-none"
        leave-to-class="translate-x-4 opacity-0"
      >
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="pointer-events-auto flex w-full items-start gap-3 rounded-lg border bg-card p-3.5 text-xs shadow-lg"
          :class="
            toast.type === 'success'
              ? 'border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
              : 'border-destructive/30 text-destructive'
          "
          :role="toast.type === 'error' ? 'alert' : 'status'"
        >
          <CheckCircle2 v-if="toast.type === 'success'" class="mt-0.5 h-4 w-4 shrink-0" />
          <AlertTriangle v-else class="mt-0.5 h-4 w-4 shrink-0" />
          <span class="flex-1 font-medium leading-snug">{{ toast.text }}</span>
          <button
            type="button"
            class="-m-1 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
            aria-label="Dismiss"
            @click="dismiss(toast.id)"
          >
            <X class="h-3.5 w-3.5" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
