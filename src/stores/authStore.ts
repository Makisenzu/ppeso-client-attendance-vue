import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/services/supabase'
import type { Database } from '@/types/database.types'

type ProfileRole = Database['public']['Enums']['profile_roles']

export const useAuthStore = defineStore('auth', () => {
  const userRole = ref<ProfileRole | null>(null)
  const isLoading = ref(false)
  const isAuthenticated = ref(false)

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
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle()

      if (profileError) {
        console.warn('Error fetching user role:', profileError.message)
        userRole.value = null
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

  const isAdmin = computed(() => userRole.value === 'admin')
  const isSupervisor = computed(() => userRole.value === 'supervisor')
  const isBeneficiary = computed(() => userRole.value === 'beneficiary')

  return {
    userRole,
    isLoading,
    isAuthenticated,
    fetchUserRole,
    clearAuth,
    isAdmin,
    isSupervisor,
    isBeneficiary,
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
    default:
      return 'login'
  }
}
