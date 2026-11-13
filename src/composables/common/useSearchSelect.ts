import { computed, nextTick, ref, watch, type Ref } from 'vue'
import { onClickOutside } from '@vueuse/core'
import type { SearchSelectOption } from '@/types/common/searchSelect'

export type { SearchSelectOption }

export interface UseSearchSelectOptions {
  options: () => SearchSelectOption[]
  searchable: () => boolean
  disabled: () => boolean
  model: Ref<string>
  /** Root element: clicks outside it close the list. */
  root: Readonly<Ref<HTMLElement | null>>
  onChange: (value: string) => void
}

/** State and behaviour for SearchSelect.vue (open / close, search, selection). */
export function useSearchSelect(options: UseSearchSelectOptions) {
  const isOpen = ref(false)
  const search = ref('')

  const selectedOption = computed(
    () => options.options().find((o) => o.value === options.model.value) ?? null,
  )

  const filteredOptions = computed(() => {
    const all = options.options()
    const q = search.value.trim().toLowerCase()
    if (!options.searchable() || !q) return all
    return all.filter(
      (o) => o.label.toLowerCase().includes(q) || (o.description || '').toLowerCase().includes(q),
    )
  })

  const close = () => {
    isOpen.value = false
    search.value = ''
  }

  const toggle = () => {
    if (options.disabled()) return
    if (isOpen.value) close()
    else isOpen.value = true
  }

  const select = (option: SearchSelectOption) => {
    if (option.disabled) return
    const changed = option.value !== options.model.value
    options.model.value = option.value
    close()
    if (changed) options.onChange(option.value)
  }

  onClickOutside(options.root, () => {
    if (isOpen.value) close()
  })

  watch(options.disabled, (disabled) => {
    if (disabled) close()
  })

  // Focus the search box when the list opens.
  watch(isOpen, async (open) => {
    if (!open || !options.searchable()) return
    await nextTick()
    options.root.value?.querySelector<HTMLInputElement>('input')?.focus()
  })

  return { isOpen, search, selectedOption, filteredOptions, close, toggle, select }
}
