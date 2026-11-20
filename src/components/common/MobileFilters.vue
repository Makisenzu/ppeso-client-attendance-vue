<script setup lang="ts">
/**
 * Folds a table's filter controls behind one "Filters" button on phones (DESIGN.md §10.1).
 * Desktop is untouched: the wrapper uses `md:contents`, so the slotted controls stay direct children of the
 * page's own filter grid. Place it inside that grid, after the search input, around the filter controls.
 */
import { ref } from 'vue'
import { ChevronDown, SlidersHorizontal } from '@lucide/vue'

defineProps<{
  /** Shows a dot on the button when any filter is set, so a folded filter is never forgotten. */
  active?: boolean
}>()

const isOpen = ref(false)
</script>

<template>
  <button
    type="button"
    class="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground shadow-xs cursor-pointer md:hidden"
    :aria-expanded="isOpen"
    @click="isOpen = !isOpen"
  >
    <span class="flex items-center gap-2">
      <SlidersHorizontal class="h-3.5 w-3.5 text-muted-foreground" />
      Filters
      <span v-if="active" class="h-1.5 w-1.5 rounded-full bg-primary" aria-label="Filters applied" />
    </span>
    <ChevronDown class="h-3.5 w-3.5 text-muted-foreground transition-transform" :class="isOpen && 'rotate-180'" />
  </button>
  <div :class="isOpen ? 'contents' : 'hidden'" class="md:contents">
    <slot />
  </div>
</template>
