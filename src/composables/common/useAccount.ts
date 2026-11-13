import { computed, onMounted, ref } from 'vue'
import { accountService } from '@/services/common/accountService'
import {
  formatAccountFullName,
  formatAccountRoleLabel,
  formatAccountStatusLabel,
  formatPositionLabel,
  getAccountInitials,
  getAccountStatusBadgeClass,
  MIN_PASSWORD_LENGTH,
} from '@/helpers/common/accountHelper'
import { formatDisplayDate } from '@/helpers/common/dateFormatHelper'
import type { ChangePasswordFormData, MyAccount, MyNameFormData } from '@/types/common/account'
import { useToastAlert } from '@/composables/common/useToastAlert'

/** Account page for every role: view the account, edit own name, change password. */
export function useAccount() {
  const account = ref<MyAccount | null>(null)
  const isLoading = ref(false)
  const loadError = ref<string | null>(null)

  // ─── Feedback: toast in the top-right corner (useToastAlert) ───
  const toast = useToastAlert()
  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    toast.show(text, type)
  }

  // ─── Name form ───
  const nameForm = ref<MyNameFormData>({ firstname: '', middlename: '', lastname: '' })
  const nameErrors = ref<Record<string, string>>({})
  const isSavingName = ref(false)

  const resetNameForm = () => {
    nameForm.value = {
      firstname: account.value?.firstname ?? '',
      middlename: account.value?.middlename ?? '',
      lastname: account.value?.lastname ?? '',
    }
    nameErrors.value = {}
  }

  const isNameDirty = computed(() => {
    const a = account.value
    if (!a) return false
    return (
      nameForm.value.firstname.trim() !== a.firstname ||
      nameForm.value.middlename.trim() !== (a.middlename ?? '') ||
      nameForm.value.lastname.trim() !== a.lastname
    )
  })

  const fetchAccount = async () => {
    isLoading.value = true
    loadError.value = null
    try {
      account.value = await accountService.getMyAccount()
      resetNameForm()
    } catch (err) {
      loadError.value = err instanceof Error ? err.message : 'Failed to load your account.'
    } finally {
      isLoading.value = false
    }
  }

  const saveName = async () => {
    if (!account.value) return
    const errors: Record<string, string> = {}
    if (!nameForm.value.firstname.trim()) errors.firstname = 'First name is required'
    if (!nameForm.value.lastname.trim()) errors.lastname = 'Last name is required'
    nameErrors.value = errors
    if (Object.keys(errors).length > 0) return

    isSavingName.value = true
    try {
      await accountService.updateMyName(account.value.id, nameForm.value)
      await fetchAccount()
      showFeedback('Your name was updated.')
    } catch (err) {
      nameErrors.value = { submit: err instanceof Error ? err.message : 'Failed to save your name.' }
    } finally {
      isSavingName.value = false
    }
  }

  // ─── Password form ───
  const passwordForm = ref<ChangePasswordFormData>({ newPassword: '', confirmPassword: '' })
  const passwordErrors = ref<Record<string, string>>({})
  const isChangingPassword = ref(false)
  const passwordHint = `At least ${MIN_PASSWORD_LENGTH} characters.`

  const changePassword = async () => {
    const errors: Record<string, string> = {}
    if (passwordForm.value.newPassword.length < MIN_PASSWORD_LENGTH) {
      errors.newPassword = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
    }
    if (passwordForm.value.confirmPassword !== passwordForm.value.newPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }
    passwordErrors.value = errors
    if (Object.keys(errors).length > 0) return

    isChangingPassword.value = true
    try {
      await accountService.changePassword(passwordForm.value.newPassword)
      passwordForm.value = { newPassword: '', confirmPassword: '' }
      showFeedback('Your password was changed.')
    } catch (err) {
      passwordErrors.value = { submit: err instanceof Error ? err.message : 'Failed to change your password.' }
    } finally {
      isChangingPassword.value = false
    }
  }

  // ─── Kiosk passcode (hidden until asked for) ───
  const isPasscodeVisible = ref(false)
  const togglePasscode = () => {
    isPasscodeVisible.value = !isPasscodeVisible.value
  }
  /** Admins and supervisors have no passcode (they don't use the kiosk). */
  const hasPasscode = computed(() => Boolean(account.value?.passcode))
  const passcodeDisplay = computed(() => {
    const code = account.value?.passcode ?? ''
    return isPasscodeVisible.value ? code : '•'.repeat(code.length || 6)
  })

  // ─── Display values ───
  const summary = computed(() => {
    const a = account.value
    if (!a) return null
    return {
      fullName: formatAccountFullName(a),
      initials: getAccountInitials(a),
      email: a.email,
      emailVerified: a.emailVerified,
      roleLabel: formatAccountRoleLabel(a.role),
      positionLabel: formatPositionLabel(a.position),
      statusLabel: formatAccountStatusLabel(a.status),
      statusBadgeClass: getAccountStatusBadgeClass(a.status),
      office: a.officeName ? (a.officeCode ? `${a.officeName} (${a.officeCode})` : a.officeName) : 'No office assigned',
      memberSince: formatDisplayDate(a.createdAt),
      lastUpdated: formatDisplayDate(a.updatedAt, 'Never'),
    }
  })

  onMounted(() => {
    fetchAccount()
  })


  return {
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
  }
}
