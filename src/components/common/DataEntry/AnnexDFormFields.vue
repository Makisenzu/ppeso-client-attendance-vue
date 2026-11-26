<script setup lang="ts">
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import SearchSelect from '@/components/common/SearchSelect.vue'
import {
  BENEFICIARY_TYPE_OPTIONS,
  CIVIL_STATUS_OPTIONS,
  DISTRICT_OPTIONS,
  ID_TYPE_OPTIONS,
  INTERESTED_OPTIONS,
  OCCUPATION_OPTIONS,
  SEX_OPTIONS,
  SKILLS_TRAINING_OPTIONS,
} from '@/helpers/common/dataEntryHelper'
import type { useAnnexDForm } from '@/composables/common/useAnnexDForm'

/**
 * The ANNEX D beneficiary fields, shared by the admin Add / Edit sheet and the public /data-entry page.
 * State comes from the parent's `useAnnexDForm()`.
 */
const props = defineProps<{ state: ReturnType<typeof useAnnexDForm> }>()

const {
  form,
  errors,
  maxBirthdate,
  contactNumber,
  age,
  choices,
  isOther,
  provinceOptions,
  cityOptions,
  barangayOptions,
  provinceCode,
  cityCode,
  barangayCode,
  selectedProvince,
  selectedCity,
  isDistrictAuto,
  isLoadingProvinces,
  isLoadingCities,
  isLoadingBarangays,
} = props.state

// Typed values show in capitals (and are saved that way — formToPayload); hints stay as written
const inputClass = 'h-9 text-base md:text-xs uppercase placeholder:normal-case'
const invalidClass = 'border-destructive focus-visible:ring-destructive'
const sectionClass = 'border-b border-border/60 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground'
</script>

