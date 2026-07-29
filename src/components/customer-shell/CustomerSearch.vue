<script setup lang="ts">
import { Search, X } from '@lucide/vue'
import { ref } from 'vue'
import { cn } from '@/utils/cn'

const props = withDefaults(
  defineProps<{
    compact?: boolean
    class?: string
  }>(),
  {
    compact: false,
    class: undefined,
  },
)

const emit = defineEmits<{
  submit: [query: string]
}>()

const query = ref('')

function submitSearch(): void {
  emit('submit', query.value.trim())
}
</script>

<template>
  <form
    role="search"
    :class="cn('relative w-full', props.class)"
    @submit.prevent="submitSearch"
  >
    <label class="sr-only" :for="props.compact ? 'customer-search-mobile' : 'customer-search-desktop'">
      Tìm kiếm sản phẩm và dịch vụ
    </label>
    <Search
      class="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-primary-700"
      aria-hidden="true"
    />
    <input
      :id="props.compact ? 'customer-search-mobile' : 'customer-search-desktop'"
      v-model="query"
      type="search"
      name="customer-search"
      autocomplete="off"
      placeholder="Tìm sản phẩm, thương hiệu hoặc dịch vụ"
      :class="cn(
        'customer-search-input w-full rounded-2xl border border-primary-200 bg-surface pl-12 pr-20 text-foreground shadow-xs outline-none transition-[border-color,box-shadow] placeholder:text-text-muted focus:border-primary-600 focus:ring-2 focus:ring-ring/20',
        props.compact ? 'h-11 text-body-sm' : 'h-12 text-body-md',
      )"
    />
    <button
      v-if="query"
      type="button"
      class="absolute right-11 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-ring"
      aria-label="Xóa nội dung tìm kiếm"
      @click="query = ''"
    >
      <X class="size-4" aria-hidden="true" />
    </button>
    <button
      type="submit"
      class="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-xl bg-primary text-primary-foreground hover:bg-primary-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      aria-label="Tìm kiếm"
    >
      <Search class="size-4.5" aria-hidden="true" />
    </button>
  </form>
</template>
