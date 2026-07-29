import {
  createRouter,
  createWebHistory,
  type Router,
  type RouterHistory,
  type RouteRecordRaw,
} from 'vue-router'
import { ROUTE_NAMES, ROUTE_PATHS } from '@/constants/routes'

const routes: readonly RouteRecordRaw[] = [
  {
    path: ROUTE_PATHS.foundation,
    name: ROUTE_NAMES.foundation,
    component: () => import('@/pages/foundation/FoundationPage.vue'),
    meta: { layout: 'foundation' },
  },
  {
    path: ROUTE_PATHS.forbidden,
    name: ROUTE_NAMES.forbidden,
    component: () => import('@/pages/foundation/ForbiddenPage.vue'),
    meta: { layout: 'foundation' },
  },
  {
    path: '/admin-shell',
    name: 'admin-shell',
    component: () => import('@/pages/foundation/AdminShellPage.vue'),
    meta: { layout: 'admin' },
  },
  {
    path: '/customer-shell',
    name: 'customer-shell',
    component: () => import('@/pages/foundation/CustomerShellPage.vue'),
    meta: { layout: 'customer' },
  },
  {
    path: '/home',
    name: 'customer-home',
    component: () => import('@/pages/customer/HomePage.vue'),
    meta: { layout: 'customer' },
  },
  {
    path: ROUTE_PATHS.skinCare,
    name: ROUTE_NAMES.skinCare,
    component: () => import('@/pages/clinic/SkinCarePage.vue'),
    meta: { layout: 'customer' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: ROUTE_NAMES.notFound,
    component: () => import('@/pages/foundation/NotFoundPage.vue'),
    meta: { layout: 'foundation' },
  },
]

export function createAppRouter(history: RouterHistory = createWebHistory()): Router {
  return createRouter({
    history,
    routes,
    scrollBehavior: () => ({ top: 0 }),
  })
}

export const router = createAppRouter()
