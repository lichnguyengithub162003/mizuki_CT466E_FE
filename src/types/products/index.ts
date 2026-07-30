import type { HomeIconName, HomeProduct } from '@/types/home'

export type ProductSortKey =
  | 'popular'
  | 'newest'
  | 'price-ascending'
  | 'price-descending'
  | 'best-selling'

export type ProductPriceRange =
  | 'all'
  | 'under-200'
  | '200-500'
  | '500-1000'
  | 'over-1000'

export type ProductHighlight = 'discounted' | 'bestseller' | 'new'

export interface ProductCategory {
  readonly id: string
  readonly label: string
}

export interface ProductFeaturedCategory extends ProductCategory {
  readonly description: string
  readonly icon: HomeIconName
  readonly href: string
  readonly tone: 'sage' | 'mint' | 'apricot' | 'powder' | 'rose' | 'sand'
}

export interface ProductFilterOption {
  readonly id: string
  readonly label: string
  readonly count: number
}

export interface ProductSortOption {
  readonly value: ProductSortKey
  readonly label: string
}

export interface ProductListingBanner {
  readonly eyebrow: string
  readonly title: string
  readonly description: string
  readonly actionLabel: string
}

export interface CategoryPreviewProduct {
  readonly id: string
  readonly name: string
  readonly brand: string
  readonly imageUrl?: string
  readonly tone: 'mint' | 'rose' | 'sand' | 'sky' | 'lilac'
  readonly featured?: boolean
}

export interface ProductCategorySummary {
  readonly name: string
  readonly description: string
  readonly resultCount: number
  readonly quickFilterIds: readonly string[]
  readonly previewProducts: readonly CategoryPreviewProduct[]
}

export interface ProductCategoryBrand {
  readonly id: string
  readonly name: string
  readonly imageUrl?: string
  readonly imageAlt?: string
  readonly initials: string
  readonly tone: 'mint' | 'rose' | 'sand' | 'sky' | 'lilac'
  readonly description?: string
  readonly productCount?: number
}

export interface ProductBrandPromotion {
  readonly id: string
  readonly name: string
  readonly imageUrl?: string
  readonly accent: string
  readonly description?: string
  readonly productCount?: number
  readonly featured?: boolean
}

export interface ProductFilterState {
  readonly categoryIds: readonly string[]
  readonly brandIds: readonly string[]
  readonly concernIds: readonly string[]
  readonly priceRange: ProductPriceRange
  readonly minimumRating: number | null
  readonly highlights: readonly ProductHighlight[]
  readonly inStockOnly: boolean
}

export interface ProductListingProduct extends HomeProduct {
  readonly categoryId: string
  readonly brandId: string
  readonly concernIds: readonly string[]
  readonly isNew: boolean
  readonly isBestseller: boolean
  readonly popularity: number
  readonly createdOrder: number
}

export type ProductContentState = 'success' | 'loading' | 'empty' | 'error'
