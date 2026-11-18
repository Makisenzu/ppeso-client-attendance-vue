import { computed, type Component } from 'vue'
import { useRoute } from 'vue-router'
import { FingerprintPattern, Clock } from '@lucide/vue'
import { useSidebarUser } from '@/composables/common/useSidebarUser'

export interface SidebarNavItem {
  title: string
  to: { name: string }
  icon: Component
}

export function useBeneficiarySidebar() {
  const route = useRoute()
  const sidebarUser = useSidebarUser()

  const myRecordsItems: SidebarNavItem[] = [
    { title: 'My Attendance', to: { name: 'beneficiary-attendance' }, icon: FingerprintPattern },
    { title: 'My DTR', to: { name: 'beneficiary-dashboard' }, icon: Clock },
  ]

  const isDashboard = computed(() => route.name === 'beneficiary-dashboard')

  /** Highlights a "My Records" item; items still pointing at the dashboard never light up. */
  const isNavItemActive = (item: SidebarNavItem) =>
    item.to.name !== 'beneficiary-dashboard' && route.name === item.to.name

  return {
    ...sidebarUser,
    myRecordsItems,
    isDashboard,
    isNavItemActive,
    accountRoute: { name: 'beneficiary-account' },
  }
}
