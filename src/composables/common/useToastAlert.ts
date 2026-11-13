import { readonly, ref } from 'vue'

export type ToastType = 'success' | 'error'

export interface ToastItem {
  id: number
  type: ToastType
  text: string
}

const AUTO_DISMISS_MS = 4000
const MAX_VISIBLE = 4

// Module-level: one toast stack for the whole app, rendered by ToastAlert.vue in App.vue.
const toasts = ref<ToastItem[]>([])
const timers = new Map<number, ReturnType<typeof setTimeout>>()
let nextId = 1

function dismiss(id: number) {
  const timer = timers.get(id)
  if (timer) clearTimeout(timer)
  timers.delete(id)
  toasts.value = toasts.value.filter((t) => t.id !== id)
}

function show(text: string, type: ToastType = 'success') {
  const id = nextId++
  // Oldest drop off first when too many stack up.
  const kept = toasts.value.slice(-(MAX_VISIBLE - 1))
  toasts.value.filter((t) => !kept.includes(t)).forEach((t) => dismiss(t.id))
  toasts.value = [...kept, { id, type, text }]
  timers.set(id, setTimeout(() => dismiss(id), AUTO_DISMISS_MS))
  return id
}

/**
 * App-wide alerts for create / update / delete results, shown in the top-right corner.
 * Call `success()` / `error()` from composables; never render your own banner (DESIGN.md §12).
 */
export function useToastAlert() {
  return {
    toasts: readonly(toasts),
    show,
    success: (text: string) => show(text, 'success'),
    error: (text: string) => show(text, 'error'),
    dismiss,
  }
}
