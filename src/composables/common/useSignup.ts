import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthForm } from '@/composables/useAuthForm'
import { authService } from '@/services/common/authService'
import type { ProfilePosition } from '@/types/peso/userManagement'

/** Self-registered accounts start as Employee (role: beneficiary, set by the database). */
const DEFAULT_POSITION: ProfilePosition = 'employee'

/** Signup page: validates, registers, signs in, and opens the dashboard. */
export function useSignup() {
  const router = useRouter()
  const email = ref('')
  const password = ref('')
  const confirmPassword = ref('')
  const firstName = ref('')
  const middleName = ref('')
  const lastName = ref('')
  const { error, loading, runAuthAction, setError, validateRequiredFields } = useAuthForm()

  const validateForm = (): boolean => {
    if (!validateRequiredFields([email.value, password.value, confirmPassword.value, firstName.value, lastName.value])) {
      return false
    }
    if (password.value !== confirmPassword.value) {
      setError('Passwords do not match')
      return false
    }
    if (password.value.length < 6) {
      setError('Password must be at least 6 characters')
      return false
    }
    return true
  }

  const handleSignup = async () => {
    if (!validateForm()) {
      return
    }

    await runAuthAction(async () => {
      await authService.signUp({
        email: email.value,
        password: password.value,
        firstname: firstName.value,
        middlename: middleName.value || null,
        lastname: lastName.value,
        position: DEFAULT_POSITION,
      })

      try {
        await authService.signIn(email.value, password.value)
      } catch (err) {
        throw new Error(`Sign-in after registration failed: ${err instanceof Error ? err.message : 'unknown error'}`)
      }

      // The router guard sends the user on to their role's dashboard.
      await router.push({ name: 'dashboard' })
    })
  }

  return {
    email,
    password,
    confirmPassword,
    firstName,
    middleName,
    lastName,
    error,
    loading,
    handleSignup,
  }
}
