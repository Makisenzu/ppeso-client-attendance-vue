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
        component: () => import('@/components/peso/Dashboard/PesoDashboard.vue'),
      },
      {
        path: 'employees',
        name: 'employees',
        component: () => import('@/components/peso/Dashboard/PesoDashboard.vue'),
      },
      {
        path: 'attendance',
        name: 'attendance',
        component: () => import('@/components/peso/Dashboard/PesoDashboard.vue'),
      },
      {
        path: 'management',
        name: 'management',
        component: () => import('@/components/peso/UserManagement/UserManagement.vue'),
      },
      {
        path: 'records',
        name: 'records',
        component: () => import('@/components/peso/ClientRecords/ClientRecords.vue'),
      },
      {
        path: 'payroll',
        name: 'payroll',
        component: () => import('@/components/peso/Dashboard/PesoDashboard.vue'),
      },
      {
        path: 'notification',
        name: 'notification',
        component: () => import('@/components/peso/Notification/Notification.vue'),
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('@/components/peso/Dashboard/PesoDashboard.vue'),
      },
    ],
  },
]