import type { RouteRecordRaw } from 'vue-router'

import PesoLayout from '@/layouts/PesoLayout.vue'

/**
 * Admin area. Admins can open only these pages — the ones in PesoSidebar
 * (Dashboard, Attendance/kiosk, Daily Time Record, Client Records, Offices,
 * User Management) plus Generate DTR. Unknown /dashboard URLs go to the dashboard.
 */
export const pesoRoutes: RouteRecordRaw[] = [
  {
    path: '/dashboard',
    component: PesoLayout,
    meta: { requiresAuth: true, allowedRoles: ['admin'] },
    children: [
      {
        path: '',
        name: 'dashboard',
        component: () => import('@/components/peso/Dashboard/PesoDashboard.vue'),
      },
      {
        path: 'kiosk',
        name: 'kiosk',
        component: () => import('@/components/peso/UserKiosk/AttendanceKiosk.vue'),
      },
      {
        path: 'attendance',
        name: 'attendance',
        component: () => import('@/components/peso/attendance/Attendance.vue'),
      },
      {
        path: 'attendance/dtr',
        name: 'attendance-dtr',
        component: () => import('@/components/peso/attendance/DtrGenerator.vue'),
        meta: { title: 'Generate DTR' },
      },
      {
        path: 'records',
        name: 'records',
        component: () => import('@/components/peso/ClientRecords/ClientRecords.vue'),
      },
      {
        path: 'offices',
        name: 'offices',
        component: () => import('@/components/peso/Offices/Office.vue'),
      },
      {
        path: 'management',
        name: 'management',
        component: () => import('@/components/peso/UserManagement/UserManagement.vue'),
      },
      {
        path: ':pathMatch(.*)*',
        redirect: { name: 'dashboard' },
      },
    ],
  },
  {
    path: '/kiosk',
    redirect: '/dashboard/kiosk',
  },
]
