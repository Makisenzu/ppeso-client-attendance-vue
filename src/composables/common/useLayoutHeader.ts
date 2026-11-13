import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useColorMode } from '@vueuse/core'

/** Light / dark theme toggle shared by every layout header. */
export function useThemeToggle() {
  const mode = useColorMode()
  const isDark = computed(() => mode.value === 'dark')

  const toggleTheme = () => {
    mode.value = isDark.value ? 'light' : 'dark'
  }

  return { mode, isDark, toggleTheme }
}

/**
 * Auth layout (login / signup): theme toggle, unless the page sets `meta.forceDark`,
 * in which case the page is always dark and the toggle is hidden.
 */
export function useAuthLayout() {
  const route = useRoute()
  const theme = useThemeToggle()
  const isForcedDark = computed(() => route.meta.forceDark === true)

  return { ...theme, isForcedDark }
}

export interface LayoutHeaderOptions {
  /** Route name to label when the route has none. */
  fallbackRouteName: string
  /** Prefix dropped from route names before labelling (e.g. 'supervisor-'). */
  stripPrefix?: string
}

/**
 * Header state for a role layout: the theme toggle and the page label, taken from
 * `meta.title` or else the title-cased route name.
 */
export function useLayoutHeader(options: LayoutHeaderOptions) {
  const route = useRoute()
  const theme = useThemeToggle()

  const currentLabel = computed(() => {
    if (route.meta.title) return route.meta.title
    let name = String(route.name || options.fallbackRouteName)
    if (options.stripPrefix) name = name.replace(options.stripPrefix, '')
    return name
      .split('-')
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' ')
  })

  return { ...theme, currentLabel }
}
