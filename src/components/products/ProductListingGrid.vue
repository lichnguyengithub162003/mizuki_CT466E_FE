<script setup lang="ts">
import { computed } from 'vue'
import { AsyncContent, DataGridSkeleton } from '@/components/feedback'
import HomeProductCard from '@/components/home/HomeProductCard.vue'
import type {
  ProductContentState,
  ProductListingProduct,
} from '@/types/products'

const props = withDefaults(
  defineProps<{
    products: readonly ProductListingProduct[]
    state?: ProductContentState
  }>(),
  {
    state: 'success',
  },
)

defineEmits<{
  retry: []
}>()

const asyncError = computed(() =>
  props.state === 'error'
    ? {
        kind: 'server' as const,
        title: 'Chưa thể hiển thị sản phẩm',
        message: 'Nội dung demo gặp gián đoạn. Bạn có thể thử lại ngay.',
        retryable: true,
      }
    : null,
)
</script>

<template>
  <AsyncContent
    :status="props.state"
    :error="asyncError"
    :has-data="props.state === 'success' && props.products.length > 0"
    empty-title="Chưa tìm thấy sản phẩm phù hợp"
    empty-description="Hãy đặt lại một vài bộ lọc để xem thêm lựa chọn."
    @retry="$emit('retry')"
  >
    <template #loading>
      <DataGridSkeleton
        :items="8"
        :columns="4"
        label="Đang tải danh sách sản phẩm"
      />
    </template>

    <div
      class="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4"
      data-testid="product-listing-grid"
    >
      <HomeProductCard
        v-for="product in props.products"
        :key="product.id"
        :product="product"
        data-listing-product
      />
    </div>
  </AsyncContent>
</template>
