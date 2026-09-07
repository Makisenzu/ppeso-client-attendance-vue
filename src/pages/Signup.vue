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
const firstName = ref('')
const middleName = ref('')
const lastName = ref('')
const { error, loading, runAuthAction, setError, validateRequiredFields } = useAuthForm()
const defaultPosition: Database['public']['Enums']['profile_position'] = 'employee'

const validateForm = (): boolean => {
  if (!validateRequiredFields([email.value, password.value, confirmPassword.value, firstName.value, lastName.value])) {
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
    // Sign up without email confirmation required
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.value,
      password: password.value,
      options: {
        data: {
          firstname: firstName.value,
          middlename: middleName.value || null,
          lastname: lastName.value,
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

    if (!data.user) {
      throw new Error('Failed to create user account')
    }

    // Generate a 6-digit passcode
    const passcode = Math.floor(100000 + Math.random() * 900000).toString()

    // Create or update profile in the public.profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: data.user.id,
          firstname: firstName.value,
          middlename: middleName.value || null,
          lastname: lastName.value,
          position: defaultPosition,
          passcode: passcode,
          status: 'active',
        },
        { onConflict: 'id' },
      )

    if (profileError) {
      throw new Error(`Database error saving new user • ${profileError.message}`)
    }

    // Auto-login after successful signup
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    })

    if (signInError) {
      throw new Error(`Sign-in after registration failed: ${signInError.message}`)
    }

    // Redirect to dashboard after successful signup and login
    router.push({ name: 'dashboard' })
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
          <label for="firstName" class="mb-2 block text-sm font-medium text-slate-700">
            First Name <span class="text-red-500">*</span>
          </label>
          <Input
            id="firstName"
            v-model="firstName"
            type="text"
            placeholder="John"
            :disabled="loading"
          />
        </div>

        <div>
          <label for="middleName" class="mb-2 block text-sm font-medium text-slate-700">
            Middle Name
          </label>
          <Input
            id="middleName"
            v-model="middleName"
            type="text"
            placeholder="M."
            :disabled="loading"
          />
        </div>

        <div>
          <label for="lastName" class="mb-2 block text-sm font-medium text-slate-700">
            Last Name <span class="text-red-500">*</span>
          </label>
          <Input
            id="lastName"
            v-model="lastName"
            type="text"
            placeholder="Doe"
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
          {{ loading ? 'Creating account and signing in...' : 'Sign Up' }}
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
