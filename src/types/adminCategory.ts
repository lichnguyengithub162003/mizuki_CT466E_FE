export interface AdminCategoryAncestor {
  id: number
  name: string
  slug: string
}

export type AdminCategoryStatus = 'draft' | 'published' | 'hidden'

export interface AdminCategoryRecord {
  id: number
  parent_id: number | null
  name: string
  slug: string
  description: string | null
  image_url: string | null
  image_rendition_url: string | null
  sort_order: number
  status: AdminCategoryStatus
  is_active: boolean
  is_featured: boolean
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

interface AdminCategoryMutationFields {
  parent_id: number | null
  name: string
  slug: string
  description: string | null
  sort_order: number
  is_featured?: boolean
  image_upload_token?: string
  image_url?: null
}

type AdminCategoryLifecycleInput =
  | { status: AdminCategoryStatus; is_active?: never }
  | { status?: never; is_active: boolean }

export type AdminCategoryMutation = AdminCategoryMutationFields & AdminCategoryLifecycleInput

export interface AdminCategoryChildCreateRequest {
  name: string
  slug: string
  description?: string | null
  sort_order?: number
  status?: AdminCategoryStatus
  is_featured?: boolean
  image_upload_token?: string
}

export type AdminCategoryCreateRequest = AdminCategoryMutation & {
  attach_existing_child_ids?: number[]
  new_children?: AdminCategoryChildCreateRequest[]
}
