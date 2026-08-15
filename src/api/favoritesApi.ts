import { apiClient } from '@/api/clients'
import { resolveProductImage } from '@/api/productListingAdapter'
import type {
  CustomerFavorite,
  CustomerFavoriteStockState,
} from '@/types/favorites'

interface FavoriteBrandDto {
  readonly id: number
  readonly name: string
  readonly slug: string
}

interface FavoriteDto {
  readonly id: number
  readonly name: string
  readonly slug: string
  readonly primary_image_url: string | null
  readonly minimum_price: number | string
  readonly brand: FavoriteBrandDto | null
  readonly original_price: number | null
  readonly stock_state: CustomerFavoriteStockState
}

interface FavoriteResponseDto {
  readonly success: boolean
  readonly message: string
  readonly data: FavoriteDto
}

interface FavoriteListResponseDto {
  readonly success: boolean
  readonly message: string
  readonly data: readonly FavoriteDto[]
  readonly meta: {
    readonly pagination: {
      readonly current_page: number
      readonly last_page: number
    }
  }
}

function adaptFavorite(favorite: FavoriteDto): CustomerFavorite {
  return {
    productId: favorite.id,
    name: favorite.name,
    slug: favorite.slug,
    imageUrl: favorite.primary_image_url
      ? resolveProductImage(favorite.primary_image_url)
      : undefined,
    minimumPrice: typeof favorite.minimum_price === 'number'
      ? favorite.minimum_price
      : Number(favorite.minimum_price),
    brand: favorite.brand,
    originalPrice: favorite.original_price,
    stockState: favorite.stock_state,
  }
}

async function getFavoritePage(
  page: number,
  branchId: number | null,
): Promise<FavoriteListResponseDto> {
  const response = await apiClient.get<FavoriteListResponseDto>('/customer/favorites', {
    params: {
      page,
      ...(branchId === null ? {} : { branch_id: branchId }),
    },
  })
  return response.data
}

export async function getCustomerFavorites(
  branchId: number | null = null,
): Promise<CustomerFavorite[]> {
  const firstPage = await getFavoritePage(1, branchId)
  const lastPage = Math.max(1, firstPage.meta.pagination.last_page)
  if (lastPage === 1) return firstPage.data.map(adaptFavorite)

  const remainingPages = await Promise.all(
    Array.from(
      { length: lastPage - 1 },
      (_, index) => getFavoritePage(index + 2, branchId),
    ),
  )

  return [firstPage, ...remainingPages].flatMap((page) => page.data.map(adaptFavorite))
}

export async function addCustomerFavorite(
  productId: number,
  branchId: number | null = null,
): Promise<CustomerFavorite> {
  const response = await apiClient.post<FavoriteResponseDto>('/customer/favorites', {
    product_id: productId,
    ...(branchId === null ? {} : { branch_id: branchId }),
  })
  return adaptFavorite(response.data.data)
}

export async function removeCustomerFavorite(productId: number): Promise<void> {
  await apiClient.delete(`/customer/favorites/${productId}`)
}
