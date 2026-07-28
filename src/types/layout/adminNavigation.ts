import type { Component } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import {
  Boxes,
  LayoutDashboard,
  Package,
  RotateCcw,
  Settings,
  ShoppingBag,
  Users,
} from '@lucide/vue'

export type AdminNavigationKey =
  | 'overview'
  | 'orders'
  | 'refunds'
  | 'products'
  | 'inventory'
  | 'staff'
  | 'settings'

export interface AdminNavigationItem {
  key: AdminNavigationKey
  label: string
  icon: Component
  to: RouteLocationRaw
  primary: boolean
}

function createDemoRoute(key: AdminNavigationKey): RouteLocationRaw {
  return key === 'overview'
    ? { path: '/admin-shell' }
    : { path: '/admin-shell', query: { section: key } }
}

export const ADMIN_NAVIGATION_ITEMS: readonly AdminNavigationItem[] = [
  { key: 'overview', label: 'Tổng quan', icon: LayoutDashboard, to: createDemoRoute('overview'), primary: true },
  { key: 'orders', label: 'Đơn hàng', icon: ShoppingBag, to: createDemoRoute('orders'), primary: true },
  { key: 'refunds', label: 'Hoàn tiền', icon: RotateCcw, to: createDemoRoute('refunds'), primary: false },
  { key: 'products', label: 'Sản phẩm', icon: Package, to: createDemoRoute('products'), primary: true },
  { key: 'inventory', label: 'Tồn kho', icon: Boxes, to: createDemoRoute('inventory'), primary: true },
  { key: 'staff', label: 'Nhân viên', icon: Users, to: createDemoRoute('staff'), primary: false },
  { key: 'settings', label: 'Cài đặt', icon: Settings, to: createDemoRoute('settings'), primary: false },
]

export const ADMIN_PRIMARY_NAVIGATION = ADMIN_NAVIGATION_ITEMS.filter((item) => item.primary)
export const ADMIN_SECONDARY_NAVIGATION = ADMIN_NAVIGATION_ITEMS.filter((item) => !item.primary)

export function isAdminNavigationKey(value: unknown): value is AdminNavigationKey {
  return typeof value === 'string' && ADMIN_NAVIGATION_ITEMS.some((item) => item.key === value)
}
