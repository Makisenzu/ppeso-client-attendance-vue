import { computed, ref, watch, type Ref } from 'vue'
import { usePsgc } from '@/composables/common/usePsgc'
import { contactDigits, groupContactNumber } from '@/helpers/common/contactNumberHelper'
import {
  computeAge,
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
} from '@/helpers/peso/dataEntryHelper'
import type { AnnexDEntry, AnnexDEntryInsert, AnnexDFormData, AnnexDFormErrors, AnnexDLocation } from '@/types/peso/dataEntry'
import type { SearchSelectOption } from '@/types/common/searchSelect'

const DEFAULT_REGION = 'Region XIII (Caraga)'
const DEFAULT_PROVINCE = 'Agusan del Sur'

export interface UseDataEntrySheetOptions {
  open: Ref<boolean>
  /** The entry being edited; null when adding. */
  entry: Ref<AnnexDEntry | null>
  emit: {
    (e: 'update:open', value: boolean): void
    (e: 'submit', payload: AnnexDEntryInsert): void
  }
}

/** Add / Edit sheet of the Data Entry page: one ANNEX D beneficiary. */
export function useDataEntrySheet(options: UseDataEntrySheetOptions) {
  const { open, entry, emit } = options

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

  const currentLocation = (): AnnexDLocation | null => {
    if (!selectedProvince.value || !selectedCity.value || !selectedBarangay.value) return null
    return {
      province: selectedProvince.value.name,
      municipality: selectedCity.value.name,
      barangay: selectedBarangay.value.name,
    }
  }

  // Reset (or load the entry) every time the sheet opens
  watch(open, (isOpen) => {
    if (!isOpen) return
    errors.value = {}
    // Drop the last sheet's location; initialize() below restores without clearing.
    selectedCity.value = null
    selectedBarangay.value = null
    const current = entry.value
    if (current) {
      form.value = entryToForm(current)
      void initPsgc(DEFAULT_REGION, current.province, current.municipality, current.barangay)
    } else {
      form.value = emptyAnnexDForm()
      void initPsgc(DEFAULT_REGION, DEFAULT_PROVINCE)
    }
    loadChoices()
  })

  const handleClose = () => {
    emit('update:open', false)
  }

  const handleSubmit = () => {
    const location = currentLocation()
    const found = validateAnnexDForm(form.value, location)
    for (const { field, label } of CHOICE_FIELDS) {
      if (isOther(field) && !choices.value[field].other.trim()) found[field] = `Please specify ${label}.`
    }
    errors.value = found
    if (Object.keys(errors.value).length > 0 || !location) return
    emit('submit', formToPayload(form.value, location))
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
    isLoadingProvinces,
    isLoadingCities,
    isLoadingBarangays,
    handleClose,
    handleSubmit,
  }
}
