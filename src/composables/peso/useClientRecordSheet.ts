import { computed, onMounted, ref, watch, type Ref } from 'vue'
import { usePsgc } from '@/composables/common/usePsgc'
import { contactDigits, groupContactNumber, isValidContactNumber } from '@/helpers/common/contactNumberHelper'
import type {
  GenderType,
  ServiceRequired,
  WalkinAttendanceInsert,
} from '@/types/peso/clientRecord'

export interface UseClientRecordSheetOptions {
  open: Ref<boolean>
  emit: {
    (e: 'update:open', value: boolean): void
    (e: 'submit', payload: WalkinAttendanceInsert): void
  }
}

export function useClientRecordSheet(options: UseClientRecordSheetOptions) {
  const { open, emit } = options

  // PSGC Composable
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

  // Form state
  const firstname = ref('')
  const middlename = ref('')
  const lastname = ref('')
  const gender = ref<GenderType>('not specified')
  // Digits only; the input shows them grouped 4-3-4 (`0912-345-6789`).
  const contactNumberDigits = ref('')
  const contactNumber = computed({
    get: () => groupContactNumber(contactNumberDigits.value, '-'),
    set: (v: string) => {
      contactNumberDigits.value = contactDigits(v)
    },
  })
  const purok = ref('')
  const purpose = ref<ServiceRequired>('gip')

  // Form validation / error
  const errorMessage = ref('')

  const resetForm = () => {
    firstname.value = ''
    middlename.value = ''
    lastname.value = ''
    gender.value = 'not specified'
    contactNumberDigits.value = ''
    purok.value = ''
    purpose.value = 'gip'
    errorMessage.value = ''
    initPsgc('Region XIII (Caraga)', 'Agusan del Sur')
  }

  // Watch for sheet opening to reset
  watch(
    open,
    (isOpen) => {
      if (isOpen) {
        resetForm()
      }
    }
  )

  onMounted(() => {
    initPsgc('Region XIII (Caraga)', 'Agusan del Sur')
  })

  const onProvinceChange = (code: string) => {
    const p = provinces.value.find((item) => item.code === code)
    selectedProvince.value = p || null
  }

  const onCityChange = (code: string) => {
    const c = cities.value.find((item) => item.code === code)
    selectedCity.value = c || null
  }

  const onBarangayChange = (code: string) => {
    const b = barangays.value.find((item) => item.code === code)
    selectedBarangay.value = b || null
  }

  const handleClose = () => {
    emit('update:open', false)
  }

  const handleSubmit = () => {
    errorMessage.value = ''

    if (!firstname.value.trim()) {
      errorMessage.value = 'First name is required.'
      return
    }
    if (!lastname.value.trim()) {
      errorMessage.value = 'Last name is required.'
      return
    }
    if (contactNumberDigits.value && !isValidContactNumber(contactNumberDigits.value)) {
      errorMessage.value = 'Contact number must be 11 digits, like 0912-345-6789.'
      return
    }
    if (!selectedProvince.value?.name) {
      errorMessage.value = 'Please select a province.'
      return
    }
    if (!selectedCity.value?.name) {
      errorMessage.value = 'Please select a municipality/city.'
      return
    }
    if (!selectedBarangay.value?.name) {
      errorMessage.value = 'Please select a barangay.'
      return
    }
    if (!purok.value.trim()) {
      errorMessage.value = 'Purok or street is required.'
      return
    }

    const payload: WalkinAttendanceInsert = {
      firstname: firstname.value.trim(),
      middlename: middlename.value.trim() || null,
      lastname: lastname.value.trim(),
      gender: gender.value,
      contact_number: contactNumberDigits.value || null,
      province: selectedProvince.value.name.trim(),
      geographic: selectedCity.value.name.trim(),
      barangay: selectedBarangay.value.name.trim(),
      purok: purok.value.trim(),
      purpose: purpose.value,
    }

    emit('submit', payload)
  }

  return {
    // PSGC
    provinces,
    cities,
    barangays,
    selectedProvince,
    selectedCity,
    selectedBarangay,
    isLoadingProvinces,
    isLoadingCities,
    isLoadingBarangays,

    // Form fields
    firstname,
    middlename,
    lastname,
    gender,
    contactNumber,
    purok,
    purpose,
    errorMessage,

    // Handlers
    onProvinceChange,
    onCityChange,
    onBarangayChange,
    handleClose,
    handleSubmit,
    resetForm,
  }
}
