<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/utils/cn'
import BaseSkeleton from '@/components/common/BaseSkeleton.vue'

const props = withDefaults(
  defineProps<{
    rows?: number
    showAvatar?: boolean
    showActions?: boolean
    compact?: boolean
    label?: string
    class?: string
  }>(),
  {
    rows: 4,
    showAvatar: true,
    showActions: true,
    compact: false,
    label: 'Đang tải danh sách',
    class: undefined,
  },
)

const safeRows = computed(() => Math.max(1, Math.min(props.rows, 20)))
</script>

<template>
  <div :class="cn('grid', props.compact ? 'gap-2' : 'gap-3', props.class)" role="status" :aria-label="props.label">
    <div
      v-for="row in safeRows"
      :key="row"
      data-skeleton-row
      class="flex min-w-0 items-center gap-4 rounded-lg border border-border bg-surface p-4"
      aria-hidden="true"
    >
      <BaseSkeleton v-if="props.showAvatar" shape="circle" class="size-10 shrink-0" />
      <div class="min-w-0 flex-1 space-y-2">
        <BaseSkeleton shape="text" class="w-2/3" />
        <BaseSkeleton shape="text" class="w-1/2" />
      </div>
      <BaseSkeleton v-if="props.showActions" class="h-9 w-20 shrink-0" />
    </div>
  </div>
</template>
