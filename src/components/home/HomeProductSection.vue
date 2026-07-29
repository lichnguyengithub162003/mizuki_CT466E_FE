<script setup lang="ts">
import { computed } from 'vue'
import { AsyncContent, DataGridSkeleton } from '@/components/feedback'
import type { HomeProduct } from '@/types/home'
import HomeProductCard from './HomeProductCard.vue'
import HomeSectionHeader from './HomeSectionHeader.vue'

const props = withDefaults(
  defineProps<{
    title: string
    description?: string
    products: readonly HomeProduct[]
    actionLabel?: string
    loading?: boolean
    empty?: boolean
    error?: string | null
  }>(),
  {
    description: undefined,
    actionLabel: 'Xem tất cả',
    loading: false,
    empty: false,
    error: null,
  },
)

const emit = defineEmits<{
  action: []
  retry: []
  favorite: [product: HomeProduct]
  productAction: [product: HomeProduct]
}>()

const status = computed<'loading' | 'empty' | 'error' | 'success'>(() => {
  if (props.loading) return 'loading'
  if (props.error) return 'error'
  if (props.empty || props.products.length === 0) return 'empty'
  return 'success'
})

const asyncError = computed(() =>
  props.error
    ? {
        kind: 'server' as const,
        title: 'Không thể hiển thị sản phẩm',
        message: props.error,
        retryable: true,
      }
    : null,
)
</script>

<template>
  <section>
    <HomeSectionHeader
      :title="props.title"
      :description="props.description"
      :action-label="props.actionLabel"
      @action="emit('action')"
    />
    <AsyncContent
      class="mt-5"
      :status="status"
      :error="asyncError"
      :has-data="status === 'success'"
      empty-title="Chưa có sản phẩm phù hợp"
      empty-description="Sản phẩm minh họa sẽ xuất hiện tại đây khi có dữ liệu."
      @retry="emit('retry')"
    >
      <template #loading>
        <DataGridSkeleton
          :items="4"
          :columns="4"
          label="Đang tải danh sách sản phẩm"
          class="mt-5"
        />
      </template>
      <div class="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        <HomeProductCard
          v-for="product in props.products"
          :key="product.id"
          :product="product"
          @favorite="emit('favorite', $event)"
          @action="emit('productAction', $event)"
        />
      </div>
    </AsyncContent>
  </section>
</template>
