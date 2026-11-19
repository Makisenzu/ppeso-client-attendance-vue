<script setup lang="ts">
import { useRubberSegment } from '@/composables/common/useRubberSegment'
import type { RubberSegmentOption } from '@/composables/common/useRubberSegment'

/**
 * Segmented control with a rubber-band thumb (ported from the RubberSegment of the vue-ppeso-agsurjob project,
 * themed with design tokens). v-model is the picked option's value, or null when nothing is picked yet.
 */
const props = withDefaults(
  defineProps<{
    options: RubberSegmentOption[]
    disabled?: boolean
    ariaLabel?: string
    ariaLabelledby?: string
  }>(),
  { disabled: false, ariaLabel: undefined, ariaLabelledby: undefined },
)

const model = defineModel<string | null>({ default: null })

const {
  thumbStyle,
  isThumbVisible,
  isHeld,
  isSelected,
  isPressed,
  tabIndexFor,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onKeyDown,
} = useRubberSegment({ items: () => props.options, model, disabled: () => props.disabled })

const cellClass =
  'inline-flex h-9 min-w-0 items-center justify-center rounded-md px-2 text-sm font-semibold leading-none whitespace-nowrap select-none'
</script>

<template>
  <div
    ref="track"
    role="radiogroup"
    :aria-label="ariaLabel"
    :aria-labelledby="ariaLabelledby"
    :aria-disabled="disabled || undefined"
    class="relative grid grid-flow-col auto-cols-fr rounded-lg border border-border bg-muted/60 p-1 touch-pan-y select-none [-webkit-tap-highlight-color:transparent]"
    :class="[disabled ? 'opacity-80' : '', isHeld ? 'cursor-grabbing' : '']"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel"
    @lostpointercapture="onPointerCancel"
  >
    <!-- Options (resting labels) -->
    <button
      v-for="(option, i) in options"
      :key="option.value"
      type="button"
      role="radio"
      :aria-checked="isSelected(i)"
      :aria-label="option.description ?? option.label"
      :title="option.description"
      :tabindex="tabIndexFor(i)"
      :disabled="disabled"
      :class="[
        cellClass,
        'text-muted-foreground transition-[color,transform] duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring',
        disabled ? 'cursor-default' : isSelected(i) ? 'cursor-grab' : 'cursor-pointer hover:text-foreground',
        isPressed(i) && 'scale-95',
      ]"
      @pointerdown="onPointerDown($event, i)"
      @keydown="onKeyDown"
    >
      {{ option.label }}
    </button>

    <!-- Thumb: a coloured copy of the labels, clipped to the thumb's edges -->
    <div
      class="pointer-events-none absolute inset-1 grid grid-flow-col auto-cols-fr rounded-md bg-primary text-primary-foreground shadow-sm transition-opacity duration-150"
      :class="isThumbVisible ? 'opacity-100' : 'opacity-0'"
      :style="thumbStyle"
      aria-hidden="true"
    >
      <span v-for="option in options" :key="option.value" :class="cellClass">{{ option.label }}</span>
    </div>
  </div>
</template>
