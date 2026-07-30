import { productListingProducts } from '@/data/products/productListingDemoData'
import type { CartItem, Voucher } from '@/types/customer'

export const selectedCartBranch = {
  id: 'ninh-kieu',
  name: 'Mizuki Ninh Kiều',
  address: '48 đường 30/4, Ninh Kiều, Cần Thơ',
} as const

export const cartItemsDemo: readonly CartItem[] = [
  {
    id: 'cart-1',
    product: productListingProducts[0]!,
    variant: { id: '236ml', label: 'Dung tích', value: '236 ml', available: true },
    quantity: 1,
    unitPrice: productListingProducts[0]!.price,
    stockState: 'available',
    branchAvailability: {
      branchId: selectedCartBranch.id,
      branchName: selectedCartBranch.name,
      available: true,
      label: 'Còn hàng tại chi nhánh',
    },
    selected: true,
  },
  {
    id: 'cart-2',
    product: productListingProducts[2]!,
    variant: { id: '50ml', label: 'Dung tích', value: '50 ml', available: true },
    quantity: 2,
    unitPrice: productListingProducts[2]!.price,
    stockState: 'available',
    branchAvailability: {
      branchId: selectedCartBranch.id,
      branchName: selectedCartBranch.name,
      available: true,
      label: 'Còn hàng tại chi nhánh',
    },
    selected: true,
  },
  {
    id: 'cart-3',
    product: productListingProducts[5]!,
    variant: { id: 'light', label: 'Phiên bản', value: 'Mỏng nhẹ', available: false },
    quantity: 1,
    unitPrice: productListingProducts[5]!.price,
    stockState: 'variant-unavailable',
    branchAvailability: {
      branchId: selectedCartBranch.id,
      branchName: selectedCartBranch.name,
      available: true,
      label: 'Chi nhánh còn sản phẩm khác',
    },
    selected: false,
    unavailableReason: 'Biến thể đã chọn tạm hết hàng.',
  },
  {
    id: 'cart-4',
    product: productListingProducts[7]!,
    variant: { id: 'natural', label: 'Màu sắc', value: 'Tự nhiên', available: true },
    quantity: 1,
    unitPrice: productListingProducts[7]!.price,
    stockState: 'branch-unavailable',
    branchAvailability: {
      branchId: 'cai-rang',
      branchName: 'Mizuki Cái Răng',
      available: false,
      label: 'Không có tại Mizuki Ninh Kiều',
    },
    selected: false,
    unavailableReason: 'Sản phẩm chưa có tại chi nhánh đang chọn.',
  },
]

export const cartVouchersDemo: readonly Voucher[] = [
  {
    id: 'none',
    label: 'Không dùng voucher',
    description: 'Giữ nguyên tổng đơn hàng',
    discountType: 'fixed',
    discountValue: 0,
    minimumOrder: 0,
    applicable: true,
  },
  {
    id: 'MIZUKI50',
    label: 'MIZUKI50 · Giảm 50.000 ₫',
    description: 'Áp dụng cho đơn hàng từ 300.000 ₫',
    discountType: 'fixed',
    discountValue: 50_000,
    minimumOrder: 300_000,
    applicable: true,
  },
  {
    id: 'BEAUTY10',
    label: 'BEAUTY10 · Giảm 10%',
    description: 'Giảm tối đa 80.000 ₫ cho đơn hàng từ 500.000 ₫',
    discountType: 'percentage',
    discountValue: 10,
    minimumOrder: 500_000,
    applicable: true,
  },
]

export const cartRecommendations = productListingProducts.slice(8, 16)
