<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthForm } from '../composables/useAuthForm'
import { supabase } from '../services/supabase'
import Button from '../components/ui/button/Button.vue'
import Input from '../components/ui/input/Input.vue'

const router = useRouter()
const route = useRoute()
const email = ref('')
const password = ref('')
const { error, loading, runAuthAction, validateRequiredFields } = useAuthForm()
const signupSuccess = computed(() => route.query.registered === 'true')

const handleLogin = async () => {
  if (!validateRequiredFields([email.value, password.value])) {
    return
  }

  await runAuthAction(async () => {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value
    })

    if (signInError) {
      throw new Error(signInError.message)
    }

    await router.push({ name: 'dashboard' })
  })
}
</script>

<template>
  <div class="w-full max-w-md">
    <div class="rounded-lg bg-white p-8 shadow-lg">
      <h1 class="mb-2 text-center text-3xl font-bold text-slate-900">Welcome Back</h1>
      <p class="mb-8 text-center text-slate-600">Sign in to your account</p>

      <div v-if="signupSuccess" class="mb-4 rounded-md border border-green-200 bg-green-50 p-3">
        <p class="text-sm text-green-700">Account created successfully. Please sign in.</p>
      </div>

      <form class="space-y-4" @submit.prevent="handleLogin">
        <div>
          <label for="email" class="mb-2 block text-sm font-medium text-slate-700">
            Email
          </label>
          <Input
            id="email"
            v-model="email"
            type="email"
            placeholder="you@example.com"
            :disabled="loading"
          />
        </div>

        <div>
          <label for="password" class="mb-2 block text-sm font-medium text-slate-700">
            Password
          </label>
          <Input
            id="password"
            v-model="password"
            type="password"
            placeholder="••••••••"
            :disabled="loading"
          />
        </div>

        <div v-if="error" class="rounded-md border border-red-200 bg-red-50 p-3">
          <p class="text-sm text-red-700">{{ error }}</p>
        </div>

        <Button
          type="submit"
          :disabled="loading"
          class="w-full bg-blue-600 text-white hover:bg-blue-700"
        >
          {{ loading ? 'Signing in...' : 'Sign In' }}
        </Button>

        <div class="relative">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-slate-300"></div>
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="bg-white px-2 text-slate-500">or</span>
          </div>
        </div>

        <p class="text-center text-slate-600">
          Don't have an account?
          <router-link to="/signup" class="font-semibold text-blue-600 hover:text-blue-700">
            Sign up
          </router-link>
        </p>
      </form>
    </div>
  </div>
</template>

<style scoped>
/* Smooth transitions for loading state */
:deep(input:disabled) {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
