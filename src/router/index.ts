import {
  createRouter,
  createWebHistory,
  type Router,
  type RouterHistory,
  type RouteRecordRaw,
} from 'vue-router'
import { ROUTE_NAMES, ROUTE_PATHS } from '@/constants/routes'
import { canAccessResetCode, canAccessResetPassword } from '@/composables/auth/usePasswordRecovery'
import { useAuthStore } from '@/stores/auth'
import { pinia } from '@/stores/pinia'
import { isMobileOnboardingViewport } from '@/utils/auth/mobileOnboarding'

const routes: readonly RouteRecordRaw[] = [
  {
    path: ROUTE_PATHS.onboarding,
    name: ROUTE_NAMES.onboarding,
    component: () => import('@/pages/auth/OnboardingPage.vue'),
    meta: { layout: 'auth', guestOnly: true },
  },
  {
    path: ROUTE_PATHS.login,
    name: ROUTE_NAMES.login,
    component: () => import('@/pages/auth/LoginPage.vue'),
    meta: { layout: 'auth', guestOnly: true },
  },
  {
    path: ROUTE_PATHS.register,
    name: ROUTE_NAMES.register,
    component: () => import('@/pages/auth/RegisterPage.vue'),
    meta: { layout: 'auth', guestOnly: true },
  },
  {
    path: ROUTE_PATHS.forgotPassword,
    name: ROUTE_NAMES.forgotPassword,
    component: () => import('@/pages/auth/ForgotPasswordPage.vue'),
    meta: { layout: 'auth', guestOnly: true },
  },
  {
    path: ROUTE_PATHS.verifyResetCode,
    name: ROUTE_NAMES.verifyResetCode,
    component: () => import('@/pages/auth/VerifyResetCodePage.vue'),
    meta: { layout: 'auth', guestOnly: true },
  },
  {
    path: ROUTE_PATHS.resetPassword,
    name: ROUTE_NAMES.resetPassword,
    component: () => import('@/pages/auth/ResetPasswordPage.vue'),
    meta: { layout: 'auth', guestOnly: true },
  },
  {
    path: ROUTE_PATHS.googleCallback,
    name: ROUTE_NAMES.googleCallback,
    component: () => import('@/pages/auth/GoogleOAuthCallbackPage.vue'),
    meta: { layout: 'auth' },
  },
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
    path: ROUTE_PATHS.products,
    name: ROUTE_NAMES.products,
    component: () => import('@/pages/customer/ProductListingPage.vue'),
    meta: { layout: 'customer' },
  },
  {
    path: ROUTE_PATHS.productDetail,
    name: ROUTE_NAMES.productDetail,
    component: () => import('@/pages/customer/ProductDetailPage.vue'),
    meta: { layout: 'customer' },
  },
  {
    path: ROUTE_PATHS.favorites,
    name: ROUTE_NAMES.favorites,
    component: () => import('@/pages/customer/FavoritesPage.vue'),
    meta: { layout: 'customer', requiresAuth: true },
  },
  {
    path: ROUTE_PATHS.cart,
    name: ROUTE_NAMES.cart,
    component: () => import('@/pages/customer/CartPage.vue'),
    meta: { layout: 'customer' },
  },
  {
    path: ROUTE_PATHS.checkout,
    name: ROUTE_NAMES.checkout,
    component: () => import('@/pages/customer/CheckoutPage.vue'),
    meta: { layout: 'customer', requiresAuth: true },
  },
  {
    path: '/payment/vnpay/return',
    name: 'vnpay-return',
    component: () => import('@/pages/customer/VnPayReturnPage.vue'),
    meta: { layout: 'customer', requiresAuth: true },
  },
  {
    path: ROUTE_PATHS.skinCare,
    name: ROUTE_NAMES.skinCare,
    component: () => import('@/pages/clinic/SkinCarePage.vue'),
    meta: { layout: 'customer' },
  },
  {
    path: ROUTE_PATHS.voucherCenter,
    name: ROUTE_NAMES.voucherCenter,
    component: () => import('@/pages/customer/VoucherCenterPage.vue'),
    meta: { layout: 'customer' },
  },
  {
    path: ROUTE_PATHS.wallet,
    name: ROUTE_NAMES.wallet,
    component: () => import('@/pages/customer/WalletPage.vue'),
    meta: { layout: 'customer', requiresAuth: true },
  },
  {
    path: '/:pathMatch(.*)*',
    name: ROUTE_NAMES.notFound,
    component: () => import('@/pages/foundation/NotFoundPage.vue'),
    meta: { layout: 'foundation' },
  },
]

export function createAppRouter(history: RouterHistory = createWebHistory()): Router {
  const appRouter = createRouter({
    history,
    routes,
    scrollBehavior: () => ({ top: 0 }),
  })

  appRouter.beforeEach(async (to) => {
    const authStore = useAuthStore(pinia)

    if ((to.meta.guestOnly || to.meta.requiresAuth) && !authStore.isInitialized) {
      await authStore.restoreSession()
    }

    if (to.meta.guestOnly && authStore.isAuthenticated) {
      return { name: 'customer-home' }
    }

    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
      return {
        name: ROUTE_NAMES.login,
        query: { redirect: to.fullPath },
      }
    }

    if (to.name === ROUTE_NAMES.verifyResetCode && !canAccessResetCode()) {
      return { name: ROUTE_NAMES.forgotPassword }
    }

    if (to.name === ROUTE_NAMES.resetPassword && !canAccessResetPassword()) {
      return { name: ROUTE_NAMES.forgotPassword }
    }

    if (
      to.name === ROUTE_NAMES.login &&
      typeof to.query.oauth_error !== 'string' &&
      isMobileOnboardingViewport() &&
      window.localStorage.getItem('mizuki:onboarding-seen') !== 'true'
    ) {
      return { name: ROUTE_NAMES.onboarding }
    }

    if (
      to.name === ROUTE_NAMES.onboarding &&
      !isMobileOnboardingViewport()
    ) {
      return { name: ROUTE_NAMES.login }
    }
  })

  return appRouter
}

export const router = createAppRouter()
