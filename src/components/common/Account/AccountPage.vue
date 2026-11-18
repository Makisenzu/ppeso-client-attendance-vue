<script setup lang="ts">
import { Eye, EyeOff, Loader2, RefreshCw, UserRound } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import PasswordInput from '@/components/common/PasswordInput.vue'
import { useAccount } from '@/composables/common/useAccount'

/** Account page shared by every role (admin, supervisor, beneficiary). */
const {
  isLoading,
  loadError,
  fetchAccount,
  summary,
  nameForm,
  nameErrors,
  isSavingName,
  isNameDirty,
  resetNameForm,
  saveName,
  passwordForm,
  passwordErrors,
  isChangingPassword,
  passwordHint,
  changePassword,
  isPasscodeVisible,
  hasPasscode,
  passcodeDisplay,
  togglePasscode,
} = useAccount()
</script>

<template>
  <div class="mx-auto flex w-full max-w-4xl flex-col gap-6 pb-12">
    <!-- ─── Header ─── -->
    <div class="space-y-1">
      <h1 class="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">My Account</h1>
      <p class="text-sm text-muted-foreground">Your profile and password.</p>
    </div>

    <!-- ─── Loading ─── -->
    <Card v-if="isLoading && !summary" class="border shadow-xs">
      <CardContent class="flex items-center gap-4 py-6">
        <Skeleton class="h-16 w-16 rounded-full" />
        <div class="flex-1 space-y-2">
          <Skeleton class="h-5 w-48" />
          <Skeleton class="h-4 w-64" />
        </div>
      </CardContent>
    </Card>

    <!-- ─── Could not load ─── -->
    <Empty v-else-if="loadError && !summary" class="border border-dashed py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <UserRound />
        </EmptyMedia>
        <EmptyTitle>Could not load your account</EmptyTitle>
        <EmptyDescription>{{ loadError }}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" size="sm" class="text-xs cursor-pointer" @click="fetchAccount">Try again</Button>
      </EmptyContent>
    </Empty>

    <template v-else-if="summary">
      <!-- ─── Profile summary ─── -->
      <Card class="border shadow-xs">
        <CardContent class="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar class="h-16 w-16 shrink-0 text-lg font-semibold">
            <AvatarFallback class="bg-primary/10 text-primary">{{ summary.initials }}</AvatarFallback>
          </Avatar>
          <div class="min-w-0 flex-1 space-y-1.5">
            <p class="truncate text-lg font-semibold text-foreground">{{ summary.fullName }}</p>
            <p class="truncate text-sm text-muted-foreground">
              {{ summary.email }}
              <span v-if="!summary.emailVerified" class="text-xs"> · not verified</span>
            </p>
            <div class="flex flex-wrap gap-1.5">
              <Badge variant="outline" class="text-[11px]">{{ summary.positionLabel }}</Badge>
              <Badge variant="outline" :class="[summary.statusBadgeClass, 'text-[11px]']">{{ summary.statusLabel }}</Badge>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            class="gap-1.5 self-start text-xs cursor-pointer sm:self-center"
            :disabled="isLoading"
            @click="fetchAccount"
          >
            <RefreshCw :class="['h-3.5 w-3.5', isLoading && 'animate-spin']" />
            <span>Refresh</span>
          </Button>
        </CardContent>
      </Card>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <!-- ─── Account details (read-only) ─── -->
        <Card class="border shadow-xs">
          <CardHeader>
            <CardTitle class="text-base">Account Details</CardTitle>
            <CardDescription class="text-xs">Role, position, office and status are managed by an admin.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl class="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <div>
                <dt class="text-xs text-muted-foreground">Office</dt>
                <dd class="text-sm font-medium text-foreground">{{ summary.office }}</dd>
              </div>
              <div>
                <dt class="text-xs text-muted-foreground">Position</dt>
                <dd class="text-sm font-medium text-foreground">{{ summary.positionLabel }}</dd>
              </div>
              <div>
                <dt class="text-xs text-muted-foreground">Member Since</dt>
                <dd class="font-mono text-sm font-medium text-foreground">{{ summary.memberSince }}</dd>
              </div>
              <div>
                <dt class="text-xs text-muted-foreground">Last Updated</dt>
                <dd class="font-mono text-sm font-medium text-foreground">{{ summary.lastUpdated }}</dd>
              </div>
              <div v-if="hasPasscode" class="sm:col-span-2">
                <dt class="text-xs text-muted-foreground">Kiosk Passcode</dt>
                <dd class="mt-0.5 flex items-center gap-2">
                  <span class="font-mono text-lg font-semibold tracking-[0.3em] text-foreground">{{ passcodeDisplay }}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    class="h-8 w-8 cursor-pointer"
                    :aria-label="isPasscodeVisible ? 'Hide passcode' : 'Show passcode'"
                    :aria-pressed="isPasscodeVisible"
                    @click="togglePasscode"
                  >
                    <EyeOff v-if="isPasscodeVisible" class="h-4 w-4" />
                    <Eye v-else class="h-4 w-4" />
                  </Button>
                </dd>
                <p class="mt-1 text-[11px] text-muted-foreground">Enter it at the kiosk to log your time. Keep it private.</p>
              </div>
            </dl>
          </CardContent>
        </Card>

        <!-- ─── Personal information ─── -->
        <Card class="border shadow-xs">
          <CardHeader>
            <CardTitle class="text-base">Personal Information</CardTitle>
            <CardDescription class="text-xs">Your name as it prints on your DTR.</CardDescription>
          </CardHeader>
          <form @submit.prevent="saveName">
            <CardContent class="space-y-4">
              <p
                v-if="nameErrors.submit"
                class="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs font-medium text-destructive"
              >
                {{ nameErrors.submit }}
              </p>
              <div class="space-y-1.5">
                <Label for="account-firstname">First Name</Label>
                <Input
                  id="account-firstname"
                  v-model="nameForm.firstname"
                  autocomplete="given-name"
                  :disabled="isSavingName"
                  :class="nameErrors.firstname ? 'border-destructive' : ''"
                />
                <p v-if="nameErrors.firstname" class="text-xs text-destructive">{{ nameErrors.firstname }}</p>
              </div>
              <div class="space-y-1.5">
                <Label for="account-middlename">Middle Name</Label>
                <Input
                  id="account-middlename"
                  v-model="nameForm.middlename"
                  autocomplete="additional-name"
                  :disabled="isSavingName"
                />
              </div>
              <div class="space-y-1.5">
                <Label for="account-lastname">Last Name</Label>
                <Input
                  id="account-lastname"
                  v-model="nameForm.lastname"
                  autocomplete="family-name"
                  :disabled="isSavingName"
                  :class="nameErrors.lastname ? 'border-destructive' : ''"
                />
                <p v-if="nameErrors.lastname" class="text-xs text-destructive">{{ nameErrors.lastname }}</p>
              </div>
            </CardContent>
            <CardFooter class="mt-6 justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                class="text-xs cursor-pointer"
                :disabled="isSavingName || !isNameDirty"
                @click="resetNameForm"
              >
                Reset
              </Button>
              <Button type="submit" size="sm" class="gap-1.5 text-xs cursor-pointer" :disabled="isSavingName || !isNameDirty">
                <Loader2 v-if="isSavingName" class="h-3.5 w-3.5 animate-spin" />
                <span>{{ isSavingName ? 'Saving...' : 'Save Changes' }}</span>
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>

      <!-- ─── Change password ─── -->
      <Card class="border shadow-xs">
        <CardHeader>
          <CardTitle class="text-base">Change Password</CardTitle>
          <CardDescription class="text-xs">{{ passwordHint }}</CardDescription>
        </CardHeader>
        <form @submit.prevent="changePassword">
          <CardContent class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <p
              v-if="passwordErrors.submit"
              class="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs font-medium text-destructive sm:col-span-2"
            >
              {{ passwordErrors.submit }}
            </p>
            <div class="space-y-1.5">
              <Label for="account-new-password">New Password</Label>
              <PasswordInput
                id="account-new-password"
                v-model="passwordForm.newPassword"
                autocomplete="new-password"
                :disabled="isChangingPassword"
                :class="passwordErrors.newPassword ? 'border-destructive' : ''"
              />
              <p v-if="passwordErrors.newPassword" class="text-xs text-destructive">{{ passwordErrors.newPassword }}</p>
            </div>
            <div class="space-y-1.5">
              <Label for="account-confirm-password">Confirm Password</Label>
              <PasswordInput
                id="account-confirm-password"
                v-model="passwordForm.confirmPassword"
                autocomplete="new-password"
                :disabled="isChangingPassword"
                :class="passwordErrors.confirmPassword ? 'border-destructive' : ''"
              />
              <p v-if="passwordErrors.confirmPassword" class="text-xs text-destructive">
                {{ passwordErrors.confirmPassword }}
              </p>
            </div>
          </CardContent>
          <CardFooter class="mt-6 justify-end">
            <Button type="submit" size="sm" class="gap-1.5 text-xs cursor-pointer" :disabled="isChangingPassword">
              <Loader2 v-if="isChangingPassword" class="h-3.5 w-3.5 animate-spin" />
              <span>{{ isChangingPassword ? 'Changing...' : 'Change Password' }}</span>
            </Button>
          </CardFooter>
        </form>
      </Card>
    </template>
  </div>
</template>
