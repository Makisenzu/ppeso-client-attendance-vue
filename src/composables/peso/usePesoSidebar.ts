import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Book, Building2, CalendarDays, ClipboardList, Clock, FingerprintPattern, Users } from '@lucide/vue'
import { useSidebarUser } from '@/composables/common/useSidebarUser'
import type { SidebarNavItem } from '@/composables/supervisor/useSupervisorSidebar'

/** Admin sidebar: the signed-in user's card plus the admin pages (see router/routes/Peso/peso.ts). */
export function usePesoSidebar() {
  const route = useRoute()
  const sidebarUser = useSidebarUser()

  const operationsItems: SidebarNavItem[] = [
    { title: 'Attendance', to: { name: 'kiosk' }, icon: FingerprintPattern },
    { title: 'Daily Time Record', to: { name: 'attendance' }, icon: Clock },
    { title: 'Accomplishments', to: { name: 'accomplishments' }, icon: ClipboardList },
    { title: 'Client Records', to: { name: 'records' }, icon: Book },
    { title: 'Offices', to: { name: 'offices' }, icon: Building2 },
    { title: 'User Management', to: { name: 'management' }, icon: Users },
    { title: 'Calendar', to: { name: 'calendar' }, icon: CalendarDays },
  ]

  const isDashboard = computed(() => route.name === 'dashboard')

  return {
    ...sidebarUser,
    operationsItems,
    isDashboard,
    accountRoute: { name: 'account' },
  }
}
