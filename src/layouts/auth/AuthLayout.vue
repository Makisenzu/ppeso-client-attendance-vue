<script setup lang="ts">
import { RouterView } from 'vue-router'
import { Moon, Sun } from '@lucide/vue'
import { useColorMode } from '@vueuse/core'

const mode = useColorMode()

function toggleTheme() {
  mode.value = mode.value === 'dark' ? 'light' : 'dark'
}
</script>

<template>
  <div class="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
    <div class="absolute inset-0 bg-black/10" />

    <button
      @click="toggleTheme"
      class="absolute right-4 top-4 z-20 flex size-8 items-center justify-center rounded-md bg-white/10 text-white/80 backdrop-blur hover:bg-white/20 hover:text-white transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/70"
      title="Toggle color theme"
    >
      <component :is="mode === 'dark' ? Sun : Moon" class="size-4 shrink-0" />
    </button>

    <div class="relative z-10 flex min-h-screen items-center justify-center p-6">
      <RouterView v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </RouterView>
    </div>
  </div>
</template>