import type { RouteRecordRaw } from 'vue-router'

import PesoLayout from '@/layouts/PesoLayout.vue'

export const pesoRoutes: RouteRecordRaw[] = [
  {
    path: '/dashboard',
    component: PesoLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'dashboard',
        component: () => import('@/components/peso/PesoDashboard.vue'),
      },
      {
        path: 'employees',
        name: 'employees',
        component: () => import('@/components/peso/PesoDashboard.vue'),
      },
      {
        path: 'attendance',
        name: 'attendance',
        component: () => import('@/components/peso/PesoDashboard.vue'),
      },
      {
        path: 'services',
        name: 'services',
        component: () => import('@/components/peso/PesoDashboard.vue'),
      },
      {
        path: 'reports',
        name: 'reports',
        component: () => import('@/components/peso/PesoDashboard.vue'),
      },
      {
        path: 'payroll',
        name: 'payroll',
        component: () => import('@/components/peso/PesoDashboard.vue'),
      },
      {
        path: 'requests',
        name: 'requests',
        component: () => import('@/components/peso/PesoDashboard.vue'),
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('@/components/peso/PesoDashboard.vue'),
      },
    ],
  },
]