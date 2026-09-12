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
    ],
  },
]
