import { createRouter, createWebHistory } from 'vue-router'
import type { NavigationGuardNext, RouteLocationNormalized, RouteRecordNormalized, RouteRecordRaw } from 'vue-router'

import { supabase } from '@/services/supabase'
import { loginRoutes } from './routes/Login'
import { pesoRoutes } from './routes/Peso/peso'

const routes: RouteRecordRaw[] = [
  ...loginRoutes,
  ...pesoRoutes,
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// Navigation guard to protect routes
router.beforeEach(async (to: RouteLocationNormalized, _from: RouteLocationNormalized, next: NavigationGuardNext) => {
  const requiresAuth = to.matched.some((record: RouteRecordNormalized) => record.meta.requiresAuth)
  const { data: { session } } = await supabase.auth.getSession()

  if (requiresAuth && !session) {
    next({ name: 'login' })
    return
  }

  if ((to.name === 'login' || to.name === 'signup') && session) {
    next({ name: 'dashboard' })
    return
  }

  next()
})

export default router
