<script setup lang="ts">
import { toRef, type HTMLAttributes } from 'vue'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAvatarUrl } from '@/composables/common/useAvatarUrl'

/** A person's profile picture when they set one, otherwise their initials (tables, pickers, dialogs) */
const props = defineProps<{
  path?: string | null
  initials: string
  alt?: string
  class?: HTMLAttributes['class']
  fallbackClass?: HTMLAttributes['class']
}>()

const { url } = useAvatarUrl(toRef(props, 'path'))
</script>

<template>
  <Avatar :class="props.class">
    <AvatarImage v-if="url" :src="url" :alt="alt ?? ''" />
    <AvatarFallback :class="fallbackClass ?? 'bg-primary/10 text-primary'">{{ initials }}</AvatarFallback>
  </Avatar>
</template>
