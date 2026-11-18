import type { RouteRecordRaw } from 'vue-router'

import BeneficiaryLayout from '@/layouts/BeneficiaryLayout.vue'

export const beneficiaryRoutes: RouteRecordRaw[] = [
  {
    path: '/beneficiary',
    component: BeneficiaryLayout,
    meta: { requiresAuth: true, allowedRoles: ['beneficiary'] },
    children: [
      {
        path: '',
        name: 'beneficiary-dashboard',
        component: () => import('@/components/beneficiary/Dashboard/BeneficiaryDashboard.vue'),
      },
      {
        path: 'attendance',
        name: 'beneficiary-attendance',
        component: () => import('@/components/beneficiary/MyAttendance/MyAttendance.vue'),
        meta: { title: 'My Attendance' },
      },
      {
        path: 'dtr',
        name: 'beneficiary-dtr',
        component: () => import('@/components/beneficiary/MyDtr/MyDtr.vue'),
        meta: { title: 'My DTR' },
      },
      {
        path: 'account',
        name: 'beneficiary-account',
        component: () => import('@/components/common/Account/AccountPage.vue'),
        meta: { title: 'Account' },
      },
    ],
  },
]
