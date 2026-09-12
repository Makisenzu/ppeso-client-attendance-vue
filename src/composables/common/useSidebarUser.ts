import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { authService } from '@/services/common/authService'
import { buildFullName } from '@/helpers/peso/userManagementHelper'
import { getInitials } from '@/helpers/peso/attendanceHelper'
import { useSidebar } from '@/components/ui/sidebar'

export function useSidebarUser() {
  const router = useRouter()
  const { state, isMobile } = useSidebar()

  const displayName = ref('User')
  const userInitials = ref('U')
  const userEmail = ref('')
  const isVerified = ref(false)
  const isLoading = ref(true)

  let authSubscription: ReturnType<typeof authService.onAuthStateChange> | null = null

  const updateUserInfo = async () => {
    try {
      const user = await authService.getCurrentUser()

      if (!user) {
        displayName.value = 'User'
        userInitials.value = 'U'
        userEmail.value = ''
        isVerified.value = false
        isLoading.value = false
        return
      }

      userEmail.value = user.email || ''
      isVerified.value = !!user.email_confirmed_at

      const profile = await authService.getUserProfile(user.id)

      if (profile && (profile.firstname || profile.lastname)) {
        const completeName = buildFullName(profile.firstname, profile.middlename, profile.lastname)
        displayName.value = completeName
        userInitials.value = getInitials(completeName)
      } else {
        const fallbackFullName = (user.user_metadata?.full_name || user.user_metadata?.name || '') as string
        const resolvedName = fallbackFullName.trim() || user.email?.split('@')[0] || 'User'
        displayName.value = resolvedName
        userInitials.value = getInitials(resolvedName)
      }
    } catch (err) {
      console.error('Failed to update user info in sidebar:', err)
    } finally {
      isLoading.value = false
    }
  }

  const handleSignOut = async () => {
    await authService.signOut()
    await router.replace({ name: 'login' })
  }

  onMounted(async () => {
    await updateUserInfo()
    authSubscription = authService.onAuthStateChange(async () => {
      await updateUserInfo()
    })
  })

  onUnmounted(() => {
    authSubscription?.data.subscription.unsubscribe()
  })

  return {
    state,
    isMobile,
    displayName,
    userInitials,
    userEmail,
    isVerified,
    isLoading,
    handleSignOut,
    updateUserInfo,
  }
}
