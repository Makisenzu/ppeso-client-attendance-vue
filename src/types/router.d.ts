import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    allowedRoles?: Array<'admin' | 'supervisor' | 'beneficiary'>
    /** Header label; defaults to the title-cased route name. */
    title?: string
    /** Render this page in dark mode regardless of the user's theme (and hide the toggle). */
    forceDark?: boolean
  }
}