<template>
  <div class="space-y-6">
    <!-- ─── Name of Beneficiary ─── -->
    <section class="space-y-4">
      <h3 :class="sectionClass">Name of Beneficiary</h3>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div class="space-y-1.5">
          <Label for="de-lastname" class="text-xs font-medium">Last Name <span class="text-destructive">*</span></Label>
          <Input id="de-lastname" v-model="form.lastname" :class="[inputClass, errors.lastname && invalidClass]" />
          <p v-if="errors.lastname" class="text-[11px] text-destructive">{{ errors.lastname }}</p>
        </div>
        <div class="space-y-1.5">
          <Label for="de-firstname" class="text-xs font-medium">First Name <span class="text-destructive">*</span></Label>
          <Input id="de-firstname" v-model="form.firstname" :class="[inputClass, errors.firstname && invalidClass]" />
          <p v-if="errors.firstname" class="text-[11px] text-destructive">{{ errors.firstname }}</p>
        </div>
        <div class="space-y-1.5">
          <Label for="de-middlename" class="text-xs font-medium">Middle Name</Label>
          <Input id="de-middlename" v-model="form.middlename" :class="[inputClass, errors.middlename && invalidClass]" />
          <p v-if="errors.middlename" class="text-[11px] text-destructive">{{ errors.middlename }}</p>
        </div>
        <div class="space-y-1.5">
          <Label for="de-extension" class="text-xs font-medium">Extension Name</Label>
          <Input
            id="de-extension"
            v-model="form.extensionName"
            placeholder="e.g. Jr., III"
            :class="[inputClass, errors.extensionName && invalidClass]"
          />
          <p v-if="errors.extensionName" class="text-[11px] text-destructive">{{ errors.extensionName }}</p>
        </div>
      </div>
    </section>

    <!-- ─── Personal Details ─── -->
    <section class="space-y-4">
      <h3 :class="sectionClass">Personal Details</h3>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div class="space-y-1.5">
          <Label for="de-birthdate" class="text-xs font-medium">Birthdate <span class="text-destructive">*</span></Label>
          <Input
            id="de-birthdate"
            v-model="form.birthdate"
            type="date"
            min="1900-01-01"
            :max="maxBirthdate"
            :class="[inputClass, errors.birthdate && invalidClass]"
          />
          <p v-if="errors.birthdate" class="text-[11px] text-destructive">{{ errors.birthdate }}</p>
          <p v-else-if="age !== null" class="text-[11px] text-muted-foreground">{{ age }} years old</p>
        </div>
        <div class="space-y-1.5">
          <Label for="de-sex" class="text-xs font-medium">Sex <span class="text-destructive">*</span></Label>
          <SearchSelect
            uppercase
            id="de-sex"
            v-model="form.sex"
            :options="SEX_OPTIONS"
            :searchable="false"
            placeholder="Select sex"
            :invalid="!!errors.sex"
          />
          <p v-if="errors.sex" class="text-[11px] text-destructive">{{ errors.sex }}</p>
        </div>
        <div class="space-y-1.5">
          <Label for="de-civil" class="text-xs font-medium">Civil Status</Label>
          <SearchSelect
            uppercase
            id="de-civil"
            v-model="form.civilStatus"
            :options="CIVIL_STATUS_OPTIONS"
            :searchable="false"
            placeholder="Select civil status"
          />
        </div>
        <div class="space-y-1.5">
          <Label for="de-contact" class="text-xs font-medium">Contact No.</Label>
          <Input
            id="de-contact"
            v-model="contactNumber"
            type="tel"
            inputmode="tel"
            placeholder="e.g. 0912-345-6789"
            maxlength="13"
            :class="[inputClass, errors.contactNumber && invalidClass]"
          />
          <p v-if="errors.contactNumber" class="text-[11px] text-destructive">{{ errors.contactNumber }}</p>
        </div>
      </div>
    </section>

    <!-- ─── Project Location ─── -->
    <section class="space-y-4">
      <h3 :class="sectionClass">Project Location</h3>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div class="space-y-1.5">
          <Label for="de-province" class="flex items-center justify-between text-xs font-medium">
            <span>Province <span class="text-destructive">*</span></span>
            <span v-if="isLoadingProvinces" class="text-[10px] text-muted-foreground animate-pulse">Loading...</span>
          </Label>
          <SearchSelect
            uppercase
            id="de-province"
            v-model="provinceCode"
            :options="provinceOptions"
            :disabled="isLoadingProvinces"
            placeholder="Select province"
            search-placeholder="Search province..."
            :invalid="!!errors.location && !selectedProvince"
          />
        </div>
        <div class="space-y-1.5">
          <Label for="de-city" class="flex items-center justify-between text-xs font-medium">
            <span>City / Municipality <span class="text-destructive">*</span></span>
            <span v-if="isLoadingCities" class="text-[10px] text-muted-foreground animate-pulse">Loading...</span>
          </Label>
          <SearchSelect
            uppercase
            id="de-city"
            v-model="cityCode"
            :options="cityOptions"
            :disabled="!selectedProvince || isLoadingCities"
            :placeholder="selectedProvince ? 'Select city / municipality' : 'Select province first'"
            search-placeholder="Search city / municipality..."
            :invalid="!!errors.location && !selectedCity"
          />
        </div>
        <div class="space-y-1.5">
          <Label for="de-barangay" class="flex items-center justify-between text-xs font-medium">
            <span>Barangay <span class="text-destructive">*</span></span>
            <span v-if="isLoadingBarangays" class="text-[10px] text-muted-foreground animate-pulse">Loading...</span>
          </Label>
          <SearchSelect
            uppercase
            id="de-barangay"
            v-model="barangayCode"
            :options="barangayOptions"
            :disabled="!selectedCity || isLoadingBarangays"
            :placeholder="selectedCity ? 'Select barangay' : 'Select city / municipality first'"
            search-placeholder="Search barangay..."
            :invalid="!!errors.location && !barangayCode"
          />
        </div>
        <div class="space-y-1.5">
          <Label for="de-district" class="text-xs font-medium">District</Label>
          <SearchSelect
            uppercase
            id="de-district"
            v-model="form.district"
            :options="DISTRICT_OPTIONS"
            :searchable="false"
            :disabled="isDistrictAuto"
            :placeholder="selectedCity ? 'Select district' : 'Set from the city / municipality'"
          />
          <p v-if="isDistrictAuto" class="text-[11px] text-muted-foreground">Set from the city / municipality.</p>
        </div>
      </div>
      <p v-if="errors.location" class="text-[11px] text-destructive">{{ errors.location }}</p>
    </section>

    <!-- ─── Identification & Payment ─── -->
    <section class="space-y-4">
      <h3 :class="sectionClass">Identification &amp; Payment</h3>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div class="space-y-1.5">
          <Label for="de-id-type" class="text-xs font-medium">Type of ID</Label>
          <SearchSelect
            uppercase
            id="de-id-type"
            v-model="choices.idType.choice"
            :options="ID_TYPE_OPTIONS"
            placeholder="Select type of ID"
            search-placeholder="Search type of ID..."
            :invalid="!!errors.idType"
          />
          <Input
            v-if="isOther('idType')"
            v-model="choices.idType.other"
            placeholder="Please specify"
            aria-label="Type of ID (please specify)"
            :class="[inputClass, errors.idType && invalidClass]"
          />
          <p v-if="errors.idType" class="text-[11px] text-destructive">{{ errors.idType }}</p>
        </div>
        <div class="space-y-1.5">
          <Label for="de-id-number" class="text-xs font-medium">ID No.</Label>
          <Input id="de-id-number" v-model="form.idNumber" :class="[inputClass, errors.idNumber && invalidClass]" />
          <p v-if="errors.idNumber" class="text-[11px] text-destructive">{{ errors.idNumber }}</p>
        </div>
        <div class="space-y-1.5 sm:col-span-2">
          <Label for="de-epayment" class="text-xs font-medium">E-payment / Account No.</Label>
          <Input
            id="de-epayment"
            v-model="form.epaymentAccount"
            :class="[inputClass, errors.epaymentAccount && invalidClass]"
          />
          <p v-if="errors.epaymentAccount" class="text-[11px] text-destructive">{{ errors.epaymentAccount }}</p>
        </div>
      </div>
    </section>

    <!-- ─── Program Details ─── -->
    <section class="space-y-4">
      <h3 :class="sectionClass">Program Details</h3>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div class="space-y-1.5 sm:col-span-2">
          <Label for="de-type" class="text-xs font-medium">Type of Beneficiary <span class="text-destructive">*</span></Label>
          <SearchSelect
            uppercase
            id="de-type"
            v-model="form.beneficiaryType"
            :options="BENEFICIARY_TYPE_OPTIONS"
            :searchable="false"
            placeholder="Select type of beneficiary"
            :invalid="!!errors.beneficiaryType"
          />
          <p v-if="errors.beneficiaryType" class="text-[11px] text-destructive">{{ errors.beneficiaryType }}</p>
        </div>
        <div class="space-y-1.5">
          <Label for="de-occupation" class="text-xs font-medium">Occupation</Label>
          <SearchSelect
            uppercase
            id="de-occupation"
            v-model="choices.occupation.choice"
            :options="OCCUPATION_OPTIONS"
            placeholder="Select occupation"
            search-placeholder="Search occupation..."
            :invalid="!!errors.occupation"
          />
          <Input
            v-if="isOther('occupation')"
            v-model="choices.occupation.other"
            placeholder="Please specify"
            aria-label="Occupation (please specify)"
            :class="[inputClass, errors.occupation && invalidClass]"
          />
          <p v-if="errors.occupation" class="text-[11px] text-destructive">{{ errors.occupation }}</p>
        </div>
        <div class="space-y-1.5">
          <Label for="de-income" class="text-xs font-medium">Average Monthly Income (₱)</Label>
          <Input
            id="de-income"
            v-model="form.averageMonthlyIncome"
            inputmode="decimal"
            placeholder="e.g. 5000"
            :class="[inputClass, errors.averageMonthlyIncome && invalidClass]"
          />
          <p v-if="errors.averageMonthlyIncome" class="text-[11px] text-destructive">{{ errors.averageMonthlyIncome }}</p>
        </div>
        <div class="space-y-1.5">
          <Label for="de-dependent" class="text-xs font-medium">Dependent</Label>
          <Input
            id="de-dependent"
            v-model="form.dependent"
            :class="[inputClass, errors.dependent && invalidClass]"
          />
          <p v-if="errors.dependent" class="text-[11px] text-destructive">{{ errors.dependent }}</p>
          <p v-else class="text-[11px] text-muted-foreground">Beneficiary of the micro-insurance policy.</p>
        </div>
        <div class="space-y-1.5">
          <Label for="de-interested" class="text-xs font-medium">Interested in wage or self-employment?</Label>
          <SearchSelect
            uppercase
            id="de-interested"
            v-model="form.interested"
            :options="INTERESTED_OPTIONS"
            :searchable="false"
            placeholder="Yes / No"
          />
        </div>
        <div class="space-y-1.5 sm:col-span-2">
          <Label for="de-skills" class="text-xs font-medium">Skills Training Needed</Label>
          <SearchSelect
            uppercase
            id="de-skills"
            v-model="choices.skillsTrainingNeeded.choice"
            :options="SKILLS_TRAINING_OPTIONS"
            placeholder="Select skills training"
            search-placeholder="Search skills training..."
            :invalid="!!errors.skillsTrainingNeeded"
          />
          <Input
            v-if="isOther('skillsTrainingNeeded')"
            v-model="choices.skillsTrainingNeeded.other"
            placeholder="Please specify"
            aria-label="Skills Training Needed (please specify)"
            :class="[inputClass, errors.skillsTrainingNeeded && invalidClass]"
          />
          <p v-if="errors.skillsTrainingNeeded" class="text-[11px] text-destructive">{{ errors.skillsTrainingNeeded }}</p>
        </div>
      </div>
    </section>
  </div>
</template>
