import { onScopeDispose } from 'vue'
import { useRouter } from 'vue-router'
import { useSidebar } from '@/components/ui/sidebar'

/**
 * Closes the mobile sidebar sheet after any navigation from it. Uses `afterEach` because it also runs when the
 * user taps the link of the page they are already on (a duplicated navigation), which a route watcher would miss.
 * Must be called inside a `SidebarProvider` (i.e. from a sidebar component's composable).
 */
export function useCloseSidebarOnNavigate() {
  const router = useRouter()
  const { isMobile, setOpenMobile } = useSidebar()

  const removeHook = router.afterEach(() => {
    if (isMobile.value) setOpenMobile(false)
  })

  onScopeDispose(removeHook)
}
