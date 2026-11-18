import { computed, type Component } from 'vue'
import { useRoute } from 'vue-router'
import { FingerprintPattern, Clock, ClipboardList } from '@lucide/vue'
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
    { title: 'My DTR', to: { name: 'beneficiary-dtr' }, icon: Clock },
    { title: 'Accomplishments', to: { name: 'beneficiary-accomplishments' }, icon: ClipboardList },
  ]

  const isDashboard = computed(() => route.name === 'beneficiary-dashboard')

  /** Highlights a "My Records" item; items still pointing at the dashboard never light up. */
  const isNavItemActive = (item: SidebarNavItem) =>
    item.to.name !== 'beneficiary-dashboard' &&
    (route.name === item.to.name ||
      (item.to.name === 'beneficiary-accomplishments' && String(route.name ?? '').startsWith('beneficiary-accomplishment')))

  return {
    ...sidebarUser,
    myRecordsItems,
    isDashboard,
    isNavItemActive,
    accountRoute: { name: 'beneficiary-account' },
  }
}
