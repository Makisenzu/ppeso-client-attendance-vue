import { computed, onMounted, ref, useTemplateRef, watch } from 'vue'
import { accountService } from '@/services/common/accountService'
import { AVATAR_MAX_BYTES, AVATAR_TYPES, avatarService } from '@/services/common/avatarService'
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
import { useAvatarStore } from '@/stores/avatarStore'

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

  // ─── Profile picture (private bucket; shown and used on the GIP ID through a signed URL) ───
  const avatarInput = useTemplateRef<HTMLInputElement>('avatarInput')
  const avatarStore = useAvatarStore()
  const avatarUrl = ref<string | null>(null)
  const isSavingAvatar = ref(false)
  const hasAvatar = computed(() => Boolean(account.value?.avatarPath))
  /** 0–100 fill of the ring around the avatar while a photo saves. Storage gives no upload progress, so it eases
   *  toward a cap per step (upload → save → done) instead of tracking bytes. */
  const avatarProgress = ref(0)
  /** Ring color: primary while saving, green on success, red on failure. */
  const avatarUploadState = ref<'uploading' | 'success' | 'error'>('uploading')
  let progressTimer: ReturnType<typeof setInterval> | undefined

  const easeAvatarProgressTo = (cap: number) => {
    clearInterval(progressTimer)
    progressTimer = setInterval(() => {
      avatarProgress.value += (cap - avatarProgress.value) * 0.08
    }, 100)
  }

  const stopAvatarProgress = (value: number) => {
    clearInterval(progressTimer)
    avatarProgress.value = value
  }

  watch(
    () => account.value?.avatarPath,
    async (path) => {
      avatarUrl.value = await avatarStore.getUrl(path) // cached link → no re-download on every visit
      void avatarStore.setMyAvatarPath(path) // keep the sidebar footer in step after an upload or removal
    },
  )

  const chooseAvatar = () => avatarInput.value?.click()

  const onAvatarSelected = async (event: Event) => {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    const current = account.value
    if (!file || !current) return
    if (!AVATAR_TYPES.includes(file.type)) {
      showFeedback('Use a JPG, PNG or WebP photo.', 'error')
      return
    }
    if (file.size > AVATAR_MAX_BYTES) {
      showFeedback('The photo must be 5MB or smaller.', 'error')
      return
    }
    avatarProgress.value = 0
    avatarUploadState.value = 'uploading'
    isSavingAvatar.value = true
    easeAvatarProgressTo(75)
    try {
      const path = await avatarService.upload(current.id, file)
      easeAvatarProgressTo(95)
      try {
        await accountService.setAvatarPath(current.id, path)
      } catch (err) {
        await avatarService.remove([path]).catch(() => undefined) // don't leave an unused file behind
        throw err
      }
      avatarStore.prime(path, file) // show the picked file itself; no download of what we just uploaded
      if (current.avatarPath) {
        avatarStore.forget(current.avatarPath)
        await avatarService.remove([current.avatarPath]).catch(() => undefined)
      }
      await fetchAccount()
      stopAvatarProgress(100)
      avatarUploadState.value = 'success'
      await new Promise((resolve) => setTimeout(resolve, 900)) // let the ring finish filling and show green
      showFeedback('Your profile picture was updated.')
    } catch (err) {
      stopAvatarProgress(100)
      avatarUploadState.value = 'error'
      await new Promise((resolve) => setTimeout(resolve, 900)) // show the red ring before clearing it
      showFeedback(err instanceof Error ? err.message : 'Failed to update your photo.', 'error')
    } finally {
      stopAvatarProgress(0)
      isSavingAvatar.value = false
    }
  }

  const removeAvatar = async () => {
    const current = account.value
    if (!current?.avatarPath) return
    isSavingAvatar.value = true
    try {
      await accountService.setAvatarPath(current.id, null)
      avatarStore.forget(current.avatarPath)
      await avatarService.remove([current.avatarPath]).catch(() => undefined)
      await fetchAccount()
      showFeedback('Your profile picture was removed.')
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : 'Failed to remove your photo.', 'error')
    } finally {
      isSavingAvatar.value = false
    }
  }

  // ─── GIP ID (GIP accounts only) ───
  /** Whose ID Generate ID makes: this account when its position is GIP, otherwise none (button hidden) */
  const gipIdProfileId = computed(() => (account.value?.position === 'gip' ? account.value.id : null))
  const isIdCardOpen = ref(false)
  const openIdCard = () => {
    if (gipIdProfileId.value) isIdCardOpen.value = true
  }
  const closeIdCard = () => {
    isIdCardOpen.value = false
  }
  const onIdCardOpenChange = (open: boolean) => {
    if (!open) closeIdCard()
  }

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
    gipIdProfileId,
    avatarUrl,
    hasAvatar,
    isSavingAvatar,
    avatarProgress,
    avatarUploadState,
    chooseAvatar,
    onAvatarSelected,
    removeAvatar,
    isIdCardOpen,
    openIdCard,
    closeIdCard,
    onIdCardOpenChange,
  }
}
