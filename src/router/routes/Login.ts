import type { RouteRecordRaw } from 'vue-router'

import AuthLayout from '@/layouts/auth/AuthLayout.vue'
import LoginView from '@/pages/Login.vue'
import WalkInView from '@/pages/WalkIn.vue'

export const loginRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    component: AuthLayout,
    children: [
      {
        path: '',
        redirect: '/login',
      },
      {
        path: 'login',
        name: 'login',
        component: LoginView,
        // Dark only, so the card reads over the darkened background photo.
        meta: { forceDark: true },
      },
      {
        // Public walk-in client form: no auth, open to signed-in users too. Submit only
        // (insert-only RPC public.submit_walk_in — SECURITY.md §4.2 exception).
        path: 'walk-in',
        name: 'walk-in',
        component: WalkInView,
        // Dark only, like login, so the card reads over the background photo.
        meta: { title: 'Walk-in Client Form', forceDark: true },
      },
    ],
  },
  // No public signup: accounts are created by admins. Unknown paths (e.g. /signup) go to /login,
  // which sends a signed-in user on to their dashboard.
  {
    path: '/:pathMatch(.*)*',
    redirect: '/login',
  },
]