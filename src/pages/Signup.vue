<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSignup } from '@/composables/common/useSignup'

const {
  email,
  password,
  confirmPassword,
  firstName,
  middleName,
  lastName,
  error,
  loading,
  handleSignup,
} = useSignup()
</script>

<template>
  <div class="w-full max-w-md">
    <div class="rounded-lg bg-card text-card-foreground border border-border p-8 shadow-lg transition-colors">
      <h1 class="mb-2 text-center text-3xl font-bold text-foreground">Create Account</h1>
      <p class="mb-8 text-center text-muted-foreground">Join us to get started</p>

      <form class="space-y-4" @submit.prevent="handleSignup">
        <div>
          <label for="firstName" class="mb-2 block text-sm font-medium text-foreground">
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
          <label for="middleName" class="mb-2 block text-sm font-medium text-foreground">
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
          <label for="lastName" class="mb-2 block text-sm font-medium text-foreground">
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

        <div class="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          Position: <span class="font-semibold text-foreground">Employee</span> (default)
        </div>

        <div>
          <label for="email" class="mb-2 block text-sm font-medium text-foreground">
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
          <label for="password" class="mb-2 block text-sm font-medium text-foreground">
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
          <label for="confirmPassword" class="mb-2 block text-sm font-medium text-foreground">
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

        <div v-if="error" class="rounded-md border border-destructive/20 bg-destructive/10 p-3">
          <p class="text-sm text-destructive">{{ error }}</p>
        </div>

        <Button
          type="submit"
          :disabled="loading"
          class="w-full bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 cursor-pointer shadow-sm transition-colors"
        >
          {{ loading ? 'Creating account and signing in...' : 'Sign Up' }}
        </Button>

        <div class="relative">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-border"></div>
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="bg-card px-2 text-muted-foreground">or</span>
          </div>
        </div>

        <p class="text-center text-muted-foreground">
          Already have an account?
          <router-link to="/login" class="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
            Sign in
          </router-link>
        </p>
      </form>
    </div>
  </div>
</template>

