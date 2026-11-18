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
    { title: 'Accomplishments', to: { name: 'supervisor-accomplishments' }, icon: ClipboardList },
  ]

  const isDashboard = computed(() => route.name === 'supervisor-dashboard')

  /** Highlights the current Operations item. */
  const isNavItemActive = (item: SidebarNavItem) => route.name === item.to.name

  return {
    ...sidebarUser,
    operationsItems,
    isDashboard,
    isNavItemActive,
    accountRoute: { name: 'supervisor-account' },
  }
}
