import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useMediaQuery } from '@vueuse/core'
import { useAuthForm } from '@/composables/useAuthForm'
import { authService } from '@/services/common/authService'
import { useAuthStore, getDashboardByRole } from '@/stores/authStore'

/** Login page: signs in, loads the role, and opens that role's dashboard. */
export function useLogin() {
  const router = useRouter()
  const authStore = useAuthStore()
  const email = ref('')
  const password = ref('')
  const { error, loading, runAuthAction } = useAuthForm()

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
      return
    }

    await runAuthAction(async () => {
      await authService.signIn(email.value, password.value)
      await authStore.fetchUserRole()
      await router.push({ name: getDashboardByRole(authStore.userRole) })
    })
  }

  // ─── Animated background (MagicRings) ───
  // Skipped for people who ask their OS for reduced motion.
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const showBackground = computed(() => !prefersReducedMotion.value)
  const backgroundRings = LOGIN_BACKGROUND_RINGS

  return {
    email,
    password,
    emailError,
    passwordError,
    error,
    loading,
    handleLogin,
    showBackground,
    backgroundRings,
    logos: LOGIN_LOGOS,
  }
}

/** Logos at the top of the login card (served from /public). */
const LOGIN_LOGOS = [
  { src: '/agsur.png', alt: 'Province of Agusan del Sur', fallback: 'AS' },
  { src: '/pesologo.png', alt: 'Public Employment Service Office', fallback: 'PESO' },
] as const

/** MagicRings settings for the login background (colors from the Vue Bits example). */
const LOGIN_BACKGROUND_RINGS = {
  color: '#fc42ff',
  colorTwo: '#42fcff',
  ringCount: 6,
  speed: 1,
  attenuation: 10,
  lineThickness: 2,
  baseRadius: 0.35,
  radiusStep: 0.1,
  scaleRate: 0.1,
  opacity: 1,
  blur: 0,
  noiseAmount: 0.1,
  rotation: 0,
  ringGap: 1.5,
  fadeIn: 0.7,
  fadeOut: 0.5,
  followMouse: false,
  mouseInfluence: 0.2,
  hoverScale: 1.2,
  parallax: 0.05,
  clickBurst: false,
} as const
