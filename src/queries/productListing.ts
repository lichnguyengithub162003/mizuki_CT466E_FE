import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { keepPreviousData, QueryClient, useQuery } from '@tanstack/vue-query'
import {
  getProductBrands,
  getProductCategories,
  getProductDetail,
  getProductListing,
  type ProductBrandDto,
  type ProductCategoryDto,
  type ProductListingRequest,
} from '@/api/productListingApi'
import { adaptProductDetail, adaptProductListing, adaptProductListItem } from '@/api/productListingAdapter'
import type { ProductDetail, ProductListingProduct } from '@/types/products'

const productListingQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 30_000,
    },
  },
})

export function useProductListingQuery(
  request: MaybeRefOrGetter<ProductListingRequest>,
  enabled: MaybeRefOrGetter<boolean> = true,
) {
  const normalizedRequest = computed(() => toValue(request))

  return useQuery({
    queryKey: computed(() => ['product-listing', normalizedRequest.value]),
    queryFn: async () => adaptProductListing(await getProductListing(normalizedRequest.value)),
    placeholderData: keepPreviousData,
    enabled: computed(() => toValue(enabled)),
  }, productListingQueryClient)
}

export function useProductDetailQuery(
  slug: MaybeRefOrGetter<string>,
  enabled: MaybeRefOrGetter<boolean> = true,
) {
  const normalizedSlug = computed(() => toValue(slug).trim())
  return useQuery<ProductDetail>({
    queryKey: computed(() => ['product-detail', normalizedSlug.value]),
    queryFn: async () => adaptProductDetail(await getProductDetail(normalizedSlug.value)),
    enabled: computed(() => toValue(enabled) && normalizedSlug.value.length > 0),
  }, productListingQueryClient)
}

export function useProductDiscoveryQuery(
  enabled: MaybeRefOrGetter<boolean> = true,
) {
  return useQuery({
    queryKey: ['product-discovery-options'],
    queryFn: async (): Promise<{
      categories: ProductCategoryDto[]
      brands: ProductBrandDto[]
    }> => {
      const [categories, brands] = await Promise.all([
        getProductCategories(),
        getProductBrands(),
      ])
      return { categories, brands }
    },
    enabled: computed(() => toValue(enabled)),
  }, productListingQueryClient)
}

interface RepresentativeRequests {
  categoryIds: number[]
  brandIds: number[]
  branchId?: number
}

export interface RepresentativeProducts {
  categories: ReadonlyMap<number, ProductListingProduct | undefined>
  brands: ReadonlyMap<number, ProductListingProduct | undefined>
}

export function useRepresentativeProductsQuery(
  requests: MaybeRefOrGetter<RepresentativeRequests>,
  enabled: MaybeRefOrGetter<boolean> = true,
) {
  const normalizedRequests = computed(() => toValue(requests))

  return useQuery({
    queryKey: computed(() => ['product-representatives', normalizedRequests.value]),
    queryFn: async (): Promise<RepresentativeProducts> => {
      const value = normalizedRequests.value
      const baseRequest = {
        ...(value.branchId ? { branch_id: value.branchId } : {}),
        sort: 'newest' as const,
        page: 1,
        per_page: 1,
      }
      const [categoryResults, brandResults] = await Promise.all([
        Promise.all(value.categoryIds.map(async (categoryId) => ({
          categoryId,
          response: await getProductListing({ ...baseRequest, category_id: categoryId }),
        }))),
        Promise.all(value.brandIds.map(async (brandId) => ({
          brandId,
          response: await getProductListing({ ...baseRequest, brand_id: brandId }),
        }))),
      ])

      return {
        categories: new Map(categoryResults.map(({ categoryId, response }) => [
          categoryId,
          response.data[0] ? adaptProductListItem(response.data[0]) : undefined,
        ])),
        brands: new Map(brandResults.map(({ brandId, response }) => [
          brandId,
          response.data[0] ? adaptProductListItem(response.data[0]) : undefined,
        ])),
      }
    },
    enabled: computed(() => {
      const value = normalizedRequests.value
      return toValue(enabled) && (value.categoryIds.length > 0 || value.brandIds.length > 0)
    }),
  }, productListingQueryClient)
}
