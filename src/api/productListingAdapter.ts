import type {
  ProductDetailResponseDto,
  ProductListingItemDto,
  ProductListingResponseDto,
} from '@/api/productListingApi'
import type { ProductDetail, ProductListingProduct } from '@/types/products'

const BACKEND_ORIGIN = 'http://localhost:8000'
export const PRODUCT_LISTING_FALLBACK_IMAGE =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="480" height="480" viewBox="0 0 480 480"%3E%3Crect width="480" height="480" rx="36" fill="%23e3f1eb"/%3E%3Cpath d="M166 178h148v148H166z" fill="none" stroke="%232f6f58" stroke-width="18"/%3E%3Cpath d="m166 178 74 48 74-48M240 226v100" fill="none" stroke="%232f6f58" stroke-width="18"/%3E%3C/svg%3E'

export interface ProductListingPagination {
  currentPage: number
  perPage: number
  total: number
  lastPage: number
}

export interface ProductListingResult {
  products: ProductListingProduct[]
  pagination: ProductListingPagination
}

function finiteNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

export function resolveProductImage(value: string | null | undefined): string {
  const image = value?.trim()
  if (!image) return PRODUCT_LISTING_FALLBACK_IMAGE
  if (/placehold\.co/i.test(image)) return PRODUCT_LISTING_FALLBACK_IMAGE
  if (/^https?:\/\//i.test(image)) return image
  return `${BACKEND_ORIGIN}${image.startsWith('/') ? image : `/${image}`}`
}

export function resolveCatalogAsset(value: string | null | undefined): string | undefined {
  const asset = value?.trim()
  if (!asset) return undefined
  if (/^https?:\/\//i.test(asset)) return asset
  if (asset.startsWith('/storage/')) return `${BACKEND_ORIGIN}${asset}`

  const normalized = asset.replace(/^\/+/, '')
  if (normalized.startsWith('storage/')) return `${BACKEND_ORIGIN}/${normalized}`
  if (normalized.startsWith('catalog/brands/')) {
    return `${BACKEND_ORIGIN}/storage/${normalized}`
  }
  return `${BACKEND_ORIGIN}/storage/catalog/brands/${normalized}`
}

function effectivePrice(product: ProductListingItemDto): number {
  return finiteNumber(product.default_variant?.effective_price)
    ?? finiteNumber(product.minimum_price)
    ?? finiteNumber(product.price)
    ?? 0
}

export function adaptProductListItem(product: ProductListingItemDto): ProductListingProduct {
  const price = effectivePrice(product)
  const originalPrice = finiteNumber(product.original_price)
  const discountPercent = finiteNumber(product.discount?.percentage)

  return {
    id: String(product.id),
    slug: product.slug,
    name: product.name,
    brand: product.brand.name,
    brandId: String(product.brand.id),
    categoryId: String(product.category.id),
    tone: 'mint',
    imageUrl: resolveProductImage(product.primary_image_url ?? product.primary_image),
    price,
    originalPrice: product.has_discount && originalPrice !== null && originalPrice > price
      ? originalPrice
      : undefined,
    discountPercent: product.has_discount && discountPercent !== null && discountPercent > 0
      ? Math.round(discountPercent)
      : undefined,
    rating: finiteNumber(product.rating) ?? 0,
    reviewCount: Math.max(0, product.review_count),
    stockState: !product.availability.available
      ? 'sold_out'
      : product.availability.available_quantity <= 5
        ? 'low'
        : 'available',
  }
}

export function adaptProductListing(response: ProductListingResponseDto): ProductListingResult {
  const pagination = response.meta.pagination
  return {
    products: response.data.map(adaptProductListItem),
    pagination: {
      currentPage: pagination.current_page,
      perPage: pagination.per_page,
      total: pagination.total,
      lastPage: pagination.last_page,
    },
  }
}

function richTextToLines(value: string | null | undefined): string[] {
  if (!value) return []
  const text = value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/\s+/g, ' ').trim()
  return text ? [text] : []
}

function detailStockState(quantity: number): ProductDetail['stockState'] {
  if (quantity <= 0) return 'out-of-stock'
  return quantity <= 5 ? 'low-stock' : 'available'
}

function detailStockLabel(quantity: number): string {
  if (quantity <= 0) return 'Tạm hết hàng'
  return quantity <= 5 ? 'Sắp hết hàng' : 'Còn hàng'
}

export function adaptProductDetail(response: ProductDetailResponseDto): ProductDetail {
  const detail = response.data
  const totalQuantity = detail.variants.reduce((total, variant) => total + Math.max(0, variant.total_available_quantity), 0)
  const images = (detail.gallery.length > 0 ? detail.gallery : detail.images).map((image, index) => ({
    id: String(image.id), label: `Ảnh ${index + 1}`, alt: image.alt_text || detail.name,
    tone: (['sage', 'mint', 'sand', 'rose', 'sky'] as const)[index % 5], imageUrl: resolveProductImage(image.image_url),
  }))
  const price = finiteNumber(detail.prices.minimum)
    ?? detail.variants.map((variant) => finiteNumber(variant.effective_price) ?? 0).filter(Boolean).sort((a, b) => a - b)[0]
    ?? 0

  return {
    id: String(detail.id), slug: detail.slug, name: detail.name,
    brand: { name: detail.brand.name, initials: detail.brand.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase(), origin: detail.origin_country || 'Chưa có thông tin', description: '', rating: finiteNumber(detail.rating) ?? 0, reviewCount: Math.max(0, detail.review_count), productCount: 0, isOfficial: false },
    images, currentPrice: price, rating: finiteNumber(detail.rating) ?? 0, reviewCount: Math.max(0, detail.review_count), soldCount: 0, badges: [], sellingPoints: richTextToLines(detail.short_description),
    shippingSummary: 'Thông tin giao hàng được xác nhận khi đặt hàng.', destinationSummary: 'Tồn kho hiển thị theo chi nhánh đã chọn.', stockState: detailStockState(totalQuantity), stockLabel: detailStockLabel(totalQuantity), maxQuantity: Math.max(1, Math.min(totalQuantity, 99)),
    variants: detail.variants.length > 0 ? [{ id: 'variant', label: 'Phân loại', options: detail.variants.map((variant) => ({ id: String(variant.id), label: variant.name, available: variant.available })) }] : [],
    description: richTextToLines(detail.description), ingredients: richTextToLines(detail.ingredients), usage: richTextToLines(detail.usage_instructions),
    specifications: Object.entries(detail.specifications ?? {}).flatMap(([label, value]) => value === null || value === '' ? [] : [{ label, value: String(value) }]),
    reviews: detail.reviews.map((review) => ({ id: String(review.id), author: review.customer_name || 'Khách hàng Mizuki', rating: review.rating, date: review.created_at || '', content: review.comment || review.content || '', verified: false })),
    ratingDistribution: [], questions: detail.questions_and_answers.map((question) => ({ id: String(question.id), author: question.customer_name || 'Khách hàng Mizuki', question: question.question, answer: question.answer || 'Chưa có phản hồi.', date: question.created_at || '' })),
    branches: detail.branch_availability.map((branch) => ({ id: String(branch.branch_id), name: branch.branch_name, address: 'Xem địa chỉ tại bộ chọn chi nhánh.', stockState: detailStockState(branch.available_quantity), stockLabel: detailStockLabel(branch.available_quantity) })),
    relatedProductIds: detail.related_products.map((item) => String(item.id)),
  }
}
