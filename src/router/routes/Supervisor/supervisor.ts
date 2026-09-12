import type { RouteRecordRaw } from 'vue-router'

import SupervisorLayout from '@/layouts/SupervisorLayout.vue'

export const supervisorRoutes: RouteRecordRaw[] = [
  {
    path: '/supervisor',
    component: SupervisorLayout,
    meta: { requiresAuth: true, allowedRoles: ['supervisor'] },
    children: [
      {
        path: '',
        name: 'supervisor-dashboard',
        component: () => import('@/components/supervisor/Dashboard/SupervisorDashboard.vue'),
      },
    ],
  },
]
