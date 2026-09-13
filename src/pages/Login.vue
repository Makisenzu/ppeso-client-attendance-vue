<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthForm } from '../composables/useAuthForm'
import { supabase } from '../services/supabase'
import { useAuthStore, getDashboardByRole } from '../stores/authStore'
import Button from '../components/ui/button/Button.vue'
import Input from '../components/ui/input/Input.vue'

const router = useRouter()
const authStore = useAuthStore()
const email = ref('')
const password = ref('')
const { error, loading, runAuthAction, validateRequiredFields } = useAuthForm()

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

    await authStore.fetchUserRole()

    const routeName = getDashboardByRole(authStore.userRole)
    await router.push({ name: routeName })
  })
}
</script>


<template>
  <div class="w-full max-w-md">
    <div class="rounded-lg bg-card text-card-foreground border border-border p-8 shadow-lg transition-colors">
      <h1 class="mb-2 text-center text-3xl font-bold text-foreground">Welcome Back</h1>
      <p class="mb-8 text-center text-muted-foreground">Sign in to your account</p>

      <form class="space-y-4" @submit.prevent="handleLogin">
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

        <div v-if="error" class="rounded-md border border-destructive/20 bg-destructive/10 p-3">
          <p class="text-sm text-destructive">{{ error }}</p>
        </div>

        <Button
          type="submit"
          :disabled="loading"
          class="w-full bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 cursor-pointer shadow-sm transition-colors"
        >
          {{ loading ? 'Signing in...' : 'Sign In' }}
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
          Don't have an account?
          <router-link to="/signup" class="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
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
