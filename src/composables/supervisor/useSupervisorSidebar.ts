import { computed, type Component } from 'vue'
import { useRoute } from 'vue-router'
import { ClipboardList, FingerprintPattern } from '@lucide/vue'
import { useSidebarUser } from '@/composables/common/useSidebarUser'

export interface SidebarNavItem {
  title: string
  to: { name: string }
  icon: Component
}

export function useSupervisorSidebar() {
  const route = useRoute()
  const sidebarUser = useSidebarUser()

  const operationsItems: SidebarNavItem[] = [
    { title: 'Team Attendance', to: { name: 'supervisor-attendance' }, icon: FingerprintPattern },
    { title: 'Accom. Reports', to: { name: 'supervisor-accomplishments' }, icon: ClipboardList },
  ]

  const isDashboard = computed(() => route.name === 'supervisor-dashboard')

  /** Highlights the current Operations item (a GIP's reports count as Accomplishments). */
  const isNavItemActive = (item: SidebarNavItem) =>
    route.name === item.to.name ||
    (item.to.name === 'supervisor-accomplishments' && route.name === 'supervisor-accomplishment-member')

  return {
    ...sidebarUser,
    operationsItems,
    isDashboard,
    isNavItemActive,
    accountRoute: { name: 'supervisor-account' },
  }
}
