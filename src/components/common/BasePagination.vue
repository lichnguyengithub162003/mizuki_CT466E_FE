<script setup lang="ts">
import { computed } from 'vue'
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import { cn } from '@/utils/cn'
import BaseButton from './BaseButton.vue'

const props = withDefaults(
  defineProps<{
    currentPage: number
    totalPages: number
    disabled?: boolean
    compactOnMobile?: boolean
    label?: string
    previousLabel?: string
    nextLabel?: string
    class?: string
  }>(),
  {
    disabled: false,
    compactOnMobile: true,
    label: 'Phân trang',
    previousLabel: 'Trang trước',
    nextLabel: 'Trang sau',
    class: undefined,
  },
)

const emit = defineEmits<{
  'update:currentPage': [page: number]
  change: [page: number]
}>()

const safeTotalPages = computed(() => Math.max(1, props.totalPages))
const visiblePages = computed<number[]>(() => {
  if (safeTotalPages.value <= 5) {
    return Array.from({ length: safeTotalPages.value }, (_, index) => index + 1)
  }
  const start = Math.min(Math.max(1, props.currentPage - 2), safeTotalPages.value - 4)
  return Array.from({ length: 5 }, (_, index) => start + index)
})

function goToPage(page: number): void {
  if (props.disabled) return
  const nextPage = Math.min(Math.max(1, page), safeTotalPages.value)
  if (nextPage === props.currentPage) return
  emit('update:currentPage', nextPage)
  emit('change', nextPage)
}
</script>

<template>
  <nav :class="cn('flex items-center justify-between gap-3 sm:justify-center', props.class)" :aria-label="props.label">
    <BaseButton
      variant="outline"
      size="icon"
      :disabled="props.disabled || props.currentPage <= 1"
      :aria-label="props.previousLabel"
      @click="goToPage(props.currentPage - 1)"
    >
      <ChevronLeft class="size-4" aria-hidden="true" />
    </BaseButton>
    <div :class="cn('items-center gap-2', props.compactOnMobile ? 'hidden sm:flex' : 'flex')">
      <BaseButton
        v-for="page in visiblePages"
        :key="page"
        :variant="page === props.currentPage ? 'primary' : 'outline'"
        size="icon"
        :disabled="props.disabled"
        :aria-label="`Trang ${page}`"
        :aria-current="page === props.currentPage ? 'page' : undefined"
        @click="goToPage(page)"
      >
        {{ page }}
      </BaseButton>
    </div>
    <span v-if="props.compactOnMobile" class="text-body-sm text-muted-foreground sm:hidden">
      {{ props.currentPage }} / {{ safeTotalPages }}
    </span>
    <BaseButton
      variant="outline"
      size="icon"
      :disabled="props.disabled || props.currentPage >= safeTotalPages"
      :aria-label="props.nextLabel"
      @click="goToPage(props.currentPage + 1)"
    >
      <ChevronRight class="size-4" aria-hidden="true" />
    </BaseButton>
  </nav>
</template>
