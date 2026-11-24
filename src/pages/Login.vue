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
import GlassSurface from '@/components/vuebits/GlassSurface.vue'
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
    <!-- ─── Background (full screen, behind the card, ignores clicks) ─── -->
    <div class="pointer-events-none fixed inset-0 overflow-hidden bg-background" aria-hidden="true">
      <!-- Photo: slow zoom-out on load; slightly muted so the card leads -->
      <div
        class="absolute inset-0 bg-cover bg-center saturate-[0.85] motion-safe:animate-ken-burns"
        :style="{ backgroundImage: `url(${backgroundImage})` }"
      />
      <!-- Even wash, then darker toward the bottom where the caption sits -->
      <div class="absolute inset-0 bg-background/45" />
      <div class="absolute inset-0 bg-linear-to-t from-background via-background/40 to-background/10" />
      <!-- Soft vignette that pulls the eye to the centre -->
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,var(--background)_100%)] opacity-70" />
    </div>

    <!-- ─── Caption (large screens only) ─── -->
    <div class="pointer-events-none fixed bottom-8 left-10 hidden max-w-sm lg:block" aria-hidden="true">
      <p class="text-[11px] font-medium uppercase tracking-[0.25em] text-muted-foreground">Province of Agusan del Sur</p>
      <p class="mt-1.5 text-lg font-semibold leading-snug text-foreground/90">Provincial Public Employment Service Office</p>
      <div class="mt-3 h-px w-12 bg-primary/60" />
    </div>

    <!-- ─── Login card: GlassSurface over the photo (same layout as vue-agsurjobs LoginCard) ─── -->
    <div
      class="relative w-full max-w-sm rounded-2xl shadow-2xl shadow-background/60 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700"
    >
      <GlassSurface width="100%" height="auto" :border-radius="16" :background-opacity="0.1">
        <Card class="w-full border-0 bg-transparent shadow-none">
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
      </GlassSurface>
    </div>
  </div>
</template>
