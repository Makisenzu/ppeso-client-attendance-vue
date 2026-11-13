import { computed, ref, watch, type Ref } from 'vue'
import { useOfficeStore } from '@/stores/officeStore'
import { userManagementService } from '@/services/peso/userManagementService'
import { useToastAlert } from '@/composables/common/useToastAlert'
import { buildPesoEmail, splitPersonName } from '@/helpers/common/nameHelper'
import { DEFAULT_STAFF_PASSWORD, MIN_PASSWORD_LENGTH } from '@/helpers/common/accountHelper'
import type { ProfileRecord, SupervisorFormData } from '@/types/peso/userManagement'
import type { SearchSelectOption } from '@/types/common/searchSelect'

const emptyForm = (): SupervisorFormData => ({
  officeId: '',
  firstname: '',
  middlename: '',
  lastname: '',
  email: '',
  password: DEFAULT_STAFF_PASSWORD,
})

export interface UseAddSupervisorOptions {
  open: Ref<boolean>
  /** Current accounts — used to grey out offices that already have a supervisor. */
  profiles: Ref<ProfileRecord[]>
  close: () => void
  onCreated: () => void
}

/**
 * Add Supervisor dialog: pick an office, its chief (from the office directory) fills the name,
 * then the account is created with role 'supervisor' for that office.
 */
export function useAddSupervisor(options: UseAddSupervisorOptions) {
  const officeStore = useOfficeStore()
  const toast = useToastAlert()

  const form = ref<SupervisorFormData>(emptyForm())
  const errors = ref<Record<string, string>>({})
  const isSubmitting = ref(false)

  // ─── Email: lastname.firstname@peso.ph, kept in sync until the admin types their own ───
  const isEmailEdited = ref(false)
  const suggestedEmail = computed(() => buildPesoEmail(form.value.firstname, form.value.lastname))

  watch(suggestedEmail, (email) => {
    if (!isEmailEdited.value) form.value.email = email
  })

  // An email that differs from the suggestion was typed by the admin: stop auto-filling.
  // Clearing the field turns auto-fill back on.
  watch(
    () => form.value.email,
    (email) => {
      if (email.trim() === '') {
        isEmailEdited.value = false
        if (suggestedEmail.value) form.value.email = suggestedEmail.value
      } else {
        isEmailEdited.value = email !== suggestedEmail.value
      }
    },
  )

  // Reset and load offices each time the dialog opens.
  watch(options.open, (open) => {
    if (!open) return
    form.value = emptyForm()
    errors.value = {}
    isEmailEdited.value = false
    if (officeStore.offices.length === 0) void officeStore.fetchOffices()
  })

  /** Office id → name of the supervisor already assigned to it. */
  const supervisorByOffice = computed(() => {
    const map = new Map<string, string>()
    for (const p of options.profiles.value) {
      if (p.role === 'supervisor' && p.officeId) map.set(p.officeId, p.fullName)
    }
    return map
  })

  const officeOptions = computed<SearchSelectOption[]>(() =>
    officeStore.activeOffices.map((office) => {
      const existing = supervisorByOffice.value.get(office.id)
      return {
        value: office.id,
        label: office.code ? `${office.name} (${office.code})` : office.name,
        description: existing
          ? `Supervisor: ${existing}`
          : office.officeHead
            ? `Chief: ${office.officeHead}`
            : 'No chief listed in the directory',
        disabled: Boolean(existing) || !office.officeHead,
      }
    }),
  )

  const isLoadingOffices = computed(() => officeStore.isLoading)
  const selectedOffice = computed(() => officeStore.offices.find((o) => o.id === form.value.officeId) ?? null)
  const chiefName = computed(() => selectedOffice.value?.officeHead ?? '')
  const hasNoEligibleOffice = computed(
    () => !isLoadingOffices.value && officeOptions.value.every((o) => o.disabled),
  )

  /** Picking an office fills the name from its chief (still editable). */
  const onOfficeChange = () => {
    const parts = splitPersonName(chiefName.value)
    form.value = { ...form.value, ...parts }
    const { officeId: _office, firstname: _first, lastname: _last, ...rest } = errors.value
    errors.value = rest
  }

  const validate = (): boolean => {
    const next: Record<string, string> = {}
    if (!form.value.officeId) next.officeId = 'Select an office'
    if (!form.value.firstname.trim()) next.firstname = 'First name is required'
    if (!form.value.lastname.trim()) next.lastname = 'Last name is required'
    const email = form.value.email.trim()
    if (!email) next.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Enter a valid email address'
    if (form.value.password.length < MIN_PASSWORD_LENGTH) {
      next.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
    }
    errors.value = next
    return Object.keys(next).length === 0
  }

  /** Cancel / dismiss — ignored while creating. */
  const close = () => {
    if (isSubmitting.value) return
    options.close()
  }

  const submit = async () => {
    if (!validate()) return
    isSubmitting.value = true
    try {
      const result = await userManagementService.createUser({
        email: form.value.email.trim(),
        password: form.value.password,
        firstname: form.value.firstname.trim(),
        middlename: form.value.middlename.trim(),
        lastname: form.value.lastname.trim(),
        position: 'employee',
        officeId: form.value.officeId,
        role: 'supervisor',
      })

      if (!result.success) {
        errors.value = { submit: result.error || 'Failed to create the supervisor account.' }
        return
      }

      const name = `${form.value.firstname.trim()} ${form.value.lastname.trim()}`
      const office = selectedOffice.value?.name ?? 'the office'
      options.close()
      toast.success(`${name} was added as supervisor of ${office}.`)
      options.onCreated()
    } catch (err) {
      errors.value = { submit: err instanceof Error ? err.message : 'An unexpected error occurred.' }
    } finally {
      isSubmitting.value = false
    }
  }

  return {
    form,
    errors,
    isSubmitting,
    isLoadingOffices,
    officeOptions,
    chiefName,
    hasNoEligibleOffice,
    passwordHint: `Default: ${DEFAULT_STAFF_PASSWORD}. Ask them to change it in My Account after signing in.`,
    onOfficeChange,
    isEmailEdited,
    close,
    submit,
  }
}
