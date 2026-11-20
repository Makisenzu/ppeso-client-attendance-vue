import { computed, type Component } from 'vue'
import { useRoute } from 'vue-router'
import { ClipboardCheck, ClipboardList, FingerprintPattern } from '@lucide/vue'
import { useSidebarUser } from '@/composables/common/useSidebarUser'
import { useCloseSidebarOnNavigate } from '@/composables/common/useCloseSidebarOnNavigate'

export interface SidebarNavItem {
  title: string
  to: { name: string }
  icon: Component
}

export function useSupervisorSidebar() {
  const route = useRoute()
  const sidebarUser = useSidebarUser()
  useCloseSidebarOnNavigate()

  const operationsItems: SidebarNavItem[] = [
    { title: 'Team Attendance', to: { name: 'supervisor-attendance' }, icon: FingerprintPattern },
    { title: 'Accom. Reports', to: { name: 'supervisor-accomplishments' }, icon: ClipboardList },
    { title: 'Evaluation', to: { name: 'supervisor-evaluation' }, icon: ClipboardCheck },
  ]

  const isDashboard = computed(() => route.name === 'supervisor-dashboard')

  /** Highlights the current Operations item (a GIP's reports / evaluation count as their list). */
  const isNavItemActive = (item: SidebarNavItem) =>
    route.name === item.to.name ||
    (item.to.name === 'supervisor-accomplishments' && route.name === 'supervisor-accomplishment-member') ||
    (item.to.name === 'supervisor-evaluation' && route.name === 'supervisor-evaluation-form')

  return {
    ...sidebarUser,
    operationsItems,
    isDashboard,
    isNavItemActive,
    accountRoute: { name: 'supervisor-account' },
  }
}
