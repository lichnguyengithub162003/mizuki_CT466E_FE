<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { ChevronRight, MapPin, Star } from '@lucide/vue'
import AdminStatusBadge from './AdminStatusBadge.vue'
import AdminThumbnail from './AdminThumbnail.vue'
import type { AdminModule, AdminRecord } from '@/types/admin'

const props = defineProps<{
  module: AdminModule
  rows: AdminRecord[]
  detailBase?: string
  shippingOnly?: boolean
}>()

const domain = computed(() => props.shippingOnly ? 'shipping' : props.module)
const money = (value: unknown) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(value || 0))
const dateTime = (value: unknown) => value ? new Date(String(value)).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—'
const dateOnly = (value: unknown) => value ? new Date(String(value)).toLocaleDateString('vi-VN') : '—'
const timeOnly = (value: unknown) => value ? new Date(String(value)).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—'
const firstImage = (row: AdminRecord) => row.items?.[0]?.image_url || row.entity_image_url || row.service?.image_url || row.image_url || row.logo_url || row.avatar || (Array.isArray(row.images) ? row.images[0]?.image_url ?? row.images[0] : null)
const detail = (row: AdminRecord) => props.shippingOnly ? `/admin/orders/${row.id}` : props.detailBase ? `${props.detailBase}/${row.id}` : ''
const itemCount = (row: AdminRecord) => Array.isArray(row.items) ? row.items.length : 0
const reviewSubject = (row: AdminRecord) => row.product?.name || row.service?.name || 'Nội dung đã đánh giá'
const paymentLabel = (method: unknown) => ({ cash: 'Tiền mặt', vnpay: 'VNPay', wallet: 'Ví Mizuki', bank_transfer: 'Chuyển khoản' } as Record<string, string>)[String(method)] || String(method || '—')
</script>

