import { computed, ref, watch, type Ref } from 'vue'
import { usePsgc } from '@/composables/common/usePsgc'
import { contactDigits, groupContactNumber } from '@/helpers/common/contactNumberHelper'
import {
  computeAge,
  districtForMunicipality,
  emptyAnnexDForm,
  entryToForm,
  formToPayload,
  ID_TYPE_SUGGESTIONS,
  joinChoice,
  OCCUPATION_SUGGESTIONS,
  OTHER_CHOICE,
  SKILLS_TRAINING_SUGGESTIONS,
  splitChoice,
  todayIso,
  validateAnnexDForm,
} from '@/helpers/common/dataEntryHelper'
import type { AnnexDEntry, AnnexDEntryInsert, AnnexDFormData, AnnexDFormErrors, AnnexDLocation } from '@/types/common/dataEntry'
import type { SearchSelectOption } from '@/types/common/searchSelect'

const DEFAULT_REGION = 'Region XIII (Caraga)'
const DEFAULT_PROVINCE = 'Agusan del Sur'

export interface UseAnnexDFormOptions {
  /** When given, the form resets (or loads `entry`) every time this turns true — the admin sheet. */
  open?: Ref<boolean>
  /** The entry being edited; null when adding. */
  entry?: Ref<AnnexDEntry | null>
  /** Called with a valid payload. */
  onSubmit: (payload: AnnexDEntryInsert) => void
  onClose?: () => void
}

/**
 * One ANNEX D beneficiary form — shared by the admin Add / Edit sheet and the public /data-entry page.
 * Rendered by `AnnexDFormFields.vue`.
 */
export function useAnnexDForm(options: UseAnnexDFormOptions) {
  const { open, onSubmit, onClose } = options
  const entry = options.entry ?? ref<AnnexDEntry | null>(null)

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

  const form = ref<AnnexDFormData>(emptyAnnexDForm())
  const errors = ref<AnnexDFormErrors>({})
  const isEditMode = computed(() => entry.value !== null)
  const maxBirthdate = todayIso()

  /** The input shows the digits grouped 4-3-4 (`0912-345-6789`); the form keeps digits only. */
  const contactNumber = computed({
    get: () => groupContactNumber(form.value.contactNumber, '-'),
    set: (value: string) => {
      form.value.contactNumber = contactDigits(value)
    },
  })

  const age = computed(() => computeAge(form.value.birthdate))

  // ─── Type of ID, Occupation, Skills Training: a SearchSelect + "Others (please specify)" text ───
  type ChoiceField = 'idType' | 'occupation' | 'skillsTrainingNeeded'
  const CHOICE_FIELDS: { field: ChoiceField; values: string[]; label: string }[] = [
    { field: 'idType', values: ID_TYPE_SUGGESTIONS, label: 'the type of ID' },
    { field: 'occupation', values: OCCUPATION_SUGGESTIONS, label: 'the occupation' },
    { field: 'skillsTrainingNeeded', values: SKILLS_TRAINING_SUGGESTIONS, label: 'the skills training' },
  ]
  const choices = ref<Record<ChoiceField, { choice: string; other: string }>>({
    idType: { choice: '', other: '' },
    occupation: { choice: '', other: '' },
    skillsTrainingNeeded: { choice: '', other: '' },
  })
  const isOther = (field: ChoiceField) => choices.value[field].choice === OTHER_CHOICE

  const loadChoices = () => {
    for (const { field, values } of CHOICE_FIELDS) choices.value[field] = splitChoice(form.value[field], values)
  }

  // Keep the saved text in step with the select and the "Others" box
  watch(
    choices,
    (value) => {
      for (const { field } of CHOICE_FIELDS) form.value[field] = joinChoice(value[field].choice, value[field].other)
    },
    { deep: true },
  )

  const toOptions = (list: { code: string; name: string }[]): SearchSelectOption[] =>
    list.map((item) => ({ value: item.code, label: item.name }))
  const provinceOptions = computed(() => toOptions(provinces.value))
  const cityOptions = computed(() => toOptions(cities.value))
  const barangayOptions = computed(() => toOptions(barangays.value))

  const provinceCode = computed({
    get: () => selectedProvince.value?.code ?? '',
    set: (code: string) => {
      selectedProvince.value = provinces.value.find((p) => p.code === code) ?? null
    },
  })
  const cityCode = computed({
    get: () => selectedCity.value?.code ?? '',
    set: (code: string) => {
      selectedCity.value = cities.value.find((c) => c.code === code) ?? null
    },
  })
  const barangayCode = computed({
    get: () => selectedBarangay.value?.code ?? '',
    set: (code: string) => {
      selectedBarangay.value = barangays.value.find((b) => b.code === code) ?? null
    },
  })

  // District comes from the city / municipality (Agusan del Sur); other provinces pick it by hand
  const autoDistrict = computed(() => districtForMunicipality(selectedProvince.value?.name, selectedCity.value?.name))
  const isDistrictAuto = computed(() => autoDistrict.value !== null)
  watch(autoDistrict, (district, previous) => {
    if (district) form.value.district = district
    else if (previous) form.value.district = '' // left Agusan del Sur: don't keep the auto-filled value
  })

  const currentLocation = (): AnnexDLocation | null => {
    if (!selectedProvince.value || !selectedCity.value || !selectedBarangay.value) return null
    return {
      province: selectedProvince.value.name,
      municipality: selectedCity.value.name,
      barangay: selectedBarangay.value.name,
    }
  }

  /**
   * Clears the form (or loads the entry being edited). `keepLocation` keeps the province, city, barangay,
   * district and type of beneficiary for the next entry — beneficiaries are encoded a barangay at a time.
   */
  const reset = (keepLocation = false) => {
    errors.value = {}
    const current = entry.value
    if (keepLocation && !current) {
      const kept = form.value
      form.value = { ...emptyAnnexDForm(), district: kept.district, beneficiaryType: kept.beneficiaryType }
      loadChoices()
      return
    }
    // Drop the last location; initialize() below restores without clearing.
    selectedCity.value = null
    selectedBarangay.value = null
    if (current) {
      form.value = entryToForm(current)
      void initPsgc(DEFAULT_REGION, current.province, current.municipality, current.barangay)
    } else {
      form.value = emptyAnnexDForm()
      void initPsgc(DEFAULT_REGION, DEFAULT_PROVINCE)
    }
    loadChoices()
  }

  if (open) {
    watch(open, (isOpen) => {
      if (isOpen) reset()
    })
  }

  const handleClose = () => {
    onClose?.()
  }

  const handleSubmit = () => {
    const location = currentLocation()
    const found = validateAnnexDForm(form.value, location)
    for (const { field, label } of CHOICE_FIELDS) {
      if (isOther(field) && !choices.value[field].other.trim()) found[field] = `Please specify ${label}.`
    }
    errors.value = found
    if (Object.keys(errors.value).length > 0 || !location) return
    onSubmit(formToPayload(form.value, location))
  }

  return {
    form,
    errors,
    isEditMode,
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
    reset,
    handleClose,
    handleSubmit,
  }
}
