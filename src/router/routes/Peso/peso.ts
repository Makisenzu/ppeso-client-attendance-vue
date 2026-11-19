import type { RouteRecordRaw } from 'vue-router'

import PesoLayout from '@/layouts/PesoLayout.vue'

/**
 * Admin area. Admins can open only these pages — the ones in PesoSidebar
 * (Dashboard, Attendance/kiosk, Daily Time Record, Accomplishments, Evaluations, Files, Client Records, Offices,
 * User Management, Calendar) plus Generate DTR, Office Details and Account. Unknown /dashboard URLs go to the dashboard.
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
        path: 'accomplishments',
        name: 'accomplishments',
        component: () => import('@/components/common/Accomplishments/AccomplishmentReviews.vue'),
        meta: { title: 'Accomplishment Reports' },
      },
      {
        // Evaluation questions (CRUD) and submitted GIP evaluations
        path: 'evaluations',
        name: 'evaluations',
        component: () => import('@/components/peso/Evaluations/Evaluations.vue'),
        meta: { title: 'Evaluations' },
      },
      {
        // PACD file container: printable forms, templates and guidelines (admins only)
        path: 'files',
        name: 'files',
        component: () => import('@/components/peso/Files/PacdFiles.vue'),
        meta: { title: 'Files' },
      },
      {
        // PACD: sign-in accounts for each office's PACD computer (office kiosks)
        path: 'office-kiosks',
        name: 'office-kiosks',
        component: () => import('@/components/peso/OfficeKiosks/OfficeKiosks.vue'),
        meta: { title: 'Office Kiosks' },
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
        path: 'offices/:id',
        name: 'office-details',
        component: () => import('@/components/peso/Offices/OfficeDetails.vue'),
        meta: { title: 'Office Details' },
      },
      {
        path: 'calendar',
        name: 'calendar',
        component: () => import('@/components/peso/Calendar/HolidayCalendar.vue'),
        meta: { title: 'Calendar' },
      },
      {
        path: 'management',
        name: 'management',
        component: () => import('@/components/peso/UserManagement/UserManagement.vue'),
      },
      {
        path: 'account',
        name: 'account',
        component: () => import('@/components/common/Account/AccountPage.vue'),
        meta: { title: 'Account' },
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
