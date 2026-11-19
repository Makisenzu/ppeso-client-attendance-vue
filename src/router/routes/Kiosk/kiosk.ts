import type { RouteRecordRaw } from 'vue-router'

import KioskLayout from '@/layouts/KioskLayout.vue'

/**
 * Office kiosk: an office's PACD computer, signed in with that office's kiosk account (role `kiosk`).
 * Its only page is the attendance kiosk; core.record_punch() accepts only people from the kiosk's office.
 */
export const kioskRoutes: RouteRecordRaw[] = [
  {
    path: '/office-kiosk',
    component: KioskLayout,
    meta: { requiresAuth: true, allowedRoles: ['kiosk'] },
    children: [
      {
        path: '',
        name: 'office-kiosk',
        component: () => import('@/components/peso/UserKiosk/AttendanceKiosk.vue'),
        meta: { title: 'Attendance Kiosk' },
      },
    ],
  },
  // Any other URL a kiosk opens goes back to its page (the guard sends other roles to their own dashboard)
  {
    path: '/office-kiosk/:pathMatch(.*)*',
    redirect: { name: 'office-kiosk' },
  },
]
