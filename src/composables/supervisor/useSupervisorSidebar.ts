import { computed, type Component } from 'vue'
import { useRoute } from 'vue-router'
import { Clock, Book } from '@lucide/vue'
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
    { title: 'Daily Time Record', to: { name: 'supervisor-dashboard' }, icon: Clock },
    { title: 'Client Records', to: { name: 'supervisor-dashboard' }, icon: Book },
  ]

  const isDashboard = computed(() => route.name === 'supervisor-dashboard')

  return {
    ...sidebarUser,
    operationsItems,
    isDashboard,
  }
}
