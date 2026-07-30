<script setup lang="ts">
import { Heart, Minus, PackageOpen, Plus, Trash2 } from '@lucide/vue'
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { ROUTE_NAMES } from '@/constants/routes'
import type { CartItem } from '@/types/customer'
import { cn } from '@/utils/cn'

const props = defineProps<{
  item: CartItem
}>()

const emit = defineEmits<{
  toggle: [id: string]
  increment: [id: string]
  decrement: [id: string]
  remove: [id: string]
  moveToFavorites: [id: string]
  changeVariant: [id: string]
  changeBranch: [id: string]
}>()

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
})

const isAvailable = computed(() => props.item.stockState === 'available')

const toneClasses: Record<CartItem['product']['tone'], string> = {
  mint: 'bg-[#e3f1eb]',
  rose: 'bg-[#f3e5e2]',
  sand: 'bg-[#f2eadc]',
  sky: 'bg-[#e4eef2]',
  lilac: 'bg-[#ebe8f5]',
}
</script>

<template>
  <article
    class="rounded-3xl border border-primary-100 bg-white p-4 shadow-xs sm:p-5"
    :aria-labelledby="`cart-name-${props.item.id}`"
    data-cart-item
    :data-cart-stock="props.item.stockState"
  >
    <div class="flex min-w-0 items-start gap-3 sm:gap-4">
      <label class="mt-1 grid size-11 flex-none cursor-pointer place-items-center rounded-xl hover:bg-primary-50">
        <span class="sr-only">Chọn {{ props.item.product.name }}</span>
        <input
          type="checkbox"
          class="size-5 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          :checked="props.item.selected"
          :disabled="!isAvailable"
          :aria-label="`Chọn ${props.item.product.name}`"
          @change="emit('toggle', props.item.id)"
        />
      </label>

      <div :class="cn('grid size-24 flex-none place-items-center rounded-2xl sm:size-28', toneClasses[props.item.product.tone])">
        <PackageOpen class="size-9 text-primary-700 opacity-75" aria-hidden="true" />
      </div>

      <div class="min-w-0 flex-1">
        <p class="text-caption font-semibold uppercase tracking-[0.1em] text-primary-700">
          {{ props.item.product.brand }}
        </p>
        <RouterLink
          :id="`cart-name-${props.item.id}`"
          :to="{ name: ROUTE_NAMES.productDetail, params: { slug: props.item.product.slug } }"
          class="motion-interactive mt-1 block text-body-md font-semibold leading-6 text-primary-950 hover:text-primary-700 focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {{ props.item.product.name }}
        </RouterLink>
        <p class="mt-1 text-caption text-text-secondary">
          {{ props.item.variant.label }}: {{ props.item.variant.value }}
        </p>
        <strong class="mt-2 block text-body-md font-bold text-[#c8423a]">
          {{ currencyFormatter.format(props.item.unitPrice) }}
        </strong>
      </div>
    </div>

    <div
      v-if="!isAvailable"
      class="mt-4 rounded-2xl border border-[#edcbc7] bg-[#fff5f3] p-3"
      role="status"
      data-unavailable-reason
    >
      <p class="text-body-sm font-semibold text-[#8f3733]">{{ props.item.unavailableReason }}</p>
      <p class="mt-1 text-caption text-[#7c514e]">{{ props.item.branchAvailability.label }}</p>
      <div class="mt-3 flex flex-wrap gap-2">
        <button
          v-if="props.item.stockState === 'variant-unavailable'"
          type="button"
          class="motion-interactive min-h-10 rounded-xl border border-[#dcaea9] bg-white px-3 text-body-sm font-semibold text-[#7f3935] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          @click="emit('changeVariant', props.item.id)"
        >
          Đổi biến thể
        </button>
        <button
          v-if="props.item.stockState === 'branch-unavailable'"
          type="button"
          class="motion-interactive min-h-10 rounded-xl border border-[#dcaea9] bg-white px-3 text-body-sm font-semibold text-[#7f3935] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          @click="emit('changeBranch', props.item.id)"
        >
          Đổi chi nhánh
        </button>
        <RouterLink
          :to="{ name: ROUTE_NAMES.products, query: { similarTo: props.item.product.id } }"
          class="motion-interactive inline-flex min-h-10 items-center rounded-xl px-3 text-body-sm font-semibold text-primary-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Tìm sản phẩm tương tự
        </RouterLink>
      </div>
    </div>

    <div class="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-primary-100 pt-4">
      <div
        class="inline-flex h-11 items-center overflow-hidden rounded-xl border border-primary-200 bg-white"
        data-cart-quantity
      >
        <button
          type="button"
          class="motion-interactive grid size-11 place-items-center text-primary-900 hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-35"
          :aria-label="`Giảm số lượng ${props.item.product.name}`"
          :disabled="props.item.quantity <= 1 || !isAvailable"
          @click="emit('decrement', props.item.id)"
        >
          <Minus class="size-4" aria-hidden="true" />
        </button>
        <output
          class="grid min-w-10 place-items-center text-body-sm font-semibold text-primary-950"
          :aria-label="`Số lượng ${props.item.product.name}`"
        >
          {{ props.item.quantity }}
        </output>
        <button
          type="button"
          class="motion-interactive grid size-11 place-items-center text-primary-900 hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-35"
          :aria-label="`Tăng số lượng ${props.item.product.name}`"
          :disabled="!isAvailable"
          @click="emit('increment', props.item.id)"
        >
          <Plus class="size-4" aria-hidden="true" />
        </button>
      </div>

      <div class="flex flex-wrap items-center gap-1">
        <button
          type="button"
          class="motion-interactive inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-body-sm font-medium text-primary-800 hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          :aria-label="`Chuyển ${props.item.product.name} sang yêu thích`"
          @click="emit('moveToFavorites', props.item.id)"
        >
          <Heart class="size-4" aria-hidden="true" />
          <span class="hidden sm:inline">Chuyển sang yêu thích</span>
        </button>
        <button
          type="button"
          class="motion-interactive grid size-10 place-items-center rounded-xl text-[#9b3e3a] hover:bg-[#fff3f1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          :aria-label="`Xóa ${props.item.product.name} khỏi giỏ hàng`"
          @click="emit('remove', props.item.id)"
        >
          <Trash2 class="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  </article>
</template>
