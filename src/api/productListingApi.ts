import { apiClient } from '@/api/clients'
import { ENDPOINTS } from '@/constants/endpoints'
import type { ProductBackendSort } from '@/types/products'

export interface ProductListingCategoryDto {
  id: number
  name: string
  parent_id: number | null
}

export interface ProductListingBrandDto {
  id: number
  name: string
}

export interface ProductListingDiscountDto {
  amount: number | string | null
  percentage: number | string | null
}

export interface ProductListingVariantDto {
  id: number
  name: string
  sku: string
  attributes: Record<string, unknown>
  price: number | string | null
  sale_price: number | string | null
  effective_price: number | string | null
}

export interface ProductListingAvailabilityDto {
  available: boolean
  available_quantity: number
}

export interface ProductListingItemDto {
  id: number
  name: string
  slug: string
  category: ProductListingCategoryDto
  brand: ProductListingBrandDto
  primary_image: string | null
  primary_image_url: string | null
  price: number | string | null
  original_price: number | string | null
  minimum_price: number | string | null
  has_discount: boolean
  discount: ProductListingDiscountDto | null
  rating: number | string | null
  review_count: number
  default_variant: ProductListingVariantDto | null
  availability: ProductListingAvailabilityDto
}

export interface ProductListingPaginationDto {
  current_page: number
  per_page: number
  total: number
  last_page: number
}

export interface ProductListingResponseDto {
  success: boolean
  data: ProductListingItemDto[]
  message: string
  meta: {
    pagination: ProductListingPaginationDto
  }
}

export interface ProductCategoryDto {
  id: number
  parent_id: number | null
  name: string
  slug: string
  children: ProductCategoryDto[]
}

export interface ProductBrandDto {
  id: number
  name: string
  slug: string
  logo: string | null
  banner_image: string | null
  description: string | null
}

export interface ProductSearchItemDto {
  id: number
  name: string
  slug: string
  primary_image_url: string | null
  minimum_price: number | string | null
}

export interface ProductDetailImageDto {
  id: number
  image_url: string | null
  alt_text: string | null
  sort_order: number
}

export interface ProductDetailVariantDto extends ProductListingVariantDto {
  total_available_quantity: number
  available: boolean
}

export interface ProductDetailResponseDto {
  success: boolean
  data: {
    id: number
    name: string
    slug: string
    short_description: string | null
    description: string | null
    ingredients: string | null
    usage_instructions: string | null
    specifications: Record<string, string | number | null> | null
    origin_country: string | null
    brand: ProductListingBrandDto
    images: ProductDetailImageDto[]
    gallery: ProductDetailImageDto[]
    variants: ProductDetailVariantDto[]
    prices: { minimum: number | string | null; maximum: number | string | null }
    rating: number | string | null
    review_count: number
    branch_availability: Array<{ variant_id: number; branch_id: number; branch_name: string; available_quantity: number }>
    related_products: ProductListingItemDto[]
    reviews: Array<{ id: number; rating: number; comment?: string | null; content?: string | null; created_at?: string | null; customer_name?: string | null }>
    questions_and_answers: Array<{ id: number; question: string; answer?: string | null; created_at?: string | null; customer_name?: string | null }>
  }
  message: string
}

interface ApiCollectionResponse<T> {
  success: boolean
  data: T[]
  message: string
  meta: unknown[]
}

export interface ProductListingRequest {
  keyword?: string
  category_id?: number
  brand_id?: number
  branch_id?: number
  in_stock?: boolean
  sort: ProductBackendSort
  page: number
  per_page: number
}

export async function getProductListing(
  request: ProductListingRequest,
): Promise<ProductListingResponseDto> {
  const response = await apiClient.get<ProductListingResponseDto>(ENDPOINTS.products, {
    params: request,
  })
  return response.data
}

export async function getProductCategories(): Promise<ProductCategoryDto[]> {
  const response = await apiClient.get<ApiCollectionResponse<ProductCategoryDto>>('/categories')
  return response.data.data
}

export async function getProductBrands(): Promise<ProductBrandDto[]> {
  const response = await apiClient.get<ApiCollectionResponse<ProductBrandDto>>('/brands')
  return response.data.data
}

export async function searchProducts(keyword: string): Promise<ProductSearchItemDto[]> {
  const response = await apiClient.get<ApiCollectionResponse<ProductSearchItemDto>>(
    '/products/search',
    { params: { keyword } },
  )
  return response.data.data
}

export async function getProductDetail(slug: string): Promise<ProductDetailResponseDto> {
  const response = await apiClient.get<ProductDetailResponseDto>(
    `${ENDPOINTS.products}/${encodeURIComponent(slug)}`,
  )
  return response.data
}
