import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Book, Building2, CalendarDays, ClipboardCheck, ClipboardList, Clock, FingerprintPattern, Users } from '@lucide/vue'
import { useSidebarUser } from '@/composables/common/useSidebarUser'
import type { SidebarNavItem } from '@/composables/supervisor/useSupervisorSidebar'

export interface SidebarNavGroup {
  label: string
  items: SidebarNavItem[]
}

/** Admin sidebar: the signed-in user's card plus the admin pages (see router/routes/Peso/peso.ts). */
export function usePesoSidebar() {
  const route = useRoute()
  const sidebarUser = useSidebarUser()

  /** The admin pages, grouped into labelled sidebar sections. */
  const navGroups: SidebarNavGroup[] = [
    {
      label: 'Operations',
      items: [
        { title: 'Attendance', to: { name: 'kiosk' }, icon: FingerprintPattern },
        { title: 'Daily Time Record', to: { name: 'attendance' }, icon: Clock },
        { title: 'Client Records', to: { name: 'records' }, icon: Book },
      ],
    },
    {
      label: 'Document',
      items: [
        { title: 'Accomplishments', to: { name: 'accomplishments' }, icon: ClipboardList },
        { title: 'Evaluations', to: { name: 'evaluations' }, icon: ClipboardCheck },
      ],
    },
    {
      label: 'Administration',
      items: [
        { title: 'Offices', to: { name: 'offices' }, icon: Building2 },
        { title: 'User Management', to: { name: 'management' }, icon: Users },
        { title: 'Calendar', to: { name: 'calendar' }, icon: CalendarDays },
      ],
    },
  ]

  const isDashboard = computed(() => route.name === 'dashboard')

  return {
    ...sidebarUser,
    navGroups,
    isDashboard,
    accountRoute: { name: 'account' },
  }
}
