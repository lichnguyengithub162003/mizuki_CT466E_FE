import { apiClient } from "@/api/clients";
import { ENDPOINTS } from "@/constants/endpoints";
import type { ProductBackendSort } from "@/types/products";

export interface ProductListingCategoryDto {
  id: number;
  name: string;
  parent_id: number | null;
}

export interface ProductListingBrandDto {
  id: number;
  name: string;
}

export interface ProductListingDiscountDto {
  amount: number | string | null;
  percentage: number | string | null;
}

export interface ProductListingVariantDto {
  id: number;
  name: string;
  sku: string;
  attributes: Record<string, unknown>;
  price: number | string | null;
  sale_price: number | string | null;
  effective_price: number | string | null;
}

export interface ProductListingAvailabilityDto {
  available: boolean;
  available_quantity: number;
}

export interface ProductListingItemDto {
  id: number;
  name: string;
  slug: string;
  category: ProductListingCategoryDto;
  brand: ProductListingBrandDto;
  primary_image: string | null;
  primary_image_url: string | null;
  price: number | string | null;
  original_price: number | string | null;
  minimum_price: number | string | null;
  has_discount: boolean;
  discount: ProductListingDiscountDto | null;
  rating: number | string | null;
  review_count: number;
  default_variant: ProductListingVariantDto | null;
  availability: ProductListingAvailabilityDto;
}

