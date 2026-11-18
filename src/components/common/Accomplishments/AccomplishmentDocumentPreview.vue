<script setup lang="ts">
import { useDocumentPreview } from '@/composables/common/useDocumentPreview'

/** An accomplishment report on its official form, exactly as Print sends it, scaled to fit its container. */
defineProps<{
  document: string
  title?: string
}>()

const { previewBoxStyle, previewFrameStyle, onPreviewLoad } = useDocumentPreview()
</script>

<template>
  <div class="rounded-lg bg-muted/30 p-2 sm:p-3">
    <!-- The official form is black on white in both themes, like the printout. No sandbox: the document is built by
         accomplishmentPrintHelper (every value escaped, no scripts). Sizes are computed at runtime (inline styles). -->
    <div ref="previewBox" class="relative w-full overflow-hidden" :style="previewBoxStyle">
      <iframe
        :srcdoc="document"
        :title="title ?? 'Accomplishment report as printed'"
        class="absolute left-0 top-0 border-0 shadow-md"
        :style="previewFrameStyle"
        @load="onPreviewLoad"
      />
    </div>
  </div>
</template>
