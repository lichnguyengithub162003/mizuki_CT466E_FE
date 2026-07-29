export type HomeIconName =
  | 'sparkles'
  | 'droplets'
  | 'palette'
  | 'scissors'
  | 'flower'
  | 'sun'
  | 'gift'
  | 'tags'
  | 'building'
  | 'history'
  | 'new'
  | 'heart'

export interface HomeCategory {
  readonly id: string
  readonly label: string
  readonly icon: HomeIconName
  readonly image?: string
  readonly children?: readonly HomeCategory[]
  readonly href: string
  readonly featured?: boolean
}

export type HomeHeroTone = 'sage' | 'apricot' | 'periwinkle'

export interface HomeHeroSlide {
  readonly id: string
  readonly eyebrow: string
  readonly title: string
  readonly description: string
  readonly ctaLabel: string
  readonly tone: HomeHeroTone
  readonly image?: string
  readonly decorativeVariant?: 'bottle' | 'gift' | 'service'
}

export interface HomeQuickLink {
  readonly id: string
  readonly label: string
  readonly icon: HomeIconName
  readonly description?: string
  readonly href: string
}

export type HomeStockState = 'available' | 'low' | 'sold_out'
export type HomeProductTone = 'mint' | 'rose' | 'sand' | 'sky' | 'lilac'

export interface HomeProduct {
  readonly id: string
  readonly name: string
  readonly brand: string
  readonly image?: string
  readonly tone: HomeProductTone
  readonly price: number
  readonly originalPrice?: number
  readonly discountPercent?: number
  readonly rating?: number
  readonly reviewCount?: number
  readonly soldCount?: number
  readonly stockState: HomeStockState
  readonly badge?: string
}

export interface HomeBrand {
  readonly id: string
  readonly name: string
  readonly image?: string
  readonly accent: string
  readonly description?: string
}

export type HomePromotionTone = 'sage' | 'apricot' | 'powder'

export interface HomePromotion {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly ctaLabel: string
  readonly tone: HomePromotionTone
  readonly image?: string
}
