<script setup lang="ts">
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

const {
  email,
  password,
  emailError,
  passwordError,
  emailShake,
  passwordShake,
  stopEmailShake,
  stopPasswordShake,
  error,
  loading,
  handleLogin,
  backgroundImage,
  logos,
} = useLogin()
</script>

<template>
  <!-- Always dark (route meta.forceDark). -->
  <div class="flex w-full justify-center">
    <!-- ─── Background photo (full screen, behind the card, ignores clicks), darkened so the card reads ─── -->
    <div
      class="pointer-events-none fixed inset-0 bg-cover bg-center"
      :style="{ backgroundImage: `url(${backgroundImage})` }"
      aria-hidden="true"
    >
      <div class="absolute inset-0 bg-background/60" />
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
              <div :class="emailShake ? 'motion-safe:animate-shake' : ''" @animationend="stopEmailShake">
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
              </div>
              <p v-if="emailError" class="text-xs text-destructive">{{ emailError }}</p>
            </div>

            <div class="flex flex-col space-y-1.5">
              <Label for="password">Password</Label>
              <div :class="passwordShake ? 'motion-safe:animate-shake' : ''" @animationend="stopPasswordShake">
                <PasswordInput
                  id="password"
                  v-model="password"
                  autocomplete="current-password"
                  :disabled="loading"
                  :aria-invalid="!!passwordError"
                  :class="passwordError ? 'border-destructive' : ''"
                />
              </div>
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
