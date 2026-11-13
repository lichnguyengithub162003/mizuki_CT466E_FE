<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ArrowLeft, RefreshCw } from '@lucide/vue'
import { getAdminDetail } from '@/api/adminApi'
import type { AdminOrderListRecord } from '@/types/admin'

const route = useRoute()
const id = computed(() => Number(route.params.id))
const order = ref<AdminOrderListRecord | null>(null)
const loading = ref(true)
const error = ref('')
let sequence = 0
const affected = computed(() => new Set(order.value?.brand_attention?.affected_item_ids ?? []))

async function load(): Promise<void> {
  const current = ++sequence
  loading.value = true; error.value = ''
  try {
    const result = await getAdminDetail<AdminOrderListRecord>('orders', id.value)
    if (current === sequence) order.value = result
  } catch { if (current === sequence) error.value = 'Không thể tải chi tiết đơn hàng.' }
  finally { if (current === sequence) loading.value = false }
}
watch(id, () => { order.value = null; void load() }, { immediate: true })
onBeforeUnmount(() => { sequence++ })
</script>

<template>
  <section class="min-w-0 space-y-4 pb-8" data-testid="admin-order-review"><RouterLink to="/admin/orders" class="inline-flex items-center gap-2 text-sm font-semibold text-primary-700"><ArrowLeft class="size-4" />Danh sách đơn hàng</RouterLink><div v-if="loading" role="status" class="rounded-2xl bg-white p-6 text-sm text-muted-foreground">Đang tải đơn hàng…</div><div v-else-if="error" role="alert" class="rounded-2xl bg-white p-6 text-sm text-red-800">{{ error }} <button type="button" class="font-semibold text-primary-700" @click="load"><RefreshCw class="inline size-4" /> Thử lại</button></div><template v-else-if="order"><header class="rounded-2xl bg-white p-5 shadow-xs ring-1 ring-black/[0.05]"><p class="text-xs font-semibold uppercase tracking-[0.14em] text-primary-600">Chi tiết đơn hàng</p><h1 class="mt-1 text-xl font-semibold text-primary-950">{{ order.order_number }}</h1><p class="mt-2 text-sm text-primary-800">{{ order.status_label }} · {{ order.customer.name || 'Khách hàng' }} · {{ Number(order.total_amount).toLocaleString('vi-VN') }} ₫</p></header><section v-if="order.brand_attention" class="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950" role="status" data-brand-order-attention><h2 class="font-semibold">Cần rà soát thương hiệu</h2><p class="mt-1 leading-6">{{ order.brand_attention.admin_notice }}</p><p class="mt-2 text-xs">Các dòng hàng bị ảnh hưởng được đánh dấu bên dưới. Trạng thái đơn và thanh toán chưa thay đổi tự động.</p><RouterLink v-if="order.brand_attention.requires_review" to="/admin/refunds" class="mt-3 inline-flex font-semibold text-primary-800 underline">Xem quy trình hoàn tiền</RouterLink></section><section class="overflow-hidden rounded-2xl bg-white shadow-xs ring-1 ring-black/[0.05]"><h2 class="border-b border-border/70 px-5 py-4 text-sm font-semibold text-primary-950">Sản phẩm trong đơn</h2><ul class="divide-y divide-border/60"><li v-for="item in order.items" :key="item.id" class="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm" :class="affected.has(item.id) ? 'bg-amber-50/60' : ''"><span class="min-w-0 font-medium text-primary-950">{{ item.product_name }}</span><span v-if="affected.has(item.id)" class="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">Thương hiệu cần rà soát</span></li></ul></section></template></section>
</template>
