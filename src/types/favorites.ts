export type CustomerFavoriteStockState =
  | 'available'
  | 'low-stock'
  | 'sold-out'
  | 'discontinued'

export interface CustomerFavoriteBrand {
  readonly id: number
  readonly name: string
  readonly slug: string
}

export interface CustomerFavorite {
  readonly productId: number
  readonly name: string
  readonly slug: string
  readonly imageUrl?: string
  readonly minimumPrice: number
  readonly brand: CustomerFavoriteBrand | null
  readonly originalPrice: number | null
  readonly stockState: CustomerFavoriteStockState
}