<template>
  <div class="hidden overflow-x-auto rounded-2xl bg-surface shadow-xs md:block">
    <table class="w-full min-w-[58rem] border-collapse text-left text-body-sm">
      <thead class="bg-primary-50/80 text-caption text-muted-foreground">
        <tr v-if="domain === 'orders'">
          <th class="px-5 py-3 font-medium">Đơn hàng</th><th class="px-4 py-3 font-medium">Nhận hàng</th><th class="px-4 py-3 font-medium">Tổng tiền</th><th class="px-4 py-3 font-medium">Trạng thái đơn</th><th class="px-4 py-3 font-medium">Thanh toán</th><th class="px-4 py-3 font-medium">Đặt lúc</th><th class="px-4 py-3"><span class="sr-only">Thao tác</span></th>
        </tr>
        <tr v-else-if="domain === 'shipping'">
          <th class="px-5 py-3 font-medium">Đơn hàng</th><th class="px-4 py-3 font-medium">Khách hàng</th><th class="px-4 py-3 font-medium">Chi nhánh</th><th class="px-4 py-3 font-medium">Đơn vị vận chuyển</th><th class="px-4 py-3 font-medium">Mã vận đơn</th><th class="px-4 py-3 font-medium">Trạng thái</th><th class="px-4 py-3 font-medium">Cập nhật</th><th class="px-4 py-3"><span class="sr-only">Thao tác</span></th>
        </tr>
        <tr v-else-if="domain === 'refunds'">
          <th class="px-5 py-3 font-medium">Yêu cầu hoàn tiền</th><th class="px-4 py-3 font-medium">Khách hàng</th><th class="px-4 py-3 font-medium">Số tiền</th><th class="px-4 py-3 font-medium">Lý do</th><th class="px-4 py-3 font-medium">Ngày yêu cầu</th><th class="px-4 py-3 font-medium">Trạng thái</th><th class="px-4 py-3"><span class="sr-only">Thao tác</span></th>
        </tr>
        <tr v-else-if="domain === 'appointments'">
          <th class="px-5 py-3 font-medium">Lịch hẹn</th><th class="px-4 py-3 font-medium">Khách hàng</th><th class="px-4 py-3 font-medium">Dịch vụ</th><th class="px-4 py-3 font-medium">Chi nhánh</th><th class="px-4 py-3 font-medium">Ngày & giờ</th><th class="px-4 py-3 font-medium">Kỹ thuật viên</th><th class="px-4 py-3 font-medium">Trạng thái</th><th class="px-4 py-3"><span class="sr-only">Thao tác</span></th>
        </tr>
        <tr v-else-if="domain === 'customers'">
          <th class="px-5 py-3 font-medium">Khách hàng</th><th class="px-4 py-3 font-medium">Điện thoại</th><th class="px-4 py-3 font-medium">Email</th><th class="px-4 py-3 font-medium">Đơn hàng</th><th class="px-4 py-3 font-medium">Lịch hẹn</th><th class="px-4 py-3 font-medium">Tham gia</th><th class="px-4 py-3"><span class="sr-only">Thao tác</span></th>
        </tr>
        <tr v-else-if="domain === 'products'">
          <th class="px-5 py-3 font-medium">Sản phẩm</th><th class="px-4 py-3 font-medium">Danh mục</th><th class="px-4 py-3 font-medium">Thương hiệu</th><th class="px-4 py-3 font-medium">Biến thể</th><th class="px-4 py-3 font-medium">Trạng thái</th><th class="px-4 py-3"><span class="sr-only">Thao tác</span></th>
        </tr>
        <tr v-else-if="domain === 'categories'">
          <th class="px-5 py-3 font-medium">Danh mục</th><th class="px-4 py-3 font-medium">Slug</th><th class="px-4 py-3 font-medium">Danh mục cha</th><th class="px-4 py-3 font-medium">Sản phẩm</th><th class="px-4 py-3 font-medium">Trạng thái</th><th class="px-4 py-3"><span class="sr-only">Thao tác</span></th>
        </tr>
        <tr v-else-if="domain === 'brands'">
          <th class="px-5 py-3 font-medium">Thương hiệu</th><th class="px-4 py-3 font-medium">Slug</th><th class="px-4 py-3 font-medium">Sản phẩm</th><th class="px-4 py-3 font-medium">Trạng thái</th><th class="px-4 py-3"><span class="sr-only">Thao tác</span></th>
        </tr>
        <tr v-else-if="domain === 'reviews'">
          <th class="px-5 py-3 font-medium">Đánh giá</th><th class="px-4 py-3 font-medium">Khách hàng</th><th class="px-4 py-3 font-medium">Nội dung</th><th class="px-4 py-3 font-medium">Ngày gửi</th><th class="px-4 py-3 font-medium">Hiển thị</th><th class="px-4 py-3"><span class="sr-only">Thao tác</span></th>
        </tr>
        <tr v-else-if="domain === 'branches'">
          <th class="px-5 py-3 font-medium">Chi nhánh</th><th class="px-4 py-3 font-medium">Địa chỉ</th><th class="px-4 py-3 font-medium">Điện thoại</th><th class="px-4 py-3 font-medium">Loại</th><th class="px-4 py-3 font-medium">Trạng thái</th><th class="px-4 py-3"><span class="sr-only">Thao tác</span></th>
        </tr>
        <tr v-else-if="domain === 'staff'">
          <th class="px-5 py-3 font-medium">Nhân viên</th><th class="px-4 py-3 font-medium">Vai trò</th><th class="px-4 py-3 font-medium">Chi nhánh</th><th class="px-4 py-3 font-medium">Email</th><th class="px-4 py-3 font-medium">Điện thoại</th><th class="px-4 py-3"><span class="sr-only">Thao tác</span></th>
        </tr>
      </thead>
      <tbody class="divide-y divide-border/60">
        <tr v-for="row in rows" :key="row.id" class="transition-colors hover:bg-surface-subtle/70">
          <template v-if="domain === 'orders'">
            <td class="px-5 py-4"><div class="flex items-center gap-3"><div class="relative"><AdminThumbnail :src="firstImage(row)" :alt="row.items?.[0]?.product_name" :label="row.order_number"/><span v-if="itemCount(row)>1" class="absolute -bottom-1 -right-1 rounded-full bg-primary-800 px-1.5 text-[.625rem] text-white">+{{ itemCount(row)-1 }}</span></div><div><RouterLink :to="detail(row)" class="font-medium text-primary-900 hover:underline">{{ row.order_number }}</RouterLink><p class="mt-1 text-caption text-muted-foreground">{{ row.customer?.name || 'Khách vãng lai' }}</p></div></div></td>
            <td class="px-4 py-4"><p class="font-medium">{{ row.delivery_method === 'delivery' ? 'Giao hàng' : 'Nhận tại chi nhánh' }}</p><p class="mt-1 text-caption text-muted-foreground">{{ row.branch?.name }}</p></td>
            <td class="px-4 py-4 font-medium">{{ money(row.total_amount) }}</td><td class="px-4 py-4"><AdminStatusBadge :status="row.status" type="order" :label="row.status_label"/></td><td class="px-4 py-4 text-center"><AdminStatusBadge :status="row.payment_status || 'pending'" type="payment" :label="row.payment_status_label || 'Chờ thanh toán'"/><p class="mt-1 text-center text-caption text-muted-foreground">{{ paymentLabel(row.payment_method) }}</p></td><td class="px-4 py-4 text-muted-foreground">{{ dateTime(row.placed_at || row.created_at) }}</td>
          </template>
          <template v-else-if="domain === 'shipping'">
            <td class="px-5 py-4"><div class="flex items-center gap-3"><AdminThumbnail :src="firstImage(row)" :alt="row.items?.[0]?.product_name"/><RouterLink :to="detail(row)" class="font-medium text-primary-900 hover:underline">{{ row.order_number }}</RouterLink></div></td><td class="px-4 py-4">{{ row.customer?.name || '—' }}</td><td class="px-4 py-4">{{ row.branch?.name || '—' }}</td><td class="px-4 py-4 uppercase">{{ row.shipment?.provider || '—' }}</td><td class="px-4 py-4 font-medium">{{ row.shipment?.tracking_code || 'Chưa tạo' }}</td><td class="px-4 py-4"><AdminStatusBadge :status="row.shipment?.logistics_stage || 'not_created'" type="shipment" :label="row.shipment?.logistics_stage_label || 'Chưa tạo vận đơn'"/><p v-if="row.shipment?.raw_status" class="mt-1 text-caption text-muted-foreground">GHN: {{ row.shipment.raw_status }}</p></td><td class="px-4 py-4 text-muted-foreground">{{ dateTime(row.shipment?.updated_at || row.updated_at) }}</td>
          </template>
          <template v-else-if="domain === 'refunds'">
            <td class="px-5 py-4"><div class="flex items-center gap-3"><div class="relative"><AdminThumbnail kind="refund" :src="row.image_url" :label="row.refund_number"/><span v-if="Number(row.item_count)>1" class="absolute -bottom-1 -right-1 rounded-full bg-primary-800 px-1.5 text-[.625rem] text-white">+{{ Number(row.item_count)-1 }}</span></div><div><RouterLink :to="detail(row)" class="font-medium text-primary-900 hover:underline">{{ row.refund_number }}</RouterLink><p class="mt-1 text-caption text-muted-foreground">Đơn {{ row.order?.order_number }}</p></div></div></td><td class="px-4 py-4">{{ row.customer?.name || '—' }}</td><td class="px-4 py-4 font-medium">{{ money(row.approved_amount ?? row.requested_amount) }}</td><td class="max-w-64 px-4 py-4"><p class="line-clamp-2">{{ row.reason_type_label || row.reason || '—' }}</p></td><td class="px-4 py-4 text-muted-foreground">{{ dateTime(row.created_at) }}</td><td class="px-4 py-4"><AdminStatusBadge :status="row.status" type="refund" :label="row.status_label"/></td>
          </template>
          <template v-else-if="domain === 'appointments'">
            <td class="px-5 py-4"><div class="flex items-center gap-3"><AdminThumbnail kind="service" :src="row.service?.image_url" :alt="row.service?.name" :label="row.appointment_number"/><div><RouterLink :to="detail(row)" class="font-medium text-primary-900 hover:underline">{{ row.appointment_number }}</RouterLink><p class="mt-1 text-caption text-muted-foreground">{{ row.service?.duration_minutes }} phút</p></div></div></td><td class="px-4 py-4"><p>{{ row.customer?.name || '—' }}</p><p class="mt-1 text-caption text-muted-foreground">{{ row.customer?.phone }}</p></td><td class="px-4 py-4 font-medium">{{ row.service?.name || '—' }}</td><td class="px-4 py-4">{{ row.branch?.name || '—' }}</td><td class="px-4 py-4"><p class="font-medium">{{ dateOnly(row.starts_at) }}</p><p class="mt-1 text-caption text-muted-foreground">{{ timeOnly(row.starts_at) }}–{{ timeOnly(row.ends_at) }}</p></td><td class="px-4 py-4">{{ row.technician?.name || 'Chưa phân công' }}</td><td class="px-4 py-4"><AdminStatusBadge :status="row.status" type="appointment" :label="row.status_label"/></td>
          </template>
          <template v-else-if="domain === 'customers'">
            <td class="px-5 py-4"><div class="flex items-center gap-3"><AdminThumbnail kind="avatar" :src="row.avatar" :label="row.name"/><RouterLink :to="detail(row)" class="font-medium text-primary-900 hover:underline">{{ row.name }}</RouterLink></div></td><td class="px-4 py-4">{{ row.phone || '—' }}</td><td class="px-4 py-4">{{ row.email }}</td><td class="px-4 py-4">{{ row.order_count }}</td><td class="px-4 py-4">{{ row.appointment_count }}</td><td class="px-4 py-4 text-muted-foreground">{{ dateOnly(row.created_at) }}</td>
          </template>
          <template v-else-if="domain === 'products'">
            <td class="px-5 py-4"><div class="flex items-center gap-3"><AdminThumbnail :src="row.image_url" :alt="row.name" :label="row.name"/><div><RouterLink :to="detail(row)" class="font-medium text-primary-900 hover:underline">{{ row.name }}</RouterLink><p class="mt-1 text-caption text-muted-foreground">{{ row.slug }}</p></div></div></td><td class="px-4 py-4">{{ row.category?.name || '—' }}</td><td class="px-4 py-4">{{ row.brand?.name || '—' }}</td><td class="px-4 py-4">{{ row.variant_count }}</td><td class="px-4 py-4"><AdminStatusBadge :status="row.is_active ? 'active' : 'inactive'" :label="row.is_active ? 'Đang hoạt động' : 'Tạm ẩn'"/></td>
          </template>
          <template v-else-if="domain === 'categories'">
            <td class="px-5 py-4"><div class="flex items-center gap-3"><AdminThumbnail kind="category" :src="row.image_url" :alt="row.name" :label="row.name"/><RouterLink :to="detail(row)" class="font-medium text-primary-900 hover:underline">{{ row.name }}</RouterLink></div></td><td class="px-4 py-4 text-muted-foreground">{{ row.slug }}</td><td class="px-4 py-4">{{ row.parent?.name || 'Danh mục gốc' }}</td><td class="px-4 py-4">{{ row.product_count }}</td><td class="px-4 py-4"><AdminStatusBadge :status="row.is_active ? 'active' : 'inactive'" :label="row.is_active ? 'Đang hoạt động' : 'Tạm ẩn'"/></td>
          </template>
          <template v-else-if="domain === 'brands'">
            <td class="px-5 py-4"><div class="flex items-center gap-3"><AdminThumbnail kind="brand" :src="row.logo_url || row.image_url" :alt="row.name" :label="row.name"/><RouterLink :to="detail(row)" class="font-medium text-primary-900 hover:underline">{{ row.name }}</RouterLink></div></td><td class="px-4 py-4 text-muted-foreground">{{ row.slug }}</td><td class="px-4 py-4">{{ row.product_count }}</td><td class="px-4 py-4"><AdminStatusBadge :status="row.is_active ? 'active' : 'inactive'" :label="row.is_active ? 'Đang hoạt động' : 'Tạm ẩn'"/></td>
          </template>
          <template v-else-if="domain === 'reviews'">
            <td class="px-5 py-4"><div class="flex items-center gap-3"><AdminThumbnail kind="review" :src="row.entity_image_url" :label="reviewSubject(row)"/><div><p class="font-medium">{{ reviewSubject(row) }}</p><p class="mt-1 flex items-center gap-1 text-caption text-warning"><Star class="size-3.5 fill-current"/>{{ row.rating }}/5</p></div></div></td><td class="px-4 py-4">{{ row.customer?.name || row.author_name || 'Ẩn danh' }}</td><td class="max-w-80 px-4 py-4"><p v-if="row.title" class="font-medium">{{ row.title }}</p><p class="mt-1 line-clamp-2 text-muted-foreground">{{ row.comment || 'Không có nội dung' }}</p></td><td class="px-4 py-4 text-muted-foreground">{{ dateOnly(row.created_at || row.source_date) }}</td><td class="px-4 py-4"><AdminStatusBadge :status="row.is_visible ? 'visible' : 'hidden'" :label="row.is_visible ? 'Đang hiển thị' : 'Đã ẩn'"/></td>
          </template>
          <template v-else-if="domain === 'branches'">
            <td class="px-5 py-4"><div class="flex items-center gap-3"><AdminThumbnail kind="branch" :label="row.name"/><div><RouterLink :to="detail(row)" class="font-medium text-primary-900 hover:underline">{{ row.name }}</RouterLink><p class="mt-1 text-caption text-muted-foreground">{{ row.code }}</p></div></div></td><td class="max-w-80 px-4 py-4"><span class="inline-flex gap-1.5"><MapPin class="mt-0.5 size-4 shrink-0 text-primary-600"/>{{ row.address || '—' }}</span></td><td class="px-4 py-4">{{ row.phone || '—' }}</td><td class="px-4 py-4">{{ row.branch_type_label || row.branch_type }}</td><td class="px-4 py-4"><AdminStatusBadge :status="row.is_active ? 'active' : 'inactive'" :label="row.is_active ? 'Đang hoạt động' : 'Tạm ngưng'"/></td>
          </template>
          <template v-else-if="domain === 'staff'">
            <td class="px-5 py-4"><div class="flex items-center gap-3"><AdminThumbnail kind="avatar" :src="row.avatar" :label="row.name"/><div><RouterLink :to="detail(row)" class="font-medium text-primary-900 hover:underline">{{ row.name }}</RouterLink><p v-if="row.job_title" class="mt-1 text-caption text-muted-foreground">{{ row.job_title }}</p></div></div></td><td class="px-4 py-4">{{ row.role_label || row.role }}</td><td class="px-4 py-4">{{ row.branch?.name || 'Toàn hệ thống' }}</td><td class="px-4 py-4">{{ row.email }}</td><td class="px-4 py-4">{{ row.phone || '—' }}</td>
          </template>
          <td class="px-4 py-4 text-right"><RouterLink v-if="detail(row)" :to="detail(row)" class="inline-flex size-9 items-center justify-center rounded-lg text-primary-700 hover:bg-primary-50" :aria-label="`Xem chi tiết ${row.order_number || row.refund_number || row.appointment_number || row.name || row.id}`"><ChevronRight class="size-4"/></RouterLink></td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="grid gap-3 md:hidden">
    <article v-for="row in rows" :key="row.id" class="rounded-2xl bg-surface p-4 shadow-xs">
      <div class="flex items-start gap-3">
        <AdminThumbnail
          :kind="domain === 'customers' || domain === 'staff' ? 'avatar' : domain === 'branches' ? 'branch' : domain === 'brands' ? 'brand' : domain === 'categories' ? 'category' : domain === 'appointments' ? 'service' : domain === 'refunds' ? 'refund' : domain === 'reviews' ? 'review' : 'product'"
          :src="firstImage(row)"
          :label="row.name || row.order_number || row.refund_number || row.appointment_number || reviewSubject(row)"
        />
        <div class="min-w-0 flex-1">
          <RouterLink :to="detail(row)" class="font-medium text-primary-900">{{ row.order_number || row.refund_number || row.appointment_number || row.name || reviewSubject(row) }}</RouterLink>
          <p class="mt-1 line-clamp-2 text-body-sm text-muted-foreground">{{ row.customer?.name || row.email || row.service?.name || row.comment || row.address || row.category?.name || row.branch?.name || row.slug }}</p>
        </div>
        <ChevronRight class="size-4 shrink-0 text-muted-foreground"/>
      </div>
      <div class="mt-3 flex flex-wrap items-center gap-2 text-caption text-muted-foreground">
        <AdminStatusBadge v-if="row.status" :status="domain === 'shipping' ? row.shipment?.status : row.status" :type="domain === 'refunds' ? 'refund' : domain === 'appointments' ? 'appointment' : domain === 'orders' ? 'order' : domain === 'shipping' ? 'shipment' : undefined" :label="domain === 'shipping' ? row.shipment?.status_label : row.status_label"/>
        <AdminStatusBadge v-else-if="typeof row.is_active === 'boolean'" :status="row.is_active ? 'active' : 'inactive'" :label="row.is_active ? 'Đang hoạt động' : 'Tạm ẩn'"/>
        <AdminStatusBadge v-else-if="typeof row.is_visible === 'boolean'" :status="row.is_visible ? 'visible' : 'hidden'" :label="row.is_visible ? 'Đang hiển thị' : 'Đã ẩn'"/>
        <span v-if="row.total_amount !== undefined">{{ money(row.total_amount) }}</span><span v-if="row.requested_amount !== undefined">{{ money(row.approved_amount ?? row.requested_amount) }}</span><span v-if="row.starts_at">{{ dateTime(row.starts_at) }}</span><span v-if="row.product_count !== undefined">{{ row.product_count }} sản phẩm</span><span v-if="row.role_label">{{ row.role_label }}</span>
      </div>
    </article>
  </div>
</template>
