import { computed, onMounted, ref } from 'vue'
import { usePsgc } from '@/composables/common/usePsgc'
import { LOGIN_LOGOS } from '@/composables/common/useLogin'
import { walkInService } from '@/services/common/walkInService'
import { GENDER_OPTIONS, PURPOSE_OPTIONS } from '@/helpers/peso/clientRecordHelper'
import walkInBackground from '@/assets/bg.png'
import type { GenderType, ServiceRequired } from '@/types/peso/clientRecord'
import type { SearchSelectOption } from '@/types/common/searchSelect'

const DEFAULT_REGION = 'Region XIII (Caraga)'
const DEFAULT_PROVINCE = 'Agusan del Sur'

/** The form is split in two parts: 1 = personal information, 2 = address, service and consent. */
export type WalkInStep = 1 | 2
export const WALK_IN_STEPS: { step: WalkInStep; label: string; description: string }[] = [
  { step: 1, label: 'Personal information', description: 'Tell us who you are.' },
  { step: 2, label: 'Address & service', description: 'Where you live and how we can help.' },
]

/** Public walk-in client form (/walk-in): clients enter their own details; submit only. */
export function useWalkInForm() {
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
    initialize: initPsgc,
  } = usePsgc()

  const firstname = ref('')
  const middlename = ref('')
  const lastname = ref('')
  const gender = ref<GenderType>('not specified')
  const contactNumber = ref('')
  const purok = ref('')
  const purpose = ref<ServiceRequired>('gip')
  const consent = ref(false)

  const errorMessage = ref('')
  const isSubmitting = ref(false)
  const isSubmitted = ref(false)
  const step = ref<WalkInStep>(1)
  const currentStep = computed(() => WALK_IN_STEPS.find((s) => s.step === step.value) ?? WALK_IN_STEPS[0]!)

  // ─── SearchSelect options / models ───
  const genderOptions: SearchSelectOption[] = GENDER_OPTIONS.map((g) => ({ value: g.value, label: g.label }))
  const purposeOptions: SearchSelectOption[] = PURPOSE_OPTIONS.map((p) => ({ value: p.value, label: p.label }))
  const provinceOptions = computed<SearchSelectOption[]>(() =>
    provinces.value.map((p) => ({ value: p.code, label: p.name })),
  )
  const cityOptions = computed<SearchSelectOption[]>(() => cities.value.map((c) => ({ value: c.code, label: c.name })))
  const barangayOptions = computed<SearchSelectOption[]>(() =>
    barangays.value.map((b) => ({ value: b.code, label: b.name })),
  )

  const genderModel = computed({
    get: () => gender.value as string,
    set: (v: string) => {
      const match = GENDER_OPTIONS.find((g) => g.value === v)
      if (match) gender.value = match.value
    },
  })
  const purposeModel = computed({
    get: () => purpose.value as string,
    set: (v: string) => {
      const match = PURPOSE_OPTIONS.find((p) => p.value === v)
      if (match) purpose.value = match.value
    },
  })

  const cityPlaceholder = computed(() =>
    !selectedProvince.value ? 'Select province first' : isLoadingCities.value ? 'Loading...' : 'Select municipality',
  )
  const barangayPlaceholder = computed(() =>
    !selectedCity.value ? 'Select municipality first' : isLoadingBarangays.value ? 'Loading...' : 'Select barangay',
  )

  const resetForm = () => {
    firstname.value = ''
    middlename.value = ''
    lastname.value = ''
    gender.value = 'not specified'
    contactNumber.value = ''
    purok.value = ''
    purpose.value = 'gip'
    consent.value = false
    errorMessage.value = ''
    step.value = 1
    initPsgc(DEFAULT_REGION, DEFAULT_PROVINCE)
  }

  onMounted(() => {
    initPsgc(DEFAULT_REGION, DEFAULT_PROVINCE)
  })

  const onProvinceChange = (code: string) => {
    selectedProvince.value = provinces.value.find((item) => item.code === code) || null
  }

  const onCityChange = (code: string) => {
    selectedCity.value = cities.value.find((item) => item.code === code) || null
  }

  const onBarangayChange = (code: string) => {
    selectedBarangay.value = barangays.value.find((item) => item.code === code) || null
  }

  const validatePersonal = (): string => {
    if (!firstname.value.trim()) return 'First name is required.'
    if (!lastname.value.trim()) return 'Last name is required.'
    const contact = contactNumber.value.trim()
    if (contact && !/^[0-9+() -]{7,20}$/.test(contact)) return 'Please enter a valid contact number.'
    return ''
  }

  const validateAddress = (): string => {
    if (!selectedProvince.value?.name) return 'Please select a province.'
    if (!selectedCity.value?.name) return 'Please select a municipality/city.'
    if (!selectedBarangay.value?.name) return 'Please select a barangay.'
    if (!purok.value.trim()) return 'Purok or street is required.'
    if (!consent.value) return 'Please agree to the privacy notice before submitting.'
    return ''
  }

  /** Part 1 → part 2, only when the personal information is valid. */
  const nextStep = () => {
    errorMessage.value = validatePersonal()
    if (!errorMessage.value) step.value = 2
  }

  const prevStep = () => {
    errorMessage.value = ''
    step.value = 1
  }

  const handleSubmit = async () => {
    if (isSubmitting.value) return
    if (step.value === 1) {
      nextStep()
      return
    }
    const personalError = validatePersonal()
    if (personalError) {
      errorMessage.value = personalError
      step.value = 1
      return
    }
    errorMessage.value = validateAddress()
    if (errorMessage.value) return

    isSubmitting.value = true
    try {
      await walkInService.submit({
        p_firstname: firstname.value.trim(),
        p_middlename: middlename.value.trim(),
        p_lastname: lastname.value.trim(),
        p_gender: gender.value,
        p_contact_number: contactNumber.value.trim(),
        p_province: selectedProvince.value?.name.trim() ?? '',
        p_geographic: selectedCity.value?.name.trim() ?? '',
        p_barangay: selectedBarangay.value?.name.trim() ?? '',
        p_purok: purok.value.trim(),
        p_purpose: purpose.value,
        p_consent: consent.value,
      })
      isSubmitted.value = true
    } catch (err) {
      errorMessage.value = err instanceof Error ? err.message : 'Could not submit the form. Please try again.'
    } finally {
      isSubmitting.value = false
    }
  }

  /** "Submit another" — clears the form for the next client. */
  const startOver = () => {
    resetForm()
    isSubmitted.value = false
  }

  return {
    provinces,
    cities,
    barangays,
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

    // Branding (same as the login page)
    logos: LOGIN_LOGOS,
    backgroundImage: walkInBackground,

    firstname,
    middlename,
    lastname,
    gender,
    contactNumber,
    purok,
    purpose,
    consent,
    errorMessage,
    isSubmitting,
    isSubmitted,
    step,
    currentStep,

    onProvinceChange,
    onCityChange,
    onBarangayChange,
    nextStep,
    prevStep,
    handleSubmit,
    startOver,
  }
}
