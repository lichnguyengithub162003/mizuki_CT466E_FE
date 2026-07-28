<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/utils/cn'
import BaseSkeleton from '@/components/common/BaseSkeleton.vue'

type GridColumns = 1 | 2 | 3 | 4

const props = withDefaults(
  defineProps<{
    items?: number
    columns?: GridColumns
    showImage?: boolean
    showMetadata?: boolean
    label?: string
    class?: string
  }>(),
  {
    items: 6,
    columns: 3,
    showImage: true,
    showMetadata: true,
    label: 'Đang tải lưới dữ liệu',
    class: undefined,
  },
)

const safeItems = computed(() => Math.max(1, Math.min(props.items, 20)))
const columnClasses: Record<GridColumns, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
}
</script>

<template>
  <div
    :class="cn('grid min-w-0 gap-4', columnClasses[props.columns], props.class)"
    role="status"
    :aria-label="props.label"
  >
    <div
      v-for="item in safeItems"
      :key="item"
      data-skeleton-item
      class="min-w-0 rounded-lg border border-border bg-surface p-4"
      aria-hidden="true"
    >
      <BaseSkeleton v-if="props.showImage" class="aspect-[4/3] w-full" />
      <div :class="props.showImage ? 'mt-4 space-y-3' : 'space-y-3'">
        <BaseSkeleton shape="text" class="w-4/5" />
        <BaseSkeleton v-if="props.showMetadata" shape="text" class="w-1/2" />
      </div>
    </div>
  </div>
</template>
