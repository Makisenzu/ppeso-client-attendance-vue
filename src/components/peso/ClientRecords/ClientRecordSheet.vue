<script setup lang="ts">
import { toRef } from 'vue'
import {
  AlertCircle,
  Loader2,
} from '@lucide/vue'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { GENDER_OPTIONS, PURPOSE_OPTIONS } from '@/helpers/peso/clientRecordHelper'
import { useClientRecordSheet } from '@/composables/peso/useClientRecordSheet'
import type { WalkinAttendanceInsert } from '@/types/peso/clientRecord'

const props = defineProps<{
  open: boolean
  isSubmitting?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'submit', payload: WalkinAttendanceInsert): void
}>()

const {
  provinces,
  cities,
  barangays,
  selectedProvince,
  selectedCity,
  selectedBarangay,
  isLoadingProvinces,
  isLoadingCities,
  isLoadingBarangays,
  firstname,
  middlename,
  lastname,
  gender,
  contactNumber,
  purok,
  purpose,
  errorMessage,
  onProvinceChange,
  onCityChange,
  onBarangayChange,
  handleClose,
  handleSubmit,
} = useClientRecordSheet({
  open: toRef(props, 'open'),
  emit,
})
</script>

<template>
  <Sheet :open="open" @update:open="emit('update:open', $event)">
    <SheetContent side="right" class="w-full sm:max-w-xl flex flex-col p-0 overflow-hidden">
      <!-- ─── Header ─── -->
      <SheetHeader class="p-6 border-b border-border shrink-0 bg-muted/20">
        <SheetTitle class="text-xl font-bold tracking-tight">Add Walk-in Client</SheetTitle>
        <SheetDescription class="text-xs text-muted-foreground">
          Record attendance and service request for walk-in clients visiting the PESO office.
        </SheetDescription>
      </SheetHeader>

      <!-- ─── Form Body (Scrollable) ─── -->
      <form @submit.prevent="handleSubmit" class="flex-1 overflow-y-auto p-6 space-y-6">
        <!-- Error Alert -->
        <div
          v-if="errorMessage"
          class="flex items-center gap-2 p-3 text-xs rounded-lg bg-destructive/10 border border-destructive/20 text-destructive animate-in fade-in"
        >
          <AlertCircle class="h-4 w-4 shrink-0" />
          <span>{{ errorMessage }}</span>
        </div>

        <!-- ─── Section 1: Personal Information ─── -->
        <div class="space-y-4">
          <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground pb-1 border-b border-border/60">
            <span>Personal Information</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div class="space-y-1.5">
              <Label for="firstname" class="text-xs font-medium">
                First Name <span class="text-destructive">*</span>
              </Label>
              <Input
                id="firstname"
                v-model="firstname"
                placeholder="e.g. Juan"
                class="h-9 text-xs"
                required
              />
            </div>

            <div class="space-y-1.5">
              <Label for="middlename" class="text-xs font-medium">
                Middle Name <span class="text-muted-foreground font-normal">(Optional)</span>
              </Label>
              <Input
                id="middlename"
                v-model="middlename"
                placeholder="e.g. Dela"
                class="h-9 text-xs"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div class="space-y-1.5">
              <Label for="lastname" class="text-xs font-medium">
                Last Name <span class="text-destructive">*</span>
              </Label>
              <Input
                id="lastname"
                v-model="lastname"
                placeholder="e.g. Cruz"
                class="h-9 text-xs"
                required
              />
            </div>

            <div class="space-y-1.5">
              <Label for="gender" class="text-xs font-medium">Gender</Label>
              <NativeSelect
                id="gender"
                v-model="gender"
                class="h-9 text-xs"
              >
                <option v-for="g in GENDER_OPTIONS" :key="g.value" :value="g.value">
                  {{ g.label }}
                </option>
              </NativeSelect>
            </div>
          </div>

          <div class="space-y-1.5">
            <Label for="contactNumber" class="text-xs font-medium flex items-center gap-1.5">
              <span>Contact Number</span>
              <span class="text-muted-foreground font-normal">(Optional)</span>
            </Label>
            <Input
              id="contactNumber"
              v-model="contactNumber"
              type="tel"
              placeholder="e.g. 0912 345 6789"
              class="h-9 text-xs"
            />
          </div>
        </div>

        <!-- ─── Section 2: Residential Address (PSGC) ─── -->
        <div class="space-y-4">
          <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground pb-1 border-b border-border/60">
            <span>Address Details</span>
          </div>

          <!-- Province & Municipality -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div class="space-y-1.5">
              <Label for="province" class="text-xs font-medium flex items-center justify-between">
                <span>Province <span class="text-destructive">*</span></span>
                <span v-if="isLoadingProvinces" class="text-[10px] text-muted-foreground animate-pulse">Loading...</span>
              </Label>
              <NativeSelect
                id="province"
                :model-value="selectedProvince?.code ?? ''"
                class="h-9 text-xs"
                :disabled="isLoadingProvinces"
                @update:model-value="onProvinceChange(String($event))"
              >
                <option value="" disabled>Select province</option>
                <option v-for="p in provinces" :key="p.code" :value="p.code">
                  {{ p.name }}
                </option>
              </NativeSelect>
            </div>

            <div class="space-y-1.5">
              <Label for="city" class="text-xs font-medium flex items-center justify-between">
                <span>Municipality / City <span class="text-destructive">*</span></span>
                <span v-if="isLoadingCities" class="text-[10px] text-muted-foreground animate-pulse">Loading...</span>
              </Label>
              <NativeSelect
                id="city"
                :model-value="selectedCity?.code ?? ''"
                class="h-9 text-xs"
                :disabled="!selectedProvince || isLoadingCities"
                @update:model-value="onCityChange(String($event))"
              >
                <option value="" disabled>
                  {{ !selectedProvince ? 'Select province first' : isLoadingCities ? 'Loading cities...' : 'Select municipality' }}
                </option>
                <option v-for="c in cities" :key="c.code" :value="c.code">
                  {{ c.name }}
                </option>
              </NativeSelect>
            </div>
          </div>

          <!-- Barangay & Purok -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div class="space-y-1.5">
              <Label for="barangay" class="text-xs font-medium flex items-center justify-between">
                <span>Barangay <span class="text-destructive">*</span></span>
                <span v-if="isLoadingBarangays" class="text-[10px] text-muted-foreground animate-pulse">Loading...</span>
              </Label>
              <NativeSelect
                id="barangay"
                :model-value="selectedBarangay?.code ?? ''"
                class="h-9 text-xs"
                :disabled="!selectedCity || isLoadingBarangays"
                @update:model-value="onBarangayChange(String($event))"
              >
                <option value="" disabled>
                  {{ !selectedCity ? 'Select municipality first' : isLoadingBarangays ? 'Loading barangays...' : 'Select barangay' }}
                </option>
                <option v-for="b in barangays" :key="b.code" :value="b.code">
                  {{ b.name }}
                </option>
              </NativeSelect>
            </div>

            <div class="space-y-1.5">
              <Label for="purok" class="text-xs font-medium">
                Purok / Street / Zone <span class="text-destructive">*</span>
              </Label>
              <Input
                id="purok"
                v-model="purok"
                placeholder="e.g. Purok 3A, Sampaguita St."
                class="h-9 text-xs"
                required
              />
            </div>
          </div>
        </div>

        <!-- ─── Section 3: Service Requested ─── -->
        <div class="space-y-4">
          <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground pb-1 border-b border-border/60">
            <span>Service Requested</span>
          </div>

          <div class="space-y-1.5">
            <Label for="purpose" class="text-xs font-medium">
              PESO Program / Service Required <span class="text-destructive">*</span>
            </Label>
            <NativeSelect
              id="purpose"
              v-model="purpose"
              class="h-9 text-xs"
            >
              <option v-for="opt in PURPOSE_OPTIONS" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </NativeSelect>
          </div>
        </div>
      </form>

      <!-- ─── Footer ─── -->
      <SheetFooter class="p-4 border-t border-border shrink-0 bg-muted/20 flex sm:flex-row gap-2 justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          class="text-xs"
          :disabled="isSubmitting"
          @click="handleClose"
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          class="text-xs gap-1.5"
          :disabled="isSubmitting"
          @click="handleSubmit"
        >
          <Loader2 v-if="isSubmitting" class="h-3.5 w-3.5 animate-spin" />
          <span>{{ isSubmitting ? 'Saving...' : 'Save Client Record' }}</span>
        </Button>
      </SheetFooter>
    </SheetContent>
  </Sheet>
</template>
