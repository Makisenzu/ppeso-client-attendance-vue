<script setup lang="ts">
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import AnnexDFormFields from '@/components/common/DataEntry/AnnexDFormFields.vue'
import { usePublicDataEntry } from '@/composables/common/usePublicDataEntry'

const {
  formState,
  errors,
  handleSubmit,
  isSubmitting,
  errorMessage,
  savedThisSession,
  clearAll,
  logos,
  backgroundImage,
} = usePublicDataEntry()
</script>

<template>
  <!-- Always dark (route meta.forceDark), same backdrop as the login and walk-in pages. -->
  <div class="flex w-full justify-center">
    <!-- ─── Background ─── -->
    <div class="pointer-events-none fixed inset-0 overflow-hidden bg-background" aria-hidden="true">
      <div
        class="absolute inset-0 bg-cover bg-center saturate-[0.85]"
        :style="{ backgroundImage: `url(${backgroundImage})` }"
      />
      <div class="absolute inset-0 bg-background/70" />
      <div class="absolute inset-0 bg-linear-to-t from-background via-background/60 to-background/20" />
    </div>

    <div class="relative w-full max-w-3xl">
      <!-- Frosted card (no overflow-hidden: it would clip the SearchSelect popups) -->
      <div class="w-full rounded-2xl border border-foreground/10 bg-card/70 p-5 shadow-2xl shadow-background/60 backdrop-blur-xl sm:p-8">
        <!-- ─── Brand ─── -->
        <div class="flex items-center gap-3">
          <div class="flex -space-x-2">
            <img
              v-for="logo in logos"
              :key="logo.src"
              :src="logo.src"
              :alt="logo.alt"
              class="size-10 shrink-0 rounded-full object-cover ring-2 ring-background sm:size-11"
            />
          </div>
          <div class="min-w-0 leading-tight">
            <p class="truncate text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Province of Agusan del Sur
            </p>
            <p class="truncate text-sm font-semibold text-foreground">Provincial PESO</p>
          </div>
        </div>

        <div class="mt-7">
          <h1 class="text-2xl font-semibold tracking-tight">TUPAD Beneficiary Data Entry</h1>
          <p class="mt-1 text-sm text-muted-foreground">
            Encode one beneficiary at a time for the DOLE ANNEX D profile.
          </p>
        </div>

        <div class="mt-5 flex items-start gap-2.5 rounded-xl border border-border bg-foreground/[0.03] p-3.5 text-xs leading-relaxed text-muted-foreground">
          <ShieldCheck class="mt-0.5 size-4 shrink-0 text-primary" />
          <span>
            For PESO staff only. These details are confidential under the Data Privacy Act of 2012 (RA 10173): encode
            only what is on the beneficiary's form, and don't share this link outside the office.
          </span>
        </div>

        <form class="mt-6" novalidate @submit.prevent="handleSubmit">
          <div
            v-if="errorMessage"
            class="mb-5 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
            role="alert"
          >
            <AlertCircle class="mt-0.5 size-4 shrink-0" />
            <span>{{ errorMessage }}</span>
          </div>
          <div
            v-else-if="Object.keys(errors).length > 0"
            class="mb-5 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
            role="alert"
          >
            <AlertCircle class="size-4 shrink-0" />
            <span>Check the highlighted fields.</span>
          </div>

          <AnnexDFormFields :state="formState" />

          <!-- ─── Actions ─── -->
          <div class="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="ghost" class="w-full sm:w-auto" :disabled="isSubmitting" @click="clearAll">
              Clear all
            </Button>
            <div class="flex flex-col gap-1 sm:items-end">
              <Button type="submit" class="w-full sm:w-auto sm:min-w-36" :disabled="isSubmitting">
                <Loader2 v-if="isSubmitting" class="size-4 animate-spin" />
                {{ isSubmitting ? 'Saving...' : 'Save entry' }}
              </Button>
              <p class="text-center text-[11px] text-muted-foreground sm:text-right">
                Location and type of beneficiary stay filled for the next entry.
              </p>
            </div>
          </div>
        </form>

        <!-- ─── Saved this visit ─── -->
        <div v-if="savedThisSession.length > 0" class="mt-8 border-t border-border pt-5">
          <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Saved from this device · {{ savedThisSession.length }}
          </p>
          <ul class="mt-3 max-h-48 space-y-1.5 overflow-y-auto text-sm">
            <li v-for="(name, i) in savedThisSession" :key="`${i}-${name}`" class="flex items-center gap-2 text-foreground">
              <CheckCircle2 class="size-3.5 shrink-0 text-primary" />
              <span class="truncate">{{ name }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
