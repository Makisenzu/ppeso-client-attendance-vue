<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { checkSupabaseConnection } from './services/supabase'

const status = ref<'checking' | 'connected' | 'error'>('checking')
const message = ref('Checking Supabase connection...')
const sessionMessage = ref('')

onMounted(async () => {
  try {
    const result = await checkSupabaseConnection()
    status.value = 'connected'
    sessionMessage.value = result.hasSession
      ? 'A Supabase session is active.'
      : 'No user is currently logged in, but the connection is working.'
    message.value = `Connected to: ${import.meta.env.VITE_SUPABASE_URL}`
  } catch (error) {
    status.value = 'error'
    message.value = error instanceof Error ? error.message : 'Unknown Supabase error.'
    sessionMessage.value = 'The app could not connect to Supabase.'
  }
})
</script>

<template>
  <main class="container">
    <div class="card">
      <p class="label">Supabase status</p>
      <h1 :class="status">{{ status === 'connected' ? 'Connected' : status === 'error' ? 'Error' : 'Checking...' }}</h1>
      <p class="message">{{ message }}</p>
      <p class="session-message">{{ sessionMessage }}</p>
    </div>
  </main>
</template>
