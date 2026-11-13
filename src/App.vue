<script setup lang="ts">
import { RouterView } from 'vue-router'
import ToastAlert from '@/components/common/ToastAlert.vue'
</script>

<template>
  <!--
    No <transition mode="out-in"> here: wrapping the layouts in one (with AuthLayout holding a second one)
    left the dashboard blank after login until a refresh. See .agents/DESIGN.md §9.
  -->
  <RouterView />

  <!-- CRUD alerts, top-right on every page (useToastAlert). -->
  <ToastAlert />
</template>
