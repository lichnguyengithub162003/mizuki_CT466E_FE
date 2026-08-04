<script setup lang="ts">
import { Search, X } from '@lucide/vue'
import { inject, onBeforeUnmount, ref, watch } from 'vue'
import { routerKey } from 'vue-router'
import { searchProducts, type ProductSearchItemDto } from '@/api/productListingApi'
import { resolveProductImage } from '@/api/productListingAdapter'
import { ROUTE_NAMES } from '@/constants/routes'
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
const suggestions = ref<ProductSearchItemDto[]>([])
const suggestionState = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
const activeIndex = ref(-1)
const suggestionsOpen = ref(false)
const router = inject(routerKey)
let debounceTimer: number | undefined
let requestVersion = 0

function closeSuggestions(): void {
  suggestionsOpen.value = false
  activeIndex.value = -1
}

function clearSearch(): void {
  requestVersion += 1
  if (debounceTimer !== undefined) window.clearTimeout(debounceTimer)
  query.value = ''
  suggestions.value = []
  suggestionState.value = 'idle'
  closeSuggestions()
}

async function loadSuggestions(keyword: string, version: number): Promise<void> {
  suggestionState.value = 'loading'
  suggestionsOpen.value = true
  try {
    const result = await searchProducts(keyword)
    if (version !== requestVersion) return
    suggestions.value = result
    suggestionState.value = 'success'
    activeIndex.value = result.length > 0 ? 0 : -1
  } catch {
    if (version !== requestVersion) return
    suggestions.value = []
    suggestionState.value = 'error'
    activeIndex.value = -1
  }
}

watch(query, (value) => {
  requestVersion += 1
  const version = requestVersion
  if (debounceTimer !== undefined) window.clearTimeout(debounceTimer)
  const keyword = value.trim()
  if (keyword.length < 2) {
    suggestions.value = []
    suggestionState.value = 'idle'
    closeSuggestions()
    return
  }
  debounceTimer = window.setTimeout(() => {
    void loadSuggestions(keyword, version)
  }, 250)
})

function submitSearch(): void {
  const keyword = query.value.trim()
  if (!keyword) return
  requestVersion += 1
  if (debounceTimer !== undefined) window.clearTimeout(debounceTimer)
  closeSuggestions()
  emit('submit', keyword)
  void router?.push({ name: ROUTE_NAMES.products, query: { keyword, page: '1' } })
}

function openProduct(product: ProductSearchItemDto): void {
  requestVersion += 1
  if (debounceTimer !== undefined) window.clearTimeout(debounceTimer)
  closeSuggestions()
  void router?.push({ name: ROUTE_NAMES.productDetail, params: { slug: product.slug } })
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    closeSuggestions()
    return
  }
  if (event.key === 'Enter' && (!suggestionsOpen.value || activeIndex.value < 0)) {
    event.preventDefault()
    submitSearch()
    return
  }
  if (!suggestionsOpen.value || suggestions.value.length === 0) return
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    activeIndex.value = (activeIndex.value + 1) % suggestions.value.length
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    activeIndex.value = (activeIndex.value - 1 + suggestions.value.length) % suggestions.value.length
  } else if (event.key === 'Enter' && activeIndex.value >= 0) {
    event.preventDefault()
    const product = suggestions.value[activeIndex.value]
    if (product) openProduct(product)
  }
}

function handleFocusOut(event: FocusEvent): void {
  const currentTarget = event.currentTarget
  if (!(currentTarget instanceof HTMLElement)) return
  if (!(event.relatedTarget instanceof Node) || !currentTarget.contains(event.relatedTarget)) {
    closeSuggestions()
  }
}

onBeforeUnmount(() => {
  requestVersion += 1
  if (debounceTimer !== undefined) window.clearTimeout(debounceTimer)
})
</script>

<template>
  <form
    role="search"
    :class="cn('relative w-full', props.class)"
    @submit.prevent="submitSearch"
    @focusout="handleFocusOut"
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
      role="combobox"
      aria-autocomplete="list"
      :aria-expanded="suggestionsOpen"
      :aria-controls="`${props.compact ? 'customer-search-mobile' : 'customer-search-desktop'}-suggestions`"
      :aria-activedescendant="activeIndex >= 0 ? `customer-search-option-${suggestions[activeIndex]?.id}` : undefined"
      placeholder="Tìm sản phẩm, thương hiệu hoặc dịch vụ"
      :class="cn(
        'customer-search-input w-full rounded-2xl border border-primary-200 bg-surface pl-12 pr-20 text-foreground shadow-xs outline-none transition-[border-color,box-shadow] placeholder:text-text-muted focus:border-primary-600 focus:ring-2 focus:ring-ring/20',
        props.compact ? 'h-11 text-body-sm' : 'h-12 text-body-md',
      )"
      @keydown="handleKeydown"
    />
    <button
      v-if="query"
      type="button"
      class="absolute right-11 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-ring"
      aria-label="Xóa nội dung tìm kiếm"
      @click="clearSearch"
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

    <div
      v-if="suggestionsOpen"
      :id="`${props.compact ? 'customer-search-mobile' : 'customer-search-desktop'}-suggestions`"
      class="absolute inset-x-0 top-[calc(100%+0.4rem)] z-50 max-h-80 overflow-y-auto rounded-2xl border border-border bg-surface p-2 shadow-lg"
      role="listbox"
      aria-label="Gợi ý sản phẩm"
      data-search-suggestions
    >
      <p v-if="suggestionState === 'loading'" class="px-3 py-4 text-body-sm text-text-secondary">
        Đang tìm sản phẩm…
      </p>
      <div v-else-if="suggestionState === 'error'" class="px-3 py-3 text-body-sm text-text-secondary">
        <p>Chưa thể tải gợi ý.</p>
        <button type="button" class="mt-2 font-semibold text-primary-800" @click="loadSuggestions(query.trim(), requestVersion)">Thử lại</button>
      </div>
      <p v-else-if="suggestions.length === 0" class="px-3 py-4 text-body-sm text-text-secondary">
        Không tìm thấy sản phẩm.
      </p>
      <button
        v-for="(product, index) in suggestions"
        v-else
        :id="`customer-search-option-${product.id}`"
        :key="product.id"
        type="button"
        role="option"
        :aria-selected="activeIndex === index"
        :class="cn(
          'flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-ring',
          activeIndex === index && 'bg-primary-50',
        )"
        @mouseenter="activeIndex = index"
        @mousedown.prevent
        @click="openProduct(product)"
      >
        <img :src="resolveProductImage(product.primary_image_url)" :alt="product.name" class="size-12 shrink-0 rounded-lg bg-primary-50 object-contain" />
        <span class="min-w-0 text-body-sm font-medium text-primary-950 line-clamp-2">{{ product.name }}</span>
      </button>
    </div>
  </form>
</template>
