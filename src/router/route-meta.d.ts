import 'vue-router'
import type { AppRole } from '@/types/auth'

export type RouteLayout = 'foundation' | 'auth' | 'customer' | 'admin' | 'pos'

declare module 'vue-router' {
  interface RouteMeta {
    readonly requiresAuth?: boolean
    readonly guestOnly?: boolean
    readonly roles?: readonly AppRole[]
    readonly layout?: RouteLayout
  }
}
