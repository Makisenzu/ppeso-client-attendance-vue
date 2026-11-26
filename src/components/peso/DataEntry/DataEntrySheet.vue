<script setup lang="ts">
import { toRef } from 'vue'
import { AlertCircle, Loader2 } from '@lucide/vue'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import AnnexDFormFields from '@/components/common/DataEntry/AnnexDFormFields.vue'
import { useAnnexDForm } from '@/composables/common/useAnnexDForm'
import type { AnnexDEntry, AnnexDEntryInsert } from '@/types/common/dataEntry'

const props = defineProps<{
  open: boolean
  entry: AnnexDEntry | null
  isSubmitting?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'submit', payload: AnnexDEntryInsert): void
}>()

const formState = useAnnexDForm({
  open: toRef(props, 'open'),
  entry: toRef(props, 'entry'),
  onSubmit: (payload) => emit('submit', payload),
  onClose: () => emit('update:open', false),
})
const { errors, isEditMode, handleClose, handleSubmit } = formState
</script>

<template>
  <Sheet :open="open" @update:open="emit('update:open', $event)">
    <SheetContent side="right" class="flex h-full w-full flex-col gap-0 p-0 sm:max-w-2xl">
      <SheetHeader class="shrink-0 border-b border-border px-6 pt-6 pb-4">
        <SheetTitle class="text-xl font-bold tracking-tight">{{ isEditMode ? 'Edit Entry' : 'Add Entry' }}</SheetTitle>
        <SheetDescription class="text-xs">One TUPAD beneficiary, as listed on ANNEX D.</SheetDescription>
      </SheetHeader>

      <form class="contents" novalidate @submit.prevent="handleSubmit">
        <div class="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <div
            v-if="Object.keys(errors).length > 0"
            class="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive"
            role="alert"
          >
            <AlertCircle class="h-4 w-4 shrink-0" />
            <span>Check the highlighted fields.</span>
          </div>

          <AnnexDFormFields :state="formState" />
        </div>

        <div class="flex shrink-0 justify-end gap-3 border-t border-border px-6 py-4">
          <Button type="button" variant="outline" size="sm" class="text-xs cursor-pointer" :disabled="isSubmitting" @click="handleClose">
            Cancel
          </Button>
          <Button type="submit" size="sm" class="gap-1.5 text-xs cursor-pointer" :disabled="isSubmitting">
            <Loader2 v-if="isSubmitting" class="h-3.5 w-3.5 animate-spin" />
            <span>{{ isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Add Entry' }}</span>
          </Button>
        </div>
      </form>
    </SheetContent>
  </Sheet>
</template>
