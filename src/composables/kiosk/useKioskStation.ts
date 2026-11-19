import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { kioskStationService } from '@/services/kiosk/kioskStationService'
import { authService } from '@/services/common/authService'
import { useAuthStore } from '@/stores/authStore'
import { useThemeToggle } from '@/composables/common/useLayoutHeader'
import type { KioskStation } from '@/types/kiosk/kioskStation'

/** Office kiosk layout: the office this PACD computer belongs to, the theme toggle and sign-out. */
export function useKioskStation() {
  const router = useRouter()
  const authStore = useAuthStore()
  const theme = useThemeToggle()

  const station = ref<KioskStation | null>(null)
  const isLoading = ref(true)
  const loadError = ref<string | null>(null)

  const officeLabel = computed(() => {
    const s = station.value
    if (!s) return ''
    if (!s.officeName) return 'No office assigned'
    return s.officeCode ? `${s.officeName} (${s.officeCode})` : s.officeName
  })
  const hasOffice = computed(() => Boolean(station.value?.officeName))

  const loadStation = async () => {
    isLoading.value = true
    loadError.value = null
    try {
      station.value = await kioskStationService.getMyStation()
    } catch (err) {
      loadError.value = err instanceof Error ? err.message : 'Failed to load this kiosk.'
    } finally {
      isLoading.value = false
    }
  }

  // Signing out needs a confirmation: the PC is shared and the sign-in is set up by an administrator
  const isSignOutOpen = ref(false)
  const isSigningOut = ref(false)
  const openSignOut = () => {
    isSignOutOpen.value = true
  }
  const onSignOutOpenChange = (open: boolean) => {
    if (!isSigningOut.value) isSignOutOpen.value = open
  }
  const confirmSignOut = async () => {
    isSigningOut.value = true
    try {
      await authService.signOut()
      authStore.clearAuth()
      await router.replace({ name: 'login' })
    } finally {
      isSigningOut.value = false
      isSignOutOpen.value = false
    }
  }

  onMounted(() => {
    void loadStation()
  })

  return {
    ...theme,
    station,
    officeLabel,
    hasOffice,
    isLoading,
    loadError,
    isSignOutOpen,
    isSigningOut,
    openSignOut,
    onSignOutOpenChange,
    confirmSignOut,
  }
}
