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
      {
        path: 'attendance',
        name: 'supervisor-attendance',
        component: () => import('@/components/supervisor/TeamAttendance/TeamAttendance.vue'),
        meta: { title: 'Team Attendance' },
      },
      {
        path: 'accomplishments',
        name: 'supervisor-accomplishments',
        component: () => import('@/components/supervisor/TeamAccomplishments/TeamAccomplishments.vue'),
        meta: { title: 'Accomplishment Reports' },
      },
      {
        // One GIP's reports (View on the list); RLS limits it to people in the supervisor's office
        path: 'accomplishments/:profileId',
        name: 'supervisor-accomplishment-member',
        component: () => import('@/components/common/Accomplishments/AccomplishmentReviews.vue'),
        props: true,
        meta: { title: 'Accomplishment Reports' },
      },
      {
        // Monthly evaluation of the active GIPs in the supervisor's office (RLS: own office only)
        path: 'evaluation',
        name: 'supervisor-evaluation',
        component: () => import('@/components/supervisor/TeamEvaluations/TeamEvaluations.vue'),
        meta: { title: 'Evaluation' },
      },
      {
        // One GIP's evaluation for this month (Evaluate / Continue / View on the list)
        path: 'evaluation/:profileId',
        name: 'supervisor-evaluation-form',
        component: () => import('@/components/supervisor/TeamEvaluations/TeamEvaluationForm.vue'),
        props: true,
        meta: { title: 'Evaluation' },
      },
      {
        path: 'account',
        name: 'supervisor-account',
        component: () => import('@/components/common/Account/AccountPage.vue'),
        meta: { title: 'Account' },
      },
    ],
  },
]
