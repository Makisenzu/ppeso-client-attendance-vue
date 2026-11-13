import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthForm } from '@/composables/useAuthForm'
import { authService } from '@/services/common/authService'
import { useAuthStore, getDashboardByRole } from '@/stores/authStore'

/** Login page: signs in, loads the role, and opens that role's dashboard. */
export function useLogin() {
  const router = useRouter()
  const authStore = useAuthStore()
  const email = ref('')
  const password = ref('')
  const { error, loading, runAuthAction, validateRequiredFields } = useAuthForm()

  const handleLogin = async () => {
    if (!validateRequiredFields([email.value, password.value])) {
      return
    }

    await runAuthAction(async () => {
      await authService.signIn(email.value, password.value)
      await authStore.fetchUserRole()
      await router.push({ name: getDashboardByRole(authStore.userRole) })
    })
  }

  return { email, password, error, loading, handleLogin }
}
