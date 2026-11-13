<script setup lang="ts">
import { Eye, EyeOff } from '@lucide/vue'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { usePasswordVisibility } from '@/composables/common/usePasswordVisibility'

/** Password field with a show / hide eye button (same as vue-agsurjobs). */
defineOptions({ inheritAttrs: false })

const props = defineProps<{ class?: string; disabled?: boolean }>()
const model = defineModel<string>({ default: '' })

const { isVisible, inputType, toggleLabel, toggleVisibility } = usePasswordVisibility()
</script>

<template>
  <div class="relative w-full">
    <Input
      v-bind="$attrs"
      v-model="model"
      :type="inputType"
      :disabled="props.disabled"
      :class="cn('pr-9', props.class)"
    />
    <button
      type="button"
      class="absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground hover:text-foreground cursor-pointer disabled:pointer-events-none disabled:opacity-50"
      :aria-label="toggleLabel"
      :aria-pressed="isVisible"
      :disabled="props.disabled"
      @click="toggleVisibility"
    >
      <EyeOff v-if="isVisible" class="size-4" />
      <Eye v-else class="size-4" />
    </button>
  </div>
</template>
