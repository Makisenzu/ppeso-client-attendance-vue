import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/services/supabase'
import { authService } from '@/services/common/authService'
import type { Database } from '@/types/database.types'

type ProfileRole = Database['public']['Enums']['profile_roles']

export const useAuthStore = defineStore('auth', () => {
  const userRole = ref<ProfileRole | null>(null)
  const isLoading = ref(false)
  const isAuthenticated = ref(false)
  /** Set when a sign-in or session belongs to an account an admin marked inactive; the login page shows it once. */
  const accountInactive = ref(false)

  async function fetchUserRole() {
    isLoading.value = true

    try {
      const { data, error } = await supabase.auth.getUser()

      if (error || !data?.user) {
        clearAuth()
        return
      }

      isAuthenticated.value = true

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, status')
        .eq('id', data.user.id)
        .maybeSingle()

      if (profileError) {
        console.warn('Error fetching user role:', profileError.message)
        userRole.value = null
        return
      }

      // Inactive accounts may not use the app: end the session and let the login page explain why.
      if (profile?.status === 'inactive') {
        try {
          await authService.signOut()
        } finally {
          clearAuth()
          accountInactive.value = true
        }
        return
      }

      userRole.value = profile?.role ?? null
    } catch (err) {
      console.error('Failed to fetch user role:', err)
      clearAuth()
    } finally {
      isLoading.value = false
    }
  }

  function clearAuth() {
    userRole.value = null
    isAuthenticated.value = false
    isLoading.value = false
  }

  /** Returns whether an inactive-account notice is pending, and clears it. */
  function consumeInactiveNotice(): boolean {
    const pending = accountInactive.value
    accountInactive.value = false
    return pending
  }

  const isAdmin = computed(() => userRole.value === 'admin')
  const isSupervisor = computed(() => userRole.value === 'supervisor')
  const isBeneficiary = computed(() => userRole.value === 'beneficiary')
  /** An office's PACD computer: only the office kiosk page */
  const isKiosk = computed(() => userRole.value === 'kiosk')

  return {
    userRole,
    isLoading,
    isAuthenticated,
    fetchUserRole,
    clearAuth,
    accountInactive,
    consumeInactiveNotice,
    isAdmin,
    isSupervisor,
    isBeneficiary,
    isKiosk,
  }
})

/**
 * Returns the dashboard route name for a given role.
 * Used by the router guard and login page to redirect users to their role-specific dashboard.
 */
export function getDashboardByRole(role: ProfileRole | null): string {
  switch (role) {
    case 'admin':
      return 'dashboard'
    case 'supervisor':
      return 'supervisor-dashboard'
    case 'beneficiary':
      return 'beneficiary-dashboard'
    case 'kiosk':
      return 'office-kiosk'
    default:
      return 'login'
  }
}
