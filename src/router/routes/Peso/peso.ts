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
        component: () => import('@/components/peso/attendance/Attendance.vue'),
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