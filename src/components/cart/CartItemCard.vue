<script setup lang="ts">
import { AlertTriangle, Minus, PackageOpen, Plus, Trash2 } from '@lucide/vue'
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { ROUTE_NAMES } from '@/constants/routes'
import type { CustomerCartItem } from '@/types/cart'

const props = withDefaults(defineProps<{
  item: CustomerCartItem
  pending?: boolean
  selected?: boolean
}>(), {
  pending: false,
  selected: true,
})

const emit = defineEmits<{
  toggle: [id: number]
  increment: [id: number]
  decrement: [id: number]
  remove: [id: number]
}>()

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
})
const unavailable = computed(() => props.item.stockWarning || props.item.availableQuantity <= 0)
const atInventoryLimit = computed(() => props.item.quantity >= props.item.availableQuantity)
</script>

<template>
  <article
    class="group rounded-xl border border-primary-100 bg-white p-2.5 shadow-xs transition-[border-color,box-shadow] duration-200 hover:border-primary-200 hover:shadow-sm min-[85rem]:rounded-2xl min-[85rem]:p-4"
    :aria-labelledby="`cart-item-name-${props.item.id}`"
    data-cart-item
    :data-cart-stock="unavailable ? 'unavailable' : 'available'"
  >
    <div class="grid min-w-0 grid-cols-[auto_4.25rem_minmax(0,1fr)] items-center gap-2 min-[85rem]:grid-cols-[auto_5.5rem_minmax(12rem,1fr)_7.25rem_7.25rem_7.5rem_2.5rem] min-[85rem]:gap-4">
      <label class="-ml-1 grid size-10 cursor-pointer place-items-center rounded-lg transition-colors hover:bg-primary-50 min-[85rem]:ml-0 min-[85rem]:size-8" :class="unavailable && 'cursor-not-allowed opacity-50'">
        <span class="sr-only">Chọn {{ props.item.product.name }}</span>
        <input type="checkbox" class="size-5 accent-primary" :checked="props.selected" :disabled="unavailable" :aria-label="`Chọn ${props.item.product.name}`" @change="emit('toggle', props.item.id)" />
      </label>

      <RouterLink :to="{ name: ROUTE_NAMES.productDetail, params: { slug: props.item.product.slug } }" class="grid size-17 place-items-center overflow-hidden rounded-lg border border-primary-100 bg-primary-50 min-[85rem]:size-[5.5rem] min-[85rem]:rounded-xl" :aria-label="`Xem ${props.item.product.name}`">
        <img v-if="props.item.product.imageUrl" :src="props.item.product.imageUrl" :alt="props.item.product.name" class="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
        <PackageOpen v-else class="size-7 text-primary-600/70" aria-hidden="true" />
      </RouterLink>

      <div class="min-w-0 self-start pt-0.5 min-[85rem]:self-center min-[85rem]:pt-0">
        <RouterLink :id="`cart-item-name-${props.item.id}`" :to="{ name: ROUTE_NAMES.productDetail, params: { slug: props.item.product.slug } }" class="line-clamp-2 text-body-sm font-semibold leading-5 text-primary-950 transition-colors hover:text-primary-700 min-[85rem]:text-body-md">
          {{ props.item.product.name }}
        </RouterLink>
        <p class="mt-0.5 text-[0.6875rem] text-text-secondary min-[85rem]:mt-1 min-[85rem]:text-caption">{{ props.item.variant.name }} <span aria-hidden="true" class="mx-1 text-primary-200">•</span> SKU: {{ props.item.variant.sku }}</p>
        <p class="mt-1.5 text-body-sm font-semibold text-[#bd443d] min-[85rem]:hidden">{{ currencyFormatter.format(props.item.variant.effectivePrice) }} <span class="font-normal text-text-muted">/ sp</span></p>
        <div v-if="unavailable" class="mt-1.5 flex items-start gap-1.5 text-caption leading-4 text-[#8f3733]" role="status" data-unavailable-reason><AlertTriangle class="mt-0.5 size-3.5 flex-none" aria-hidden="true" /><span>Chỉ còn {{ props.item.availableQuantity }} sản phẩm tại chi nhánh.</span></div>
        <p v-else-if="atInventoryLimit" class="mt-1.5 flex items-center gap-1.5 text-caption text-[#78551d]" data-inventory-limit><AlertTriangle class="size-3.5 flex-none" aria-hidden="true" />Đã đạt số lượng tối đa.</p>
      </div>

      <div class="col-span-2 col-start-2 flex flex-wrap items-center justify-between gap-2 border-t border-primary-100 pt-2 min-[85rem]:contents min-[85rem]:border-0 min-[85rem]:pt-0">
        <div class="hidden min-[85rem]:block" data-unit-price>
          <p class="text-[0.6875rem] font-medium text-text-secondary">Đơn giá</p>
          <strong class="mt-1 block text-body-sm text-primary-950">{{ currencyFormatter.format(props.item.variant.effectivePrice) }}</strong>
        </div>

        <div>
          <p class="mb-1 text-[0.6875rem] font-medium text-text-secondary min-[85rem]:text-center">Số lượng</p>
          <div class="inline-flex h-8 items-center overflow-hidden rounded-lg border border-primary-200 bg-white min-[85rem]:h-9" data-cart-quantity>
            <button type="button" class="grid size-8 place-items-center text-primary-900 transition-colors hover:bg-primary-50 disabled:opacity-35 min-[85rem]:size-9" :disabled="props.item.quantity <= 1 || unavailable || props.pending" :aria-label="`Giảm số lượng ${props.item.product.name}`" @click="emit('decrement', props.item.id)"><Minus class="size-3.5" aria-hidden="true" /></button>
            <output class="grid min-w-7 place-items-center text-body-sm font-semibold text-primary-950 min-[85rem]:min-w-8">{{ props.item.quantity }}</output>
            <button type="button" class="grid size-8 place-items-center text-primary-900 transition-colors hover:bg-primary-50 disabled:bg-surface-subtle disabled:text-text-muted min-[85rem]:size-9" :disabled="unavailable || props.pending || atInventoryLimit" :aria-label="`Tăng số lượng ${props.item.product.name}`" @click="emit('increment', props.item.id)"><Plus class="size-3.5" aria-hidden="true" /></button>
          </div>
        </div>

        <div class="text-right min-[85rem]:text-left">
          <p class="text-[0.6875rem] font-medium text-text-secondary">Thành tiền</p>
          <strong class="mt-0.5 block whitespace-nowrap text-body-sm font-bold text-[#bd443d] min-[85rem]:mt-1 min-[85rem]:text-body-md" data-item-subtotal>{{ currencyFormatter.format(props.item.subtotal) }}</strong>
        </div>

        <button type="button" class="inline-flex min-h-8 items-center gap-1 rounded-lg px-1.5 text-caption font-medium text-[#923b37] transition-colors hover:bg-[#fff3f1] disabled:opacity-50 min-[85rem]:grid min-[85rem]:size-9 min-[85rem]:place-items-center min-[85rem]:p-0" :disabled="props.pending" :aria-label="`Xóa ${props.item.product.name} khỏi giỏ hàng`" @click="emit('remove', props.item.id)"><Trash2 class="size-3.5 min-[85rem]:size-4" aria-hidden="true" /><span class="min-[85rem]:hidden">Xóa</span></button>
      </div>
    </div>
  </article>
</template>
