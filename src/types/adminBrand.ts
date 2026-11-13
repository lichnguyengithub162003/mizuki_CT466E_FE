export type AdminBrandStatus = 'published' | 'hidden' | 'draft'

export interface AdminBrandRecord {
  id: number
  name: string
  slug: string
  logo_url: string | null
  logo_rendition_url: string | null
  banner_image: string | null
  banner_rendition_url: string | null
  mobile_banner_image?: string | null
  supporting_image?: string | null
  description: string | null
  follower_count: number
  product_count: number
  is_active: boolean
  status: AdminBrandStatus
  origin_country: string | null
  official_website: string | null
  established_year: number | null
  joined_at: string | null
  seo_title: string | null
  seo_description: string | null
  partner_name?: string | null
  partner_relationship?: 'direct' | 'official_distributor' | 'authorized_retailer' | 'other' | null
  partnership_started_at?: string | null
  created_at: string | null
  updated_at: string | null
  deleted_at?: string | null
  deletion_mode?: 'brand_only' | 'brand_and_products' | null
  deleted_product_count?: number | null
}

export interface AdminBrandPage {
  items: AdminBrandRecord[]
  pagination: { current_page: number; last_page: number; per_page: number; total: number }
}

export interface AdminBrandListParams {
  search?: string
  status?: AdminBrandStatus
  origin_country?: string
  product_count_min?: number
  product_count_max?: number
  sort?: 'name' | 'created_at' | 'product_count'
  direction?: 'asc' | 'desc'
  page: number
  per_page: number
}

export interface AdminBrandMutation {
  name?: string
  slug?: string
  description?: string | null
  status?: AdminBrandStatus
  origin_country?: string | null
  official_website?: string | null
  established_year?: number | null
  partner_name?: string | null
  partner_relationship?: AdminBrandRecord['partner_relationship']
  partnership_started_at?: string | null
  joined_at?: string | null
  seo_title?: string | null
  seo_description?: string | null
  logo_upload_token?: string
  logo_url?: null
  banner_upload_token?: string
  banner_image?: null
  mobile_banner_upload_token?: string
  mobile_banner_image?: null
  supporting_upload_token?: string
  supporting_image?: null
}

export interface AdminBrandDeletePreview {
  products: number
  pending_orders: number
  shipping_orders: number
}

export interface AdminBrandEvent {
  id: number
  action: string
  changes: Record<string, unknown>
  created_at: string
  actor: { id: number; name: string | null } | null
}

export interface AdminBrandEventPage {
  items: AdminBrandEvent[]
  pagination: AdminBrandPage['pagination']
}

export interface AdminBrandProduct {
  id: number
  name: string
  slug: string
  is_active: boolean
  brand_featured_sort_order: number | null
  primary_image_thumb_url?: string | null
}

export type AdminBrandStorefrontSection = 'story' | 'featured' | 'vouchers'
export interface AdminBrandStorefrontConfig {
  preset: 'editorial' | 'gallery'
  intro: string | null
  sections: AdminBrandStorefrontSection[]
  assets?: {
    desktop_banner?: string | null
    mobile_banner?: string | null
    supporting_image?: string | null
  }
}
export interface AdminBrandStorefrontDraftMutation extends AdminBrandStorefrontConfig {
  desktop_banner_upload_token?: string
  mobile_banner_upload_token?: string
  supporting_image_upload_token?: string
  remove_desktop_banner?: boolean
  remove_mobile_banner?: boolean
  remove_supporting_image?: boolean
}
export interface AdminBrandStorefront {
  published: AdminBrandStorefrontConfig | null
  draft: AdminBrandStorefrontConfig | null
  featured_products?: Array<{ id: number; name: string; slug: string; image_url: string | null }>
  promotions?: Array<{ id: number; name: string; code: string | null; discount_type: string; discount_value: number; ends_at: string | null }>
}

export interface AdminBrandPromotion {
  id: number
  name: string
  code: string | null
  discount_type: string
  discount_value: number
  starts_at: string
  ends_at: string | null
  usage_count: number
  status: 'scheduled' | 'active' | 'expired' | 'paused'
  show_on_storefront: boolean
}
export interface AdminBrandPromotionPage {
  items: AdminBrandPromotion[]
  pagination: AdminBrandPage['pagination']
}
export interface AdminBrandPromotionOptionPage {
  items: Array<{ id: number; name: string; code: string | null; is_active: boolean }>
  pagination: AdminBrandPage['pagination']
}
