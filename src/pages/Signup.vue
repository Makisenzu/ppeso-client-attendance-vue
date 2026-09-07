<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthForm } from '../composables/useAuthForm'
import { supabase } from '../services/supabase'
import type { Database } from '../types/database.types'
import Button from '../components/ui/button/Button.vue'
import Input from '../components/ui/input/Input.vue'

const router = useRouter()
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const fullName = ref('')
const { error, loading, runAuthAction, setError, validateRequiredFields } = useAuthForm()
const defaultPosition: Database['public']['Enums']['profile_position'] = 'employee'

const validateForm = (): boolean => {
  if (!validateRequiredFields([email.value, password.value, confirmPassword.value, fullName.value])) {
    return false
  }

  if (password.value !== confirmPassword.value) {
    setError('Passwords do not match')
    return false
  }

  if (password.value.length < 6) {
    setError('Password must be at least 6 characters')
    return false
  }

  return true
}

const handleSignup = async () => {
  if (!validateForm()) {
    return
  }

  await runAuthAction(async () => {
    const { error: signUpError } = await supabase.auth.signUp({
      email: email.value,
      password: password.value,
      options: {
        data: {
          full_name: fullName.value,
          position: defaultPosition,
        },
      },
    })

    if (signUpError) {
      const authError = signUpError as typeof signUpError & {
        hint?: string
        details?: string
      }

      const errorDetails = [
        authError.message,
        authError.status ? `Status: ${authError.status}` : '',
        authError.code ? `Code: ${authError.code}` : '',
        authError.hint ? `Hint: ${authError.hint}` : '',
        authError.details ? `Details: ${authError.details}` : '',
      ]
        .filter(Boolean)
        .join(' • ')

      throw new Error(errorDetails)
    }

    router.push({ name: 'login', query: { registered: 'true' } })
  })
}
</script>

<template>
  <div class="w-full max-w-md">
    <div class="rounded-lg bg-white p-8 shadow-lg">
      <h1 class="mb-2 text-center text-3xl font-bold text-slate-900">Create Account</h1>
      <p class="mb-8 text-center text-slate-600">Join us to get started</p>

      <form class="space-y-4" @submit.prevent="handleSignup">
        <div>
          <label for="fullName" class="mb-2 block text-sm font-medium text-slate-700">
            Full Name
          </label>
          <Input
            id="fullName"
            v-model="fullName"
            type="text"
            placeholder="John Doe"
            :disabled="loading"
          />
        </div>

        <div class="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Position: <span class="font-semibold text-slate-900">Employee</span> (default)
        </div>

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

        <div>
          <label for="confirmPassword" class="mb-2 block text-sm font-medium text-slate-700">
            Confirm Password
          </label>
          <Input
            id="confirmPassword"
            v-model="confirmPassword"
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
          {{ loading ? 'Creating account...' : 'Sign Up' }}
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
          Already have an account?
          <router-link to="/login" class="font-semibold text-blue-600 hover:text-blue-700">
            Sign in
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
