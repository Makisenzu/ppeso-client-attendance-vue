<script setup lang="ts">
import type { PrimitiveProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { Primitive } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = defineProps<PrimitiveProps & {
  class?: HTMLAttributes['class']
}>()

const delegatedProps = reactiveOmit(props, 'class')
</script>

<template>
  <Primitive
    data-slot="badge"
    :class="cn('inline-flex h-5 w-fit shrink-0 items-center justify-center rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium', props.class)"
    v-bind="delegatedProps"
  >
    <slot />
  </Primitive>
</template>
