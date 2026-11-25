<script setup lang="ts">
import { Building2, Loader2, LogOut } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { defineAsyncComponent } from 'vue'
// Lazy: AeroShard pulls in vgpu (~260 kB); KioskLayout is imported eagerly by the router, so a static import put
// it in the main bundle for every user.
const AeroShard = defineAsyncComponent(() => import('@/components/vuebits/AeroShard.vue'))
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useKioskStation } from '@/composables/kiosk/useKioskStation'

const {
  station,
  officeLabel,
  hasOffice,
  isLoading,
  loadError,
  isSignOutOpen,
  isSigningOut,
  openSignOut,
  onSignOutOpenChange,
  confirmSignOut,
} = useKioskStation()
</script>

<template>
  <div class="flex min-h-screen flex-col bg-background text-foreground">
    <!--
      AeroShard background, "Emerald" preset. Needs WebGPU; where it isn't available the canvas stays empty and the
      plain bg-background shows. Reduced motion freezes it. Shard / accent colors are the component's Emerald
      defaults (#6abd89 / #7cff67), left unset so no hex values live here (AGENTS.md rule 11). The wrapper ignores
      pointer events so the keypad stays clickable; cursor, click-pulse and hold-to-gather listen on the window.
    -->
    <div class="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
      <AeroShard
        placement="full"
        material="glass"
        markers="plus"
        :count="1300"
        :shard-size="1"
        :spread="1"
        :twist="1"
        :billow="1"
        :speed="1"
        :scale="1"
        :depth-of-field="0.75"
        :glow="0.35"
        :grain="0.06"
        :vignette="0.3"
        :mouse-strength="0.6"
        :parallax="0.5"
        :intro="true"
        :mouse-interaction="true"
        :pulse-on-click="true"
        :hold-to-gather="true"
        :light-mode="false"
        :paused="false"
      />
    </div>

    <!-- Office kiosk: no sidebar, only the office it belongs to -->
    <header class="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-3 border-b border-border/60 bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/60">
      <img src="/agsur.png" alt="PPMIS Logo" class="size-9 object-contain">
      <div class="min-w-0">
        <p class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">PPMIS · Attendance Kiosk</p>
        <div class="flex items-center gap-1.5 min-w-0">
          <Building2 class="size-3.5 shrink-0 text-primary" />
          <h1 class="truncate text-sm font-semibold text-foreground">
            {{ isLoading ? 'Loading...' : officeLabel }}
          </h1>
        </div>
      </div>

      <div class="ml-auto flex items-center gap-1">
        <span v-if="station?.label" class="mr-2 hidden text-xs text-muted-foreground sm:inline">{{ station.label }}</span>
        <button
          type="button"
          class="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          title="Sign out of this kiosk"
          aria-label="Sign out of this kiosk"
          @click="openSignOut"
        >
          <LogOut class="size-4 shrink-0" />
        </button>
      </div>
    </header>

    <main class="relative z-10 flex-1 p-4 sm:p-6">
      <div
        v-if="!isLoading && (loadError || !hasOffice)"
        class="mx-auto mb-6 max-w-xl rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
      >
        {{ loadError || 'This kiosk has no office assigned, so it cannot record attendance. Ask an administrator to assign one.' }}
      </div>
      <RouterView />
    </main>

    <Dialog :open="isSignOutOpen" @update:open="onSignOutOpenChange">
      <DialogContent class="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle class="text-base">Sign out of this kiosk?</DialogTitle>
          <DialogDescription class="text-xs">
            Attendance stops until the kiosk account signs in again.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter class="gap-2">
          <Button variant="outline" size="sm" class="text-xs cursor-pointer" :disabled="isSigningOut" @click="onSignOutOpenChange(false)">
            Cancel
          </Button>
          <Button variant="destructive" size="sm" class="gap-1.5 text-xs cursor-pointer" :disabled="isSigningOut" @click="confirmSignOut">
            <Loader2 v-if="isSigningOut" class="h-3.5 w-3.5 animate-spin" />
            <span>{{ isSigningOut ? 'Signing out...' : 'Sign Out' }}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
