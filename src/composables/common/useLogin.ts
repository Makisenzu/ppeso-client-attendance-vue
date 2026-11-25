import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthForm } from '@/composables/useAuthForm'
import { authService, InvalidCredentialsError } from '@/services/common/authService'
import { useAuthStore, getDashboardByRole } from '@/stores/authStore'
import loginBackground from '@/assets/bg.png'

/** Login page: signs in, loads the role, and opens that role's dashboard. */
export function useLogin() {
  const router = useRouter()
  const authStore = useAuthStore()
  const email = ref('')
  const password = ref('')
  const { error, loading, runAuthAction } = useAuthForm()

  /** Shown when sign-in (or a reopened session) belongs to an account an admin set to inactive. */
  const INACTIVE_MESSAGE = 'This account is inactive'

  // The router guard signs out inactive sessions and sends them here: explain why.
  onMounted(() => {
    if (authStore.consumeInactiveNotice()) error.value = INACTIVE_MESSAGE
  })

  // ─── Per-field validation (shown under each input) ───
  const emailError = ref('')
  const passwordError = ref('')

  const validate = (): boolean => {
    const value = email.value.trim()
    emailError.value = !value
      ? 'Email is required'
      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
        ? 'Enter a valid email address'
        : ''
    passwordError.value = password.value ? '' : 'Password is required'
    return !emailError.value && !passwordError.value
  }

  // ─── Shake: only the wrong field shakes (and gets the red border) on submit ───
  const emailShake = ref(false)
  const passwordShake = ref(false)

  /** Clears first and sets on the next frame, so the animation replays on every submit. */
  const shake = (fields: { email: boolean; password: boolean }) => {
    emailShake.value = false
    passwordShake.value = false
    requestAnimationFrame(() => {
      emailShake.value = fields.email
      passwordShake.value = fields.password
    })
  }

  const stopEmailShake = () => {
    emailShake.value = false
  }
  const stopPasswordShake = () => {
    passwordShake.value = false
  }

  // Clear a field's error as soon as the user edits it.
  watch(email, () => {
    emailError.value = ''
  })
  watch(password, () => {
    passwordError.value = ''
  })

  const handleLogin = async () => {
    error.value = ''
    if (!validate()) {
      shake({ email: !!emailError.value, password: !!passwordError.value })
      return
    }

    const signedIn = await runAuthAction(async () => {
      try {
        await authService.signIn(email.value, password.value)
      } catch (err) {
        if (!(err instanceof InvalidCredentialsError)) throw err
        // Supabase doesn't say which one was wrong: an unknown email means the email, else the password.
        const exists = await authService.emailExists(email.value)
        if (exists === false) {
          emailError.value = 'No account uses this email'
          throw new Error('')
        }
        if (exists === true) {
          passwordError.value = 'Incorrect password'
          throw new Error('')
        }
        throw new Error('Incorrect email or password')
      }
      await authStore.fetchUserRole()
      if (authStore.consumeInactiveNotice()) throw new Error(INACTIVE_MESSAGE)
      await router.push({ name: getDashboardByRole(authStore.userRole) })
    })
    if (!signedIn) {
      // The check failed (exists === null): both may be wrong, so both shake.
      const unknown = error.value === 'Incorrect email or password'
      shake({ email: unknown || !!emailError.value, password: unknown || !!passwordError.value })
    }
  }

  return {
    email,
    password,
    emailError,
    passwordError,
    emailShake,
    passwordShake,
    stopEmailShake,
    stopPasswordShake,
    error,
    loading,
    handleLogin,
    backgroundImage: loginBackground,
    logos: LOGIN_LOGOS,
  }
}

/** Logos at the top of the login card (served from /public). */
export const LOGIN_LOGOS = [
  { src: '/agsur.png', alt: 'Province of Agusan del Sur', fallback: 'AS' },
  { src: '/pesologo.png', alt: 'Public Employment Service Office', fallback: 'PESO' },
] as const
