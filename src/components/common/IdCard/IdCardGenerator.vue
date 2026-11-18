<script setup lang="ts">
import { toRef } from 'vue'
import { ImageOff, Loader2, Printer, Upload, X } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useIdCard } from '@/composables/common/useIdCard'

const props = defineProps<{
  /** Whose ID: any GIP user for admins, the signed-in user on My ID */
  profileId: string | null
  /** Show a Cancel button (in a dialog) */
  cancelable?: boolean
}>()
const emit = defineEmits<{ cancel: [] }>()

const {
  person,
  isLoadingPerson,
  loadError,
  isGip,
  step,
  nickname,
  nicknameMax,
  nicknameError,
  onNicknameInput,
  photoUrl,
  photoError,
  choosePhoto,
  onPhotoSelected,
  removePhoto,
  isGenerating,
  generate,
  previewSvg,
  backToForm,
  isPrinting,
  print,
} = useIdCard(toRef(props, 'profileId'))
</script>

<template>
  <div class="grid gap-4">
    <div v-if="isLoadingPerson" class="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground">
      <Loader2 class="h-4 w-4 animate-spin" />
      <span>Loading...</span>
    </div>

    <p v-else-if="loadError" class="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">{{ loadError }}</p>

    <p v-else-if="person && !isGip" class="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
      The ID is for GIP beneficiaries only.
    </p>

    <!-- ─── Step 1: nickname and photo ─── -->
    <form v-else-if="person && step === 'form'" class="grid gap-4" novalidate @submit.prevent="generate">
      <div class="rounded-lg border bg-muted/20 p-3 text-xs">
        <p class="font-semibold text-foreground">{{ person.fullName }}</p>
        <p class="text-muted-foreground">{{ person.office || 'No office assigned' }}</p>
      </div>

      <div class="grid gap-1.5">
        <Label for="id-nickname" class="text-xs">Nickname <span class="text-destructive">*</span></Label>
        <Input
          id="id-nickname"
          v-model="nickname"
          :maxlength="nicknameMax"
          autocomplete="off"
          placeholder="e.g. Kate"
          class="h-9 text-base md:text-xs"
          :aria-invalid="!!nicknameError"
          @input="onNicknameInput"
        />
        <p v-if="nicknameError" class="text-xs text-destructive">{{ nicknameError }}</p>
      </div>

      <div class="grid gap-1.5">
        <Label class="text-xs">Photo <span class="font-normal text-muted-foreground">(optional, not saved)</span></Label>
        <div class="flex items-center gap-4">
          <div class="flex h-28 w-[5.6rem] shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
            <img v-if="photoUrl" :src="photoUrl" alt="ID photo" class="size-full object-cover" />
            <ImageOff v-else class="size-5 text-muted-foreground" />
          </div>
          <div class="flex flex-col items-start gap-2">
            <Button type="button" variant="outline" size="sm" class="gap-1.5 text-xs cursor-pointer" @click="choosePhoto">
              <Upload class="h-3.5 w-3.5" />
              <span>{{ photoUrl ? 'Change Photo' : 'Upload Photo' }}</span>
            </Button>
            <Button v-if="photoUrl" type="button" variant="ghost" size="sm" class="gap-1.5 text-xs cursor-pointer" @click="removePhoto">
              <X class="h-3.5 w-3.5" />
              <span>No Photo</span>
            </Button>
          </div>
          <input ref="photoInput" type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="onPhotoSelected" />
        </div>
        <p v-if="photoError" class="text-xs text-destructive">{{ photoError }}</p>
      </div>

      <div class="flex justify-end gap-2">
        <Button v-if="cancelable" type="button" variant="outline" size="sm" class="text-xs cursor-pointer" @click="emit('cancel')">Cancel</Button>
        <Button type="submit" size="sm" class="gap-1.5 text-xs cursor-pointer font-semibold" :disabled="isGenerating">
          <Loader2 v-if="isGenerating" class="h-3.5 w-3.5 animate-spin" />
          <span>{{ isGenerating ? 'Generating...' : 'Generate' }}</span>
        </Button>
      </div>
    </form>

    <!-- ─── Step 2: preview and print ─── -->
    <template v-else-if="person && step === 'preview'">
      <!-- Built from escaped text, app image URLs and the picked photo only (idCardHelper) -->
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="mx-auto w-full max-w-[280px] border shadow-sm [&_svg]:h-auto [&_svg]:w-full" v-html="previewSvg" />
      <p class="text-center text-[11px] text-muted-foreground">Prints two copies. Print at 100% (Actual size).</p>
      <div class="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" class="text-xs cursor-pointer" :disabled="isPrinting" @click="backToForm">Back</Button>
        <Button type="button" size="sm" class="gap-1.5 text-xs cursor-pointer font-semibold" :disabled="isPrinting" @click="print">
          <Loader2 v-if="isPrinting" class="h-3.5 w-3.5 animate-spin" />
          <Printer v-else class="h-3.5 w-3.5" />
          <span>Print</span>
        </Button>
      </div>
    </template>
  </div>
</template>
