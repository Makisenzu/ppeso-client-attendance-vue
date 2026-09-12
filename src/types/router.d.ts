import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    allowedRoles?: Array<'admin' | 'supervisor' | 'beneficiary'>
  }
}
