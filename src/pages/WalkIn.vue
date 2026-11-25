<script setup lang="ts">
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Loader2, ShieldCheck } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import SearchSelect from '@/components/common/SearchSelect.vue'
import { useWalkInForm, WALK_IN_STEPS } from '@/composables/common/useWalkInForm'

const {
  selectedProvince,
  selectedCity,
  selectedBarangay,
  isLoadingProvinces,
  isLoadingCities,
  isLoadingBarangays,
  provinceOptions,
  cityOptions,
  barangayOptions,
  genderOptions,
  purposeOptions,
  genderModel,
  purposeModel,
  cityPlaceholder,
  barangayPlaceholder,
  logos,
  backgroundImage,
  firstname,
  middlename,
  lastname,
  contactNumber,
  purok,
  consent,
  errorMessage,
  isSubmitting,
  isSubmitted,
  step,
  currentStep,
  onProvinceChange,
  onCityChange,
  onBarangayChange,
  prevStep,
  handleSubmit,
  startOver,
} = useWalkInForm()
</script>

<template>
  <!-- Always dark (route meta.forceDark), same backdrop as the login page. -->
  <div class="flex w-full justify-center">
    <!-- ─── Background ─── -->
    <div class="pointer-events-none fixed inset-0 overflow-hidden bg-background" aria-hidden="true">
      <div
        class="absolute inset-0 bg-cover bg-center saturate-[0.85] motion-safe:animate-ken-burns"
        :style="{ backgroundImage: `url(${backgroundImage})` }"
      />
      <div class="absolute inset-0 bg-background/55" />
      <div class="absolute inset-0 bg-linear-to-t from-background via-background/50 to-background/10" />
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,var(--background)_100%)] opacity-70" />
    </div>

    <div
      class="relative w-full max-w-lg rounded-2xl shadow-2xl shadow-background/60 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700"
    >
      <!-- Frosted card (not GlassSurface: its overflow:hidden would clip the SearchSelect popups) -->
      <div class="w-full rounded-2xl border border-foreground/10 bg-card/60 p-5 backdrop-blur-xl sm:p-8">
          <!-- ─── Brand ─── -->
          <div class="flex items-center gap-3">
            <div class="flex -space-x-2">
              <img
                v-for="logo in logos"
                :key="logo.src"
                :src="logo.src"
                :alt="logo.alt"
                class="size-10 shrink-0 rounded-full object-cover ring-2 ring-background sm:size-11"
              />
            </div>
            <div class="min-w-0 leading-tight">
              <p class="truncate text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Province of Agusan del Sur
              </p>
              <p class="truncate text-sm font-semibold text-foreground">Provincial PESO</p>
            </div>
          </div>

          <!-- ═══ Success ═══ -->
          <div v-if="isSubmitted" class="flex flex-col items-center py-10 text-center motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95">
            <div class="flex size-16 items-center justify-center rounded-full bg-primary/15 text-primary ring-8 ring-primary/5">
              <CheckCircle2 class="size-8" />
            </div>
            <h1 class="mt-6 text-2xl font-semibold tracking-tight">Thank you!</h1>
            <p class="mt-2 max-w-xs text-sm text-muted-foreground">
              Your visit has been recorded. Please have a seat — a PESO staff member will assist you shortly.
            </p>
            <Button class="mt-8 w-full sm:w-auto" @click="startOver">Submit another client</Button>
          </div>

          <!-- ═══ Form ═══ -->
          <template v-else>
            <div class="mt-7">
              <h1 class="text-2xl font-semibold tracking-tight">Walk-in Client Form</h1>
              <p class="mt-1 text-sm text-muted-foreground">Log your visit in two quick steps.</p>
            </div>

            <!-- Progress -->
            <div class="mt-6">
              <div class="flex gap-1.5" aria-hidden="true">
                <div
                  v-for="s in WALK_IN_STEPS"
                  :key="s.step"
                  class="h-1 flex-1 rounded-full transition-colors duration-500"
                  :class="step >= s.step ? 'bg-primary' : 'bg-foreground/10'"
                />
              </div>
              <div class="mt-3 flex items-baseline justify-between gap-3">
                <p class="text-sm font-medium text-foreground">{{ currentStep.label }}</p>
                <p class="shrink-0 text-xs text-muted-foreground">Step {{ step }} of {{ WALK_IN_STEPS.length }}</p>
              </div>
              <p class="text-xs text-muted-foreground">{{ currentStep.description }}</p>
            </div>

            <form id="walk-in-form" class="mt-6" novalidate @submit.prevent="handleSubmit">
              <div
                v-if="errorMessage"
                class="mb-5 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive motion-safe:animate-in motion-safe:fade-in"
                role="alert"
              >
                <AlertCircle class="mt-0.5 size-4 shrink-0" />
                <span>{{ errorMessage }}</span>
              </div>

              <!-- ─── Step 1: Personal information ─── -->
              <div v-if="step === 1" key="step-1" class="grid grid-cols-1 gap-4 sm:grid-cols-2 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-left-3">
                <div class="grid gap-2">
                  <Label for="wi-firstname">First name <span class="text-destructive">*</span></Label>
                  <Input id="wi-firstname" v-model="firstname" placeholder="Juan" maxlength="80" autocomplete="off" />
                </div>
                <div class="grid gap-2">
                  <Label for="wi-lastname">Last name <span class="text-destructive">*</span></Label>
                  <Input id="wi-lastname" v-model="lastname" placeholder="Cruz" maxlength="80" autocomplete="off" />
                </div>
                <div class="grid gap-2">
                  <Label for="wi-middlename">
                    Middle name <span class="text-xs font-normal text-muted-foreground">Optional</span>
                  </Label>
                  <Input id="wi-middlename" v-model="middlename" placeholder="Dela" maxlength="80" autocomplete="off" />
                </div>
                <div class="grid gap-2">
                  <Label for="wi-gender">Gender</Label>
                  <SearchSelect
                    id="wi-gender"
                    v-model="genderModel"
                    :options="genderOptions"
                    :searchable="false"
                    placeholder="Select gender"
                  />
                </div>
                <div class="grid gap-2 sm:col-span-2">
                  <Label for="wi-contact">
                    Contact number <span class="text-xs font-normal text-muted-foreground">Optional</span>
                  </Label>
                  <Input
                    id="wi-contact"
                    v-model="contactNumber"
                    type="tel"
                    inputmode="tel"
                    placeholder="0912 345 6789"
                    maxlength="20"
                    autocomplete="off"
                  />
                </div>
              </div>

              <!-- ─── Step 2: Address & service ─── -->
              <div v-else key="step-2" class="space-y-6 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-3">
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div class="grid gap-2">
                    <Label for="wi-province">Province <span class="text-destructive">*</span></Label>
                    <SearchSelect
                      id="wi-province"
                      :model-value="selectedProvince?.code ?? ''"
                      :options="provinceOptions"
                      :disabled="isLoadingProvinces"
                      :placeholder="isLoadingProvinces ? 'Loading...' : 'Select province'"
                      search-placeholder="Search province..."
                      @update:model-value="onProvinceChange"
                    />
                  </div>
                  <div class="grid gap-2">
                    <Label for="wi-city">Municipality / City <span class="text-destructive">*</span></Label>
                    <SearchSelect
                      id="wi-city"
                      :model-value="selectedCity?.code ?? ''"
                      :options="cityOptions"
                      :disabled="!selectedProvince || isLoadingCities"
                      :placeholder="cityPlaceholder"
                      search-placeholder="Search municipality..."
                      @update:model-value="onCityChange"
                    />
                  </div>
                  <div class="grid gap-2">
                    <Label for="wi-barangay">Barangay <span class="text-destructive">*</span></Label>
                    <SearchSelect
                      id="wi-barangay"
                      :model-value="selectedBarangay?.code ?? ''"
                      :options="barangayOptions"
                      :disabled="!selectedCity || isLoadingBarangays"
                      :placeholder="barangayPlaceholder"
                      search-placeholder="Search barangay..."
                      @update:model-value="onBarangayChange"
                    />
                  </div>
                  <div class="grid gap-2">
                    <Label for="wi-purok">Purok / Street / Zone <span class="text-destructive">*</span></Label>
                    <Input id="wi-purok" v-model="purok" placeholder="Purok 3A, Sampaguita St." maxlength="160" autocomplete="off" />
                  </div>
                  <div class="grid gap-2 sm:col-span-2">
                    <Label for="wi-purpose">Service you need <span class="text-destructive">*</span></Label>
                    <SearchSelect
                      id="wi-purpose"
                      v-model="purposeModel"
                      :options="purposeOptions"
                      :searchable="false"
                      placeholder="Select a PESO program or service"
                    />
                  </div>
                </div>

                <!-- Privacy notice (RA 10173) -->
                <label
                  for="wi-consent"
                  class="flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors"
                  :class="consent ? 'border-primary/50 bg-primary/5' : 'border-border bg-foreground/[0.03] hover:bg-foreground/[0.05]'"
                >
                  <input
                    id="wi-consent"
                    v-model="consent"
                    type="checkbox"
                    class="mt-0.5 size-4 shrink-0 cursor-pointer accent-primary"
                  />
                  <span class="space-y-1.5">
                    <span class="flex items-center gap-1.5 text-sm font-medium text-foreground">
                      <ShieldCheck class="size-4 text-primary" />
                      I agree to the privacy notice <span class="text-destructive">*</span>
                    </span>
                    <span class="block text-xs leading-relaxed text-muted-foreground">
                      The Provincial PESO of Agusan del Sur collects your name, gender, contact number, address and the
                      service you need to record your visit and assist you. Only authorized PESO staff can see it, and it
                      is not shared outside the office except as required by law. You may ask to access, correct or
                      delete your record under the Data Privacy Act of 2012 (RA 10173).
                    </span>
                  </span>
                </label>
              </div>

              <!-- ─── Actions ─── -->
              <div class="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                <Button
                  v-if="step === 2"
                  type="button"
                  variant="ghost"
                  class="w-full sm:w-auto"
                  :disabled="isSubmitting"
                  @click="prevStep"
                >
                  <ArrowLeft class="size-4" />
                  Back
                </Button>
                <span v-else class="hidden sm:block" />
                <Button type="submit" class="w-full sm:w-auto sm:min-w-32" :disabled="isSubmitting">
                  <template v-if="step === 1">
                    Continue
                    <ArrowRight class="size-4" />
                  </template>
                  <template v-else>
                    <Loader2 v-if="isSubmitting" class="size-4 animate-spin" />
                    {{ isSubmitting ? 'Submitting...' : 'Submit' }}
                  </template>
                </Button>
              </div>
            </form>
          </template>
      </div>
    </div>
  </div>
</template>
