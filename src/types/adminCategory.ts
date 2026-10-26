export interface AdminCategoryAncestor {
  id: number
  name: string
  slug: string
}

export interface AdminCategoryRecord {
  id: number
  parent_id: number | null
  name: string
  slug: string
  description: string | null
  image_url: string | null
  image_rendition_url: string | null
  sort_order: number
  is_active: boolean
  parent: AdminCategoryAncestor | null
  children_count: number
  has_children: boolean
  product_count: number
  ancestors: AdminCategoryAncestor[]
  depth: number
  created_at: string | null
  updated_at: string | null
}

export interface AdminCategoryPagination {
  current_page: number
  per_page: number
  total: number
  last_page: number
}

export interface AdminCategoryPage {
  items: AdminCategoryRecord[]
  pagination: AdminCategoryPagination
}

interface AdminCategoryListOptions {
  search?: string
  is_active?: boolean
  has_children?: boolean
  sort?: 'sort_order' | 'name' | 'created_at' | 'updated_at' | 'product_count'
  direction?: 'asc' | 'desc'
  page: number
  per_page: number
}

export type AdminCategoryListParams = AdminCategoryListOptions & (
  | { mode: 'root' | 'flat'; parent_id?: never }
  | { mode: 'children'; parent_id: number }
)

export interface AdminCategoryMutation {
  parent_id: number | null
  name: string
  slug: string
  description: string | null
  sort_order: number
  is_active: boolean
  image_upload_token?: string
  image_url?: null
}
