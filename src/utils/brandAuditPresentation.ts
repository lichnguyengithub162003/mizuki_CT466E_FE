import type { AdminBrandEvent } from '@/types/adminBrand'

const fieldNames: Record<string, string> = {
  name: 'tên', slug: 'đường dẫn', description: 'giới thiệu', status: 'trạng thái',
  logo_upload_token: 'logo', logo_url: 'logo', origin_country: 'xuất xứ',
  official_website: 'website', established_year: 'năm thành lập',
  partner_name: 'đối tác', partner_relationship: 'quan hệ đối tác',
  partnership_started_at: 'ngày bắt đầu hợp tác', joined_at: 'ngày tham gia',
  seo_title: 'tiêu đề tìm kiếm', seo_description: 'mô tả tìm kiếm',
}

export function brandEventTitle(event: AdminBrandEvent): string {
  switch (event.action) {
    case 'created': return 'Đã tạo thương hiệu'
    case 'updated': return Array.isArray(event.changes.fields) && event.changes.fields.length === 1 && event.changes.fields[0] === 'status'
      ? 'Đã cập nhật trạng thái thương hiệu' : 'Đã cập nhật thông tin thương hiệu'
    case 'deleted': return 'Đã đưa thương hiệu vào thùng rác'
    case 'restored': return 'Đã khôi phục thương hiệu'
    case 'featured_product_changed': return event.changes.featured === true
      ? 'Đã thêm sản phẩm nổi bật' : 'Đã bỏ sản phẩm khỏi danh sách nổi bật'
    case 'storefront_draft_saved': return 'Đã lưu bản nháp gian hàng'
    case 'storefront_published': return 'Đã xuất bản thiết kế gian hàng'
    case 'storefront_draft_discarded': return 'Đã bỏ bản nháp gian hàng'
    case 'promotion_associated': return 'Đã liên kết ưu đãi'
    case 'promotion_dissociated': return 'Đã bỏ liên kết ưu đãi'
    default: return 'Đã có thay đổi với thương hiệu'
  }
}

export function brandEventDetails(event: AdminBrandEvent, products: ReadonlyMap<number, string>): string[] {
  const changes = event.changes
  if (event.action === 'updated' && Array.isArray(changes.fields)) {
    const fields = changes.fields.filter((value): value is string => typeof value === 'string')
    return fields.length ? [`Trường đã đổi: ${fields.map(field => fieldNames[field] ?? 'thông tin khác').join(', ')}.`] : []
  }
  if (event.action === 'featured_product_changed' && typeof changes.product_id === 'number') {
    return [`Sản phẩm: ${products.get(changes.product_id) ?? `#${changes.product_id}`}.`]
  }
  if (event.action === 'deleted') {
    const mode = changes.mode === 'brand_and_products' ? 'Thương hiệu cùng các sản phẩm hiện thuộc thương hiệu.' : 'Chỉ thương hiệu; dữ liệu sản phẩm được giữ lại.'
    return [mode]
  }
  if (event.action === 'restored' && typeof changes.restored_product_count === 'number') {
    return [`Số sản phẩm được khôi phục: ${changes.restored_product_count}.`]
  }
  if (event.action === 'promotion_associated' || event.action === 'promotion_dissociated') {
    return typeof changes.promotion_id === 'number' ? [`Ưu đãi #${changes.promotion_id}.`] : []
  }
  return []
}
