import { createRouter, createWebHistory } from 'vue-router'
import type { NavigationGuardNext, RouteLocationNormalized, RouteRecordNormalized, RouteRecordRaw } from 'vue-router'

import { supabase } from '@/services/supabase'
import { useAuthStore, getDashboardByRole } from '@/stores/authStore'
import { loginRoutes } from './routes/Login'
import { pesoRoutes } from './routes/Peso/peso'
import { supervisorRoutes } from './routes/Supervisor/supervisor'
import { beneficiaryRoutes } from './routes/Beneficiary/beneficiary'

const routes: RouteRecordRaw[] = [
  ...loginRoutes,
  ...pesoRoutes,
  ...supervisorRoutes,
  ...beneficiaryRoutes,
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// Navigation guard to protect routes
router.beforeEach(async (to: RouteLocationNormalized, _from: RouteLocationNormalized, next: NavigationGuardNext) => {
  const requiresAuth = to.matched.some((record: RouteRecordNormalized) => record.meta.requiresAuth)
  const { data: { session } } = await supabase.auth.getSession()

  // Not authenticated — redirect to login
  if (requiresAuth && !session) {
    next({ name: 'login' })
    return
  }

  // Authenticated — ensure role is loaded
  if (session) {
    const authStore = useAuthStore()

    if (!authStore.userRole && !authStore.isLoading) {
      await authStore.fetchUserRole()
    }

    // Redirect away from login/signup to the correct dashboard
    if (to.name === 'login' || to.name === 'signup') {
      next({ name: getDashboardByRole(authStore.userRole) })
      return
    }

    // Enforce role-based access on routes with allowedRoles meta
    const allowedRoles = to.matched.reduce<string[]>((roles, record) => {
      if (record.meta.allowedRoles) {
        return roles.concat(record.meta.allowedRoles)
      }
      return roles
    }, [])

    if (allowedRoles.length > 0 && !allowedRoles.includes(authStore.userRole as string)) {
      next({ name: getDashboardByRole(authStore.userRole) })
      return
    }
  }

  next()
})

export default router

