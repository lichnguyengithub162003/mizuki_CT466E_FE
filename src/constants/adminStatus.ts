export interface StatusStyle { label: string; className: string }
const neutral = 'bg-surface-subtle text-muted-foreground border-border'
const info = 'bg-blue-50 text-blue-700 border-blue-200'
const success = 'bg-green-50 text-green-700 border-green-200'
const warning = 'bg-amber-50 text-amber-700 border-amber-200'
const danger = 'bg-red-50 text-red-700 border-red-200'

export const orderStatusConfig: Record<string, StatusStyle> = {
  pending: { label: 'Chờ xử lý', className: warning }, confirmed: { label: 'Đã xác nhận', className: info },
  processing: { label: 'Đang xử lý', className: info }, shipping: { label: 'Đang giao', className: info },
  delivered: { label: 'Đã giao', className: success }, cancelled: { label: 'Đã hủy', className: danger },
  refund_requested: { label: 'Yêu cầu hoàn tiền', className: warning }, refunded: { label: 'Đã hoàn tiền', className: neutral },
}
export const paymentStatusConfig: Record<string, StatusStyle> = {
  pending: { label: 'Chờ thanh toán', className: warning }, paid: { label: 'Đã thanh toán', className: success },
  failed: { label: 'Thất bại', className: danger }, cancelled: { label: 'Đã hủy', className: neutral }, refunded: { label: 'Đã hoàn tiền', className: info },
}
export const refundStatusConfig: Record<string, StatusStyle> = {
  requested: { label: 'Chờ duyệt', className: warning }, approved: { label: 'Đã duyệt', className: info },
  rejected: { label: 'Đã từ chối', className: danger }, refunded: { label: 'Đã hoàn tiền', className: success },
}
export const appointmentStatusConfig: Record<string, StatusStyle> = {
  pending: { label: 'Chờ xác nhận', className: warning }, confirmed: { label: 'Đã xác nhận', className: info },
  in_progress: { label: 'Đang thực hiện', className: info }, completed: { label: 'Hoàn thành', className: success }, cancelled: { label: 'Đã hủy', className: danger },
}
export const shipmentStatusConfig: Record<string, StatusStyle> = {
  not_created: { label: 'Chưa tạo vận đơn', className: neutral }, waiting_pickup: { label: 'Chờ lấy hàng', className: warning },
  picked_up: { label: 'Đã lấy hàng', className: info },
  pending: { label: 'Chờ lấy hàng', className: warning }, ready_to_pick: { label: 'Sẵn sàng lấy', className: info },
  picking: { label: 'Đang lấy hàng', className: info }, in_transit: { label: 'Đang vận chuyển', className: info },
  out_for_delivery: { label: 'Đang giao', className: info }, delivered: { label: 'Đã giao', className: success },
  delivery_failed: { label: 'Giao thất bại', className: danger }, returning: { label: 'Đang trả hàng', className: warning }, cancelled: { label: 'Đã hủy', className: neutral },
  waiting_return: { label: 'Chờ trả hàng', className: warning }, returned: { label: 'Đã trả hàng', className: neutral }, exception: { label: 'Ngoại lệ', className: danger },
}
export const genericStatusConfig: Record<string, StatusStyle> = {
  active: { label: 'Đang hoạt động', className: success },
  inactive: { label: 'Tạm ẩn', className: neutral },
  visible: { label: 'Đang hiển thị', className: success },
  hidden: { label: 'Đã ẩn', className: neutral },
  low_stock: { label: 'Sắp hết', className: warning },
  out_of_stock: { label: 'Hết hàng', className: danger },
}

export function statusStyle(status: string | null | undefined, config: Record<string, StatusStyle>): StatusStyle {
  return status && config[status] ? config[status] : { label: status || 'Chưa có', className: neutral }
}
