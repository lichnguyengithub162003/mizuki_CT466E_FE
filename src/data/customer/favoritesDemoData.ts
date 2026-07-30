import { productListingProducts } from '@/data/products/productListingDemoData'
import type { FavoriteProduct, FavoriteStockState } from '@/types/customer'

const favoriteStockStates: readonly FavoriteStockState[] = [
  'available',
  'low-stock',
  'sold-out',
  'available',
  'discontinued',
  'available',
  'low-stock',
  'available',
]

export const favoriteProductsDemo: readonly FavoriteProduct[] = productListingProducts
  .slice(0, 8)
  .map((product, index) => {
    const stockState = favoriteStockStates[index] ?? 'available'
    const available = stockState === 'available' || stockState === 'low-stock'

    return {
      id: `favorite-${product.id}`,
      product,
      stockState,
      favoriteDate: `2026-07-${String(22 - index).padStart(2, '0')}`,
      recommendationProductId: productListingProducts[index + 8]?.id,
      branchAvailability: {
        branchId: 'ninh-kieu',
        branchName: 'Mizuki Ninh Kiều',
        available,
        label: available
          ? stockState === 'low-stock' ? 'Chỉ còn ít tại chi nhánh' : 'Có tại 3 chi nhánh'
          : 'Chưa có tại chi nhánh đã chọn',
      },
    }
  })
