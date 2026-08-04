import type { HomeIconName, HomeProduct } from '@/types/home'

export type ProductSortKey =
  | 'popular'
  | 'newest'
  | 'price-ascending'
  | 'price-descending'
  | 'best-selling'
  | 'price_asc'
  | 'price_desc'
  | 'rating'
  | 'name'

export type ProductBackendSort = 'newest' | 'price_asc' | 'price_desc' | 'rating' | 'name'

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
  readonly slug: string
  readonly categoryId: string
  readonly brandId: string
  readonly imageUrl?: string
  readonly concernIds?: readonly string[]
  readonly isNew?: boolean
  readonly isBestseller?: boolean
  readonly popularity?: number
  readonly createdOrder?: number
}

export type ProductContentState = 'success' | 'loading' | 'empty' | 'error'

export type ProductDetailStockState = 'available' | 'low-stock' | 'out-of-stock'

export interface ProductDetailImage {
  readonly id: string
  readonly label: string
  readonly alt: string
  readonly tone: 'sage' | 'mint' | 'sand' | 'rose' | 'sky'
  readonly imageUrl?: string
}

export interface ProductDetailVariantOption {
  readonly id: string
  readonly label: string
  readonly available: boolean
}

export interface ProductDetailVariantGroup {
  readonly id: string
  readonly label: string
  readonly options: readonly ProductDetailVariantOption[]
}

export interface ProductDetailBrand {
  readonly name: string
  readonly initials: string
  readonly origin: string
  readonly description: string
  readonly rating: number
  readonly reviewCount: number
  readonly productCount: number
  readonly isOfficial: boolean
}

export interface ProductDetailSpecification {
  readonly label: string
  readonly value: string
}

export interface ProductDetailReview {
  readonly id: string
  readonly author: string
  readonly rating: number
  readonly date: string
  readonly content: string
  readonly verified: boolean
}

export interface ProductDetailRatingDistribution {
  readonly rating: number
  readonly count: number
  readonly percentage: number
}

export interface ProductDetailQuestion {
  readonly id: string
  readonly author: string
  readonly question: string
  readonly answer: string
  readonly date: string
}

export interface ProductDetailBranch {
  readonly id: string
  readonly name: string
  readonly address: string
  readonly stockState: ProductDetailStockState
  readonly stockLabel: string
}

export interface ProductDetail {
  readonly id: string
  readonly slug: string
  readonly name: string
  readonly brand: ProductDetailBrand
  readonly images: readonly ProductDetailImage[]
  readonly currentPrice: number
  readonly originalPrice?: number
  readonly discountLabel?: string
  readonly rating: number
  readonly reviewCount: number
  readonly soldCount: number
  readonly badges: readonly string[]
  readonly sellingPoints: readonly string[]
  readonly shippingSummary: string
  readonly destinationSummary: string
  readonly stockState: ProductDetailStockState
  readonly stockLabel: string
  readonly maxQuantity: number
  readonly variants: readonly ProductDetailVariantGroup[]
  readonly description: readonly string[]
  readonly ingredients: readonly string[]
  readonly usage: readonly string[]
  readonly specifications: readonly ProductDetailSpecification[]
  readonly reviews: readonly ProductDetailReview[]
  readonly ratingDistribution: readonly ProductDetailRatingDistribution[]
  readonly questions: readonly ProductDetailQuestion[]
  readonly branches: readonly ProductDetailBranch[]
  readonly relatedProductIds: readonly string[]
}