export interface ProductListingPaginationDto {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

export interface ProductListingResponseDto {
  success: boolean;
  data: ProductListingItemDto[];
  message: string;
  meta: {
    pagination: ProductListingPaginationDto;
  };
}

export interface ProductCategoryDto {
  id: number;
  parent_id: number | null;
  name: string;
  slug: string;
  children: ProductCategoryDto[];
}

export interface ProductBrandDto {
  id: number;
  name: string;
  slug: string;
  logo: string | null;
  banner_image: string | null;
  description: string | null;
}

export interface ProductSearchItemDto {
  id: number;
  name: string;
  slug: string;
  primary_image_url: string | null;
  minimum_price: number | string | null;
}

export interface ProductDetailImageDto {
  id: number;
  image_url: string | null;
  alt_text: string | null;
  sort_order: number;
}

export interface ProductDetailVariantDto extends ProductListingVariantDto {
  total_available_quantity: number;
  available: boolean;
}

export interface ProductDetailBrandDto {
  id: number;
  name: string;
  slug: string;
  logo_url: string | null;
  active_product_count: number | string | null;
  average_rating: number | string | null;
  review_count: number | string | null;
  follower_count: number | string | null;
}

export interface ProductDetailReviewDto {
  id: number | string;
  rating: number;
  customer_name?: string | null;
  reviewer_name?: string | null;
  comment?: string | null;
  content?: string | null;
  is_verified_purchase?: boolean | null;
  created_at?: string | null;
}

export interface ProductDetailQaDto {
  id: number | string;
  question: string;
  answer?: string | null;
  customer_name?: string | null;
  asker_name?: string | null;
  responder_name?: string | null;
  created_at?: string | null;
  answered_at?: string | null;
}

export interface ProductDetailProductDto {
  id: number;
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  ingredients: string | null;
  usage_instructions: string | null;
  specifications: Record<string, string | number | null> | null;
  origin_country: string | null;
  images: ProductDetailImageDto[];
  gallery: ProductDetailImageDto[];
  variants: ProductDetailVariantDto[];
  prices: {
    minimum: number | string | null;
    maximum: number | string | null;
  };
  rating: number | string | null;
  review_count: number;
  branch_availability: Array<{
    variant_id: number;
    branch_id: number;
    branch_name: string;
    available_quantity: number;
  }>;
  related_products: ProductListingItemDto[];
}

export interface ProductDetailResponseDto {
  success: boolean;
  data: {
    product: ProductDetailProductDto;
    brand: ProductDetailBrandDto;
    reviews: ProductDetailReviewDto[];
    qa: ProductDetailQaDto[];
  };
  message: string;
}

export interface ProductReviewSummaryDto {
  average_rating: number | string | null;
  total_reviews: number;
  satisfaction_percentage?: number | string | null;
  rating_distribution?: Record<string, number> | null;
}

export interface ProductReviewCustomerDto {
  id: number | string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export interface ProductReviewMizukiResponseDto {
  author: string;
  content: string;
}

export interface ProductReviewItemDto {
  id: number | string;
  customer: ProductReviewCustomerDto;
  rating: number | string;
  title?: string | null;
  content: string | null;
  reviewed_at: string | null;
  verified_purchase: boolean;
  images?: readonly string[] | null;
  image_urls?: readonly string[] | null;
  helpful_count?: number | string | null;
  mizuki_response?: ProductReviewMizukiResponseDto | null;
}

export interface ProductReviewsResponseDto {
  success: boolean;
  data: {
    summary: ProductReviewSummaryDto;
    reviews: ProductReviewItemDto[];
  };
  message: string;
  meta: {
    pagination: ProductListingPaginationDto;
  };
}

export interface ProductReviewsRequest {
  rating?: number;
  has_images?: boolean;
  verified_only?: boolean;
  sort: "newest";
  page: number;
  per_page: number;
}

export interface BrandFollowResultDto {
  follower_count: number;
}

interface BrandFollowResponseDto {
  success: boolean;
  data: BrandFollowResultDto;
  message: string;
}

interface ApiCollectionResponse<T> {
  success: boolean;
  data: T[];
  message: string;
  meta: unknown[];
}

export interface ProductListingRequest {
  keyword?: string;
  category_id?: number;
  brand_id?: number;
  branch_id?: number;
  in_stock?: boolean;
  sort: ProductBackendSort;
  page: number;
  per_page: number;
}

export async function getProductListing(
  request: ProductListingRequest,
): Promise<ProductListingResponseDto> {
  const response = await apiClient.get<ProductListingResponseDto>(
    ENDPOINTS.products,
    { params: request },
  );
  return response.data;
}

export async function getProductCategories(): Promise<ProductCategoryDto[]> {
  const response =
    await apiClient.get<ApiCollectionResponse<ProductCategoryDto>>(
      "/categories",
    );
  return response.data.data;
}

export async function getProductBrands(): Promise<ProductBrandDto[]> {
  const response =
    await apiClient.get<ApiCollectionResponse<ProductBrandDto>>("/brands");
  return response.data.data;
}

export async function searchProducts(
  keyword: string,
): Promise<ProductSearchItemDto[]> {
  const response =
    await apiClient.get<ApiCollectionResponse<ProductSearchItemDto>>(
      "/products/search",
      { params: { keyword } },
    );
  return response.data.data;
}

export async function getProductDetail(
  slug: string,
): Promise<ProductDetailResponseDto> {
  const response = await apiClient.get<ProductDetailResponseDto>(
    `${ENDPOINTS.products}/${encodeURIComponent(slug)}`,
  );
  return response.data;
}

export async function getProductReviews(
  slug: string,
  request: ProductReviewsRequest,
): Promise<ProductReviewsResponseDto> {
  const response = await apiClient.get<ProductReviewsResponseDto>(
    `${ENDPOINTS.products}/${encodeURIComponent(slug)}/reviews`,
    { params: request },
  );
  return response.data;
}

export async function followBrand(
  brandId: number,
): Promise<BrandFollowResultDto> {
  const response = await apiClient.post<BrandFollowResponseDto>(
    `/customer/brands/${brandId}/follow`,
  );
  return response.data.data;
}

export async function unfollowBrand(
  brandId: number,
): Promise<BrandFollowResultDto> {
  const response = await apiClient.delete<BrandFollowResponseDto>(
    `/customer/brands/${brandId}/follow`,
  );
  return response.data.data;
}