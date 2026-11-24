import type { RouteRecordRaw } from 'vue-router'

import AuthLayout from '@/layouts/auth/AuthLayout.vue'
import LoginView from '@/pages/Login.vue'

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
    ],
  },
  // No public signup: accounts are created by admins. Unknown paths (e.g. /signup) go to /login,
  // which sends a signed-in user on to their dashboard.
  {
    path: '/:pathMatch(.*)*',
    redirect: '/login',
  },
]