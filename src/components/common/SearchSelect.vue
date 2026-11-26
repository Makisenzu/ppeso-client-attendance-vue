<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { Check, ChevronDown, Search } from '@lucide/vue'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useSearchSelect } from '@/composables/common/useSearchSelect'
import type { SearchSelectOption } from '@/types/common/searchSelect'

/**
 * Single-choice dropdown styled like the Add Office directory picker: a trigger button,
 * a popup list with an optional search box, and a check on the selected option.
 */
const props = withDefaults(
  defineProps<{
    options: SearchSelectOption[]
    placeholder?: string
    searchPlaceholder?: string
    /** Show the search box (use for long lists). */
    searchable?: boolean
    emptyText?: string
    disabled?: boolean
    invalid?: boolean
    /** Show the chosen value and the options in capital letters (the placeholder stays as written). */
    uppercase?: boolean
    id?: string
    class?: string
  }>(),
  {
    placeholder: 'Select an option',
    searchPlaceholder: 'Search...',
    searchable: true,
    emptyText: 'No matches found.',
    disabled: false,
    invalid: false,
    uppercase: false,
  },
)

const model = defineModel<string>({ default: '' })
const emit = defineEmits<{ (e: 'change', value: string): void }>()

const { isOpen, dropUp, search, selectedOption, filteredOptions, close, toggle, select } = useSearchSelect({
  options: () => props.options,
  searchable: () => props.searchable,
  disabled: () => props.disabled,
  model,
  root: useTemplateRef<HTMLElement>('root'),
  onChange: (value) => emit('change', value),
})
</script>

<template>
  <div ref="root" :class="cn('relative', props.class)" @keydown.esc.stop="close">
    <button
      :id="id"
      type="button"
      class="flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-left text-base transition-colors hover:bg-muted/30 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 md:text-xs"
      :class="invalid ? 'border-destructive' : 'border-input'"
      :disabled="disabled"
      aria-haspopup="listbox"
      :aria-expanded="isOpen"
      @click="toggle"
    >
      <span v-if="selectedOption" class="min-w-0 truncate font-medium text-foreground">
        <span :class="uppercase && 'uppercase'">{{ selectedOption.label }}</span>
      </span>
      <span v-else class="truncate text-muted-foreground">{{ placeholder }}</span>
      <ChevronDown
        class="h-4 w-4 shrink-0 text-muted-foreground transition-transform"
        :class="isOpen ? 'rotate-180' : ''"
      />
    </button>

    <div
      v-if="isOpen"
      class="absolute z-50 w-full overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg animate-in fade-in zoom-in-95"
      :class="dropUp ? 'bottom-full mb-1' : 'top-full mt-1'"
    >
      <div v-if="searchable" class="border-b bg-muted/20 p-2">
        <div class="relative">
          <Search class="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input v-model="search" :placeholder="searchPlaceholder" class="h-8 bg-background pl-8 text-base md:text-xs" />
        </div>
      </div>

      <div class="max-h-60 divide-y divide-border/40 overflow-y-auto [scrollbar-width:thin]" role="listbox">
        <button
          v-for="option in filteredOptions"
          :key="option.value"
          type="button"
          role="option"
          :aria-selected="option.value === model"
          class="flex w-full items-start justify-between gap-2 p-2.5 text-left text-xs transition-colors"
          :class="option.disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-muted/50 cursor-pointer'"
          :disabled="option.disabled"
          @click="select(option)"
        >
          <div class="min-w-0">
            <div class="truncate font-medium text-foreground" :class="uppercase && 'uppercase'">{{ option.label }}</div>
            <div v-if="option.description" class="truncate text-[11px] text-muted-foreground">
              {{ option.description }}
            </div>
          </div>
          <Check v-if="option.value === model" class="h-4 w-4 shrink-0 text-primary" />
        </button>
        <div v-if="filteredOptions.length === 0" class="p-3 text-center text-xs text-muted-foreground">
          {{ emptyText }}
        </div>
      </div>
    </div>
  </div>
</template>
