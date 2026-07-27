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
