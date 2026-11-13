<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import PasswordInput from '@/components/common/PasswordInput.vue'
import { useLogin } from '@/composables/common/useLogin'

// Loaded on demand so three.js stays out of the main bundle.
const MagicRings = defineAsyncComponent(() => import('@/components/vuebits/MagicRings.vue'))

const {
  email,
  password,
  emailError,
  passwordError,
  error,
  loading,
  handleLogin,
  showBackground,
  backgroundRings,
  logos,
} = useLogin()
</script>

<template>
  <!-- Always dark (route meta.forceDark). -->
  <div class="flex w-full justify-center">
    <!-- ─── Animated background (full screen, behind the card, ignores clicks) ─── -->
    <div v-if="showBackground" class="pointer-events-none fixed inset-0" aria-hidden="true">
      <MagicRings v-bind="backgroundRings" />
    </div>

    <!-- ─── Login card (same layout as vue-agsurjobs LoginCard) ─── -->
    <Card class="relative w-full max-w-sm bg-card/80 backdrop-blur-md">
      <CardHeader>
        <div class="mb-4 flex items-center gap-2">
          <img
            v-for="logo in logos"
            :key="logo.src"
            :src="logo.src"
            :alt="logo.alt"
            class="h-14 w-14 shrink-0 rounded-full object-cover"
          />
        </div>
        <CardTitle>Login to PPESO Attendance</CardTitle>
        <CardDescription>Enter your email below to login to your account</CardDescription>
      </CardHeader>

      <CardContent>
        <form id="login-form" novalidate @submit.prevent="handleLogin">
          <div class="grid w-full items-center gap-4">
            <div class="flex flex-col space-y-1.5">
              <Label for="email">Email</Label>
              <Input
                id="email"
                v-model="email"
                type="email"
                autocomplete="email"
                placeholder="example@example.com"
                :disabled="loading"
                :aria-invalid="!!emailError"
                :class="emailError ? 'border-destructive' : ''"
              />
              <p v-if="emailError" class="text-xs text-destructive">{{ emailError }}</p>
            </div>

            <div class="flex flex-col space-y-1.5">
              <Label for="password">Password</Label>
              <PasswordInput
                id="password"
                v-model="password"
                autocomplete="current-password"
                :disabled="loading"
                :aria-invalid="!!passwordError"
                :class="passwordError ? 'border-destructive' : ''"
              />
              <p v-if="passwordError" class="text-xs text-destructive">{{ passwordError }}</p>
            </div>

            <p v-if="error" class="text-center text-sm text-destructive" role="alert">{{ error }}</p>
          </div>
        </form>
      </CardContent>

      <CardFooter class="flex flex-col gap-2">
        <Button type="submit" form="login-form" class="w-full cursor-pointer" :disabled="loading">
          {{ loading ? 'Logging in…' : 'Login' }}
        </Button>
      </CardFooter>
    </Card>
  </div>
</template>
