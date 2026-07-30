<script setup lang="ts">
import {
  BadgeCheck,
  Check,
  ChevronLeft,
  CircleHelp,
  Heart,
  MapPin,
  Minus,
  PackageCheck,
  Plus,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Star,
  Store,
  Send,
  Truck,
} from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import BaseButton from '@/components/common/BaseButton.vue'
import ProductBranchAvailabilityCarousel from '@/components/products/ProductBranchAvailabilityCarousel.vue'
import ProductDetailGallery from '@/components/products/ProductDetailGallery.vue'
import ProductSuggestions from '@/components/products/ProductSuggestions.vue'
import { ROUTE_NAMES } from '@/constants/routes'
import {
  getProductDetailBySlug,
  getRelatedProducts,
} from '@/data/products/productDetailDemoData'
import CustomerLayout from '@/layouts/CustomerLayout.vue'
import type {
  ProductContentState,
  ProductDetailStockState,
} from '@/types/products'

type ProductDetailDemoState =
  | ProductContentState
  | 'out-of-stock'
  | 'low-stock'
  | 'unavailable-variant'

interface SubmittedQuestion {
  readonly id: string
  readonly question: string
  readonly date: string
}

const sectionLinks = [
  { id: 'description', label: 'Mô tả' },
  { id: 'ingredients', label: 'Thành phần' },
  { id: 'usage', label: 'Hướng dẫn sử dụng' },
  { id: 'specifications', label: 'Thông số' },
  { id: 'reviews', label: 'Đánh giá' },
  { id: 'questions', label: 'Hỏi đáp' },
  { id: 'branches', label: 'Chi nhánh còn hàng' },
] as const

const route = useRoute()
const router = useRouter()
const retryState = ref<ProductDetailDemoState | null>(null)
const quantity = ref(1)
const selectedVariants = ref<Record<string, string>>({})
const isFavorite = ref(false)
const isFollowingBrand = ref(false)
const purchaseFeedback = ref('')
const activeSection = ref<(typeof sectionLinks)[number]['id']>(sectionLinks[0].id)
const questionDraft = ref('')
const questionError = ref('')
const questionFeedback = ref('')
const submittedQuestions = ref<SubmittedQuestion[]>([])
let submittedQuestionCount = 0

const product = computed(() => {
  const slug = typeof route.params.slug === 'string' ? route.params.slug : ''
  return getProductDetailBySlug(slug)
})

const requestedState = computed<ProductDetailDemoState>(() => {
  if (retryState.value) {
    return retryState.value
  }

  const state = typeof route.query.state === 'string' ? route.query.state : 'success'
  const supportedStates: readonly ProductDetailDemoState[] = [
    'success',
    'loading',
    'empty',
    'error',
    'out-of-stock',
    'low-stock',
    'unavailable-variant',
  ]

  return supportedStates.includes(state as ProductDetailDemoState)
    ? (state as ProductDetailDemoState)
    : 'success'
})

const contentState = computed<ProductContentState>(() => {
  if (!product.value || requestedState.value === 'empty') return 'empty'
  if (requestedState.value === 'loading') return 'loading'
  if (requestedState.value === 'error') return 'error'
  return 'success'
})

const relatedProducts = computed(() =>
  product.value ? getRelatedProducts(product.value) : [],
)

const selectedUnavailable = computed(() => {
  if (requestedState.value === 'unavailable-variant') {
    return true
  }

  return product.value?.variants.some((group) => {
    const selectedId = selectedVariants.value[group.id]
    return group.options.some((option) => option.id === selectedId && !option.available)
  }) ?? false
})

const purchaseStock = computed<{ state: ProductDetailStockState; label: string }>(() => {
  if (requestedState.value === 'out-of-stock') {
    return { state: 'out-of-stock', label: 'Tạm hết hàng' }
  }
  if (requestedState.value === 'low-stock') {
    return { state: 'low-stock', label: 'Chỉ còn ít sản phẩm' }
  }
  if (selectedUnavailable.value) {
    return { state: 'out-of-stock', label: 'Phân loại này tạm hết hàng' }
  }
  return {
    state: product.value?.stockState ?? 'out-of-stock',
    label: product.value?.stockLabel ?? 'Tạm hết hàng',
  }
})

const purchaseDisabled = computed(() => purchaseStock.value.state === 'out-of-stock')

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
})

function initializeSelections(): void {
  const initialSelections: Record<string, string> = {}

  product.value?.variants.forEach((group) => {
    initialSelections[group.id] = group.options.find((option) => option.available)?.id
      ?? group.options[0]?.id
      ?? ''
  })

  selectedVariants.value = initialSelections
  quantity.value = 1
  purchaseFeedback.value = ''
}

watch(
  () => product.value?.id,
  () => initializeSelections(),
  { immediate: true },
)

function setQuantity(nextQuantity: number): void {
  const maximum = product.value?.maxQuantity ?? 1
  quantity.value = Math.min(Math.max(nextQuantity, 1), maximum)
}

function chooseVariant(groupId: string, optionId: string): void {
  selectedVariants.value = {
    ...selectedVariants.value,
    [groupId]: optionId,
  }
  purchaseFeedback.value = ''
}

function submitPurchase(action: 'cart' | 'buy'): void {
  if (purchaseDisabled.value) return

  purchaseFeedback.value = action === 'cart'
    ? `Đã chuẩn bị ${quantity.value} sản phẩm trong giỏ hàng demo.`
    : 'Đã chuẩn bị bước mua ngay trong bản demo.'

  if (action === 'cart') {
    void router.push({ name: ROUTE_NAMES.cart })
  }
}

function submitQuestion(): void {
  const question = questionDraft.value.trim()

  if (question.length < 10) {
    questionError.value = 'Câu hỏi cần có ít nhất 10 ký tự để Mizuki hiểu rõ hơn.'
    questionFeedback.value = ''
    return
  }

  submittedQuestionCount += 1
  submittedQuestions.value = [
    {
      id: `submitted-question-${submittedQuestionCount}`,
      question,
      date: new Intl.DateTimeFormat('vi-VN').format(new Date()),
    },
    ...submittedQuestions.value,
  ]
  questionDraft.value = ''
  questionError.value = ''
  questionFeedback.value = 'Câu hỏi đã được ghi nhận và đang chờ tư vấn.'
}

function clearQuestionFeedback(): void {
  questionError.value = ''
  questionFeedback.value = ''
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function scrollToSection(sectionId: typeof sectionLinks[number]['id']): void {
  activeSection.value = sectionId
  const target = typeof document === 'undefined' ? null : document.getElementById(sectionId)

  if (typeof target?.scrollIntoView === 'function') {
    target.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'start',
    })
  }
}

function retry(): void {
  retryState.value = 'success'
  void router.replace({
    query: {
      ...route.query,
      state: undefined,
    },
  })
}
</script>

<template>
  <CustomerLayout>
    <div class="bg-[#f7faf8]" data-product-detail-page :data-content-state="contentState">
      <div class="mx-auto w-full max-w-[90rem] px-4 py-5 sm:px-6 lg:px-8">
        <RouterLink
          :to="{ name: ROUTE_NAMES.products }"
          class="motion-interactive inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-body-sm font-medium text-primary-800 hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ChevronLeft class="size-4" aria-hidden="true" />
          Trở lại danh sách sản phẩm
        </RouterLink>
      </div>

      <div
        v-if="contentState === 'loading'"
        class="mx-auto grid min-h-[34rem] w-full max-w-[90rem] gap-6 px-4 pb-12 sm:px-6 lg:grid-cols-2 lg:px-8"
        role="status"
        aria-live="polite"
        data-detail-loading
      >
        <span class="sr-only">Đang tải thông tin sản phẩm</span>
        <div class="aspect-square animate-pulse rounded-[2rem] bg-primary-100" />
        <div class="space-y-4 pt-6">
          <div class="h-5 w-28 animate-pulse rounded-full bg-primary-100" />
          <div class="h-10 w-4/5 animate-pulse rounded-xl bg-primary-100" />
          <div class="h-8 w-44 animate-pulse rounded-xl bg-primary-100" />
          <div class="h-32 animate-pulse rounded-2xl bg-primary-100" />
        </div>
      </div>

      <section
        v-else-if="contentState === 'empty'"
        class="mx-auto grid min-h-[34rem] w-full max-w-2xl place-items-center px-4 pb-12 text-center"
        data-detail-empty
      >
        <div>
          <ShoppingBag class="mx-auto size-12 text-primary-500" aria-hidden="true" />
          <h1 class="mt-5 text-heading-2 text-primary-950">Không tìm thấy sản phẩm</h1>
          <p class="mt-2 text-body-md text-text-secondary">
            Sản phẩm có thể đã thay đổi hoặc không còn trong danh mục demo.
          </p>
          <RouterLink
            :to="{ name: ROUTE_NAMES.products }"
            class="motion-interactive mt-6 inline-flex min-h-11 items-center rounded-xl bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Xem danh sách sản phẩm
          </RouterLink>
        </div>
      </section>

      <section
        v-else-if="contentState === 'error'"
        class="mx-auto grid min-h-[34rem] w-full max-w-2xl place-items-center px-4 pb-12 text-center"
        data-detail-error
      >
        <div>
          <CircleHelp class="mx-auto size-12 text-primary-600" aria-hidden="true" />
          <h1 class="mt-5 text-heading-2 text-primary-950">Chưa thể hiển thị sản phẩm</h1>
          <p class="mt-2 text-body-md text-text-secondary">
            Nội dung demo đang gián đoạn. Bạn có thể thử hiển thị lại ngay.
          </p>
          <BaseButton class="mt-6" @click="retry">Thử lại</BaseButton>
        </div>
      </section>

      <template v-else-if="product">
        <div class="mx-auto grid w-full max-w-[90rem] gap-8 px-4 pb-10 sm:px-6 lg:grid-cols-[minmax(0,0.96fr)_minmax(0,1.04fr)] lg:px-8">
          <ProductDetailGallery :images="product.images" />

          <section class="min-w-0 rounded-[2rem] border border-primary-100 bg-white p-5 shadow-xs sm:p-7" aria-labelledby="product-detail-title">
            <div class="flex flex-wrap items-center gap-2">
              <span
                v-for="badge in product.badges"
                :key="badge"
                class="rounded-full bg-primary-50 px-3 py-1 text-caption font-semibold text-primary-800"
              >
                {{ badge }}
              </span>
            </div>

            <p class="mt-5 text-body-sm font-semibold uppercase tracking-[0.12em] text-primary-700">
              {{ product.brand.name }}
            </p>
            <h1 id="product-detail-title" class="mt-2 text-heading-2 leading-tight text-primary-950">
              {{ product.name }}
            </h1>

            <div class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-body-sm text-text-secondary">
              <span class="inline-flex items-center gap-1 font-semibold text-primary-900">
                {{ product.rating.toFixed(1) }}
                <Star class="size-4 fill-[#e3aa32] text-[#e3aa32]" aria-hidden="true" />
              </span>
              <a href="#reviews" class="underline decoration-primary-300 underline-offset-4">
                {{ product.reviewCount }} đánh giá
              </a>
              <span>Đã bán {{ product.soldCount }}</span>
            </div>

            <div class="mt-5 flex flex-wrap items-baseline gap-3 rounded-2xl bg-[#f4f8f6] p-4">
              <strong class="text-[clamp(1.65rem,4vw,2.25rem)] font-semibold tracking-tight text-[#bd3f38]">
                {{ currencyFormatter.format(product.currentPrice) }}
              </strong>
              <span v-if="product.originalPrice" class="text-body-sm text-text-muted line-through">
                {{ currencyFormatter.format(product.originalPrice) }}
              </span>
              <span v-if="product.discountLabel" class="rounded-lg bg-[#fce8e6] px-2 py-1 text-caption font-bold text-[#a52f29]">
                {{ product.discountLabel }}
              </span>
            </div>

            <ul class="mt-5 space-y-2.5">
              <li v-for="point in product.sellingPoints" :key="point" class="flex gap-2.5 text-body-sm text-primary-950">
                <Check class="mt-0.5 size-4 shrink-0 text-primary-700" aria-hidden="true" />
                <span>{{ point }}</span>
              </li>
            </ul>

            <div class="mt-5 grid gap-3 rounded-2xl border border-primary-100 p-4 sm:grid-cols-2">
              <div class="flex gap-3">
                <Truck class="mt-0.5 size-5 shrink-0 text-primary-700" aria-hidden="true" />
                <div>
                  <strong class="text-body-sm text-primary-950">Vận chuyển</strong>
                  <p class="mt-1 text-caption text-text-secondary">{{ product.shippingSummary }}</p>
                </div>
              </div>
              <div class="flex gap-3">
                <MapPin class="mt-0.5 size-5 shrink-0 text-primary-700" aria-hidden="true" />
                <div>
                  <strong class="text-body-sm text-primary-950">Nhận hàng</strong>
                  <p class="mt-1 text-caption text-text-secondary">{{ product.destinationSummary }}</p>
                </div>
              </div>
            </div>

            <fieldset
              v-for="group in product.variants"
              :key="group.id"
              class="mt-6"
              :data-variant-group="group.id"
            >
              <legend class="text-body-sm font-semibold text-primary-950">{{ group.label }}</legend>
              <div class="mt-3 flex flex-wrap gap-2">
                <label
                  v-for="option in group.options"
                  :key="option.id"
                  class="relative"
                >
                  <input
                    type="radio"
                    class="peer sr-only"
                    :name="group.id"
                    :value="option.id"
                    :checked="selectedVariants[group.id] === option.id"
                    :aria-describedby="!option.available ? `${group.id}-${option.id}-status` : undefined"
                    @change="chooseVariant(group.id, option.id)"
                  >
                  <span class="motion-interactive inline-flex min-h-11 cursor-pointer items-center rounded-xl border border-primary-200 bg-white px-4 text-body-sm font-medium text-primary-950 peer-checked:border-primary-800 peer-checked:bg-primary-50 peer-checked:ring-1 peer-checked:ring-primary-700 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring">
                    {{ option.label }}
                    <span v-if="!option.available" class="ml-2 text-caption text-text-muted">Hết</span>
                  </span>
                  <span v-if="!option.available" :id="`${group.id}-${option.id}-status`" class="sr-only">
                    Phân loại hiện không có sẵn
                  </span>
                </label>
              </div>
            </fieldset>

            <div class="mt-6 flex flex-wrap items-end justify-between gap-4">
              <div class="flex min-h-11 items-center gap-3" data-quantity-control>
                <label class="text-body-sm font-semibold text-primary-950" for="product-quantity">Số lượng</label>
                <div class="inline-flex h-11 items-center overflow-hidden rounded-xl border border-primary-200 bg-white shadow-xs">
                  <button
                    type="button"
                    class="grid size-11 shrink-0 place-items-center text-primary-900 hover:bg-primary-50 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring disabled:opacity-40"
                    aria-label="Giảm số lượng"
                    :disabled="quantity <= 1"
                    @click="setQuantity(quantity - 1)"
                  >
                    <Minus class="size-4" aria-hidden="true" />
                  </button>
                  <output
                    id="product-quantity"
                    class="grid h-full min-w-12 place-items-center border-x border-primary-100 px-2 text-center text-body-sm font-semibold tabular-nums text-primary-950"
                    aria-label="Số lượng sản phẩm"
                  >
                    {{ quantity }}
                  </output>
                  <button
                    type="button"
                    class="grid size-11 shrink-0 place-items-center text-primary-900 hover:bg-primary-50 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring disabled:opacity-40"
                    aria-label="Tăng số lượng"
                    :disabled="quantity >= product.maxQuantity"
                    @click="setQuantity(quantity + 1)"
                  >
                    <Plus class="size-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <p
                class="inline-flex min-h-8 items-center gap-2 rounded-full px-3 py-1 text-body-sm font-semibold"
                :class="purchaseStock.state === 'out-of-stock'
                  ? 'bg-[#fce8e6] text-[#9c302a]'
                  : purchaseStock.state === 'low-stock'
                    ? 'bg-[#fff2d6] text-[#805914]'
                    : 'bg-primary-50 text-primary-800'"
                :data-stock-state="purchaseStock.state"
                role="status"
              >
                <PackageCheck class="size-4" aria-hidden="true" />
                {{ purchaseStock.label }}
              </p>
            </div>

            <div class="mt-6 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <BaseButton
                variant="outline"
                size="lg"
                :disabled="purchaseDisabled"
                @click="submitPurchase('cart')"
              >
                <template #icon><ShoppingCart class="size-5" /></template>
                Thêm vào giỏ
              </BaseButton>
              <BaseButton
                size="lg"
                class="!text-white"
                :disabled="purchaseDisabled"
                @click="submitPurchase('buy')"
              >
                Mua ngay
              </BaseButton>
              <BaseButton
                variant="outline"
                size="icon"
                :class="isFavorite
                  ? 'border-[#e5b3b0] bg-[#fff4f3] text-[#c43d38] hover:bg-[#fee9e7]'
                  : 'text-primary-900'"
                :aria-label="isFavorite ? 'Bỏ khỏi yêu thích' : 'Thêm vào yêu thích'"
                :aria-pressed="isFavorite"
                @click="isFavorite = !isFavorite"
              >
                <Heart :class="['size-5', isFavorite && 'fill-current text-[#c43d38]']" aria-hidden="true" />
              </BaseButton>
            </div>
            <p v-if="purchaseFeedback" class="mt-3 text-body-sm font-medium text-primary-800" role="status">
              {{ purchaseFeedback }}
            </p>

            <div class="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-primary-100 pt-4 text-caption text-text-secondary">
              <span class="inline-flex items-center gap-1.5"><ShieldCheck class="size-4 text-primary-700" aria-hidden="true" /> Cam kết chính hãng</span>
              <span class="inline-flex items-center gap-1.5"><Sparkles class="size-4 text-primary-700" aria-hidden="true" /> Đổi trả trong 7 ngày</span>
            </div>
          </section>
        </div>

        <section class="mx-auto w-full max-w-[90rem] px-4 pb-8 sm:px-6 lg:px-8" aria-labelledby="brand-heading" data-brand-summary>
          <div class="rounded-[2rem] border border-primary-100 bg-[#eaf3ee] p-5 sm:p-6">
            <div
              class="flex min-w-0 flex-col items-stretch gap-5 md:flex-row md:flex-wrap md:items-center md:justify-start md:gap-x-8 md:gap-y-5 xl:flex-nowrap xl:gap-9"
              data-brand-summary-bar
            >
              <div class="flex min-w-0 flex-none items-center gap-4" data-brand-group="identity">
                <div class="grid size-16 shrink-0 place-items-center rounded-2xl bg-white text-heading-3 font-semibold text-primary-900 shadow-xs" aria-hidden="true">
                  {{ product.brand.initials }}
                </div>
                <div class="min-w-0">
                  <p class="text-caption font-semibold uppercase tracking-[0.12em] text-primary-700">THƯƠNG HIỆU</p>
                  <h2 id="brand-heading" class="mt-1 text-heading-3 text-primary-950">{{ product.brand.name }}</h2>
                  <div class="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      v-if="product.brand.isOfficial"
                      class="inline-flex items-center gap-1 rounded-full bg-[#e8f2ff] px-2.5 py-1 text-[0.625rem] font-bold tracking-[0.08em] text-[#1769aa]"
                      aria-label="Thương hiệu chính hãng"
                      data-official-badge
                    >
                      <BadgeCheck class="size-4 fill-[#d8ebff] text-[#1769aa]" aria-hidden="true" />
                      OFFICIAL
                    </span>
                    <span class="text-body-sm text-text-secondary">Xuất xứ {{ product.brand.origin }}</span>
                  </div>
                </div>
              </div>

              <div class="flex w-full max-w-44 flex-none flex-col items-stretch gap-2 md:self-center" data-brand-group="actions">
                <RouterLink
                  :to="{ name: ROUTE_NAMES.products, query: { brand: product.brand.name } }"
                  class="motion-interactive inline-flex min-h-9 items-center justify-center rounded-md bg-primary px-4 text-body-sm font-semibold text-white hover:bg-primary-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  Xem thương hiệu
                </RouterLink>
                <BaseButton
                  variant="outline"
                  size="sm"
                  class="w-full"
                  :aria-pressed="isFollowingBrand"
                  @click="isFollowingBrand = !isFollowingBrand"
                >
                  {{ isFollowingBrand ? 'Đang theo dõi' : 'Theo dõi' }}
                </BaseButton>
              </div>

              <dl class="flex-none border-primary-200/80 md:border-l md:pl-6" data-brand-group="products">
                <dt class="text-body-sm text-text-secondary">Đang bày bán</dt>
                <dd class="mt-1 text-body-md font-semibold text-primary-950">
                  {{ product.brand.productCount }} sản phẩm
                </dd>
              </dl>

              <dl class="flex-none space-y-1 border-primary-200/80 md:border-l md:pl-6" data-brand-group="rating">
                <div class="flex flex-wrap items-center gap-1.5">
                  <dt class="text-body-sm text-text-secondary">Đánh giá:</dt>
                  <dd class="inline-flex items-center gap-1 text-body-sm font-semibold text-primary-950">
                    {{ product.brand.rating.toFixed(1) }}
                    <Star class="size-3.5 fill-[#e3aa32] text-[#e3aa32]" aria-hidden="true" />
                  </dd>
                </div>
                <div class="flex flex-wrap items-center gap-1.5">
                  <dt class="text-body-sm text-text-secondary">Lượt đánh giá:</dt>
                  <dd class="text-body-sm font-semibold text-primary-950">
                    {{ product.brand.reviewCount.toLocaleString('vi-VN') }}
                  </dd>
                </div>
              </dl>
              </div>
            </div>
        </section>

        <nav
          class="sticky top-0 z-20 border-y border-primary-100 bg-white/95 shadow-xs backdrop-blur"
          aria-label="Nội dung sản phẩm"
          data-detail-section-nav
        >
          <div class="mx-auto flex w-full max-w-[90rem] gap-1 overflow-x-auto px-4 py-2 [scrollbar-width:none] sm:px-6 lg:px-8 [&::-webkit-scrollbar]:hidden">
            <a
              v-for="section in sectionLinks"
              :key="section.id"
              :href="`#${section.id}`"
              :aria-controls="section.id"
              :aria-current="activeSection === section.id ? 'location' : undefined"
              class="motion-interactive min-h-10 shrink-0 rounded-full px-4 py-2 text-body-sm font-medium text-primary-800 hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-[current=location]:bg-primary aria-[current=location]:text-primary-foreground"
              @click.prevent="scrollToSection(section.id)"
              @keydown.enter.prevent="scrollToSection(section.id)"
            >
              {{ section.label }}
            </a>
          </div>
        </nav>

        <div class="mx-auto w-full max-w-[90rem] space-y-6 px-4 py-8 sm:px-6 lg:px-8">
          <section id="description" class="scroll-mt-32 rounded-[2rem] border border-primary-100 bg-white p-6 md:scroll-mt-36 sm:p-8" aria-labelledby="description-heading" data-detail-scroll-section>
            <p class="text-caption font-semibold uppercase tracking-[0.12em] text-primary-700">Khám phá sản phẩm</p>
            <h2 id="description-heading" class="mt-2 text-heading-2 text-primary-950">Mô tả</h2>
            <div class="mt-5 space-y-3 text-body-md leading-relaxed text-text-secondary">
              <p v-for="paragraph in product.description" :key="paragraph">{{ paragraph }}</p>
            </div>
          </section>

          <section id="ingredients" class="scroll-mt-32 rounded-[2rem] border border-primary-100 bg-white p-6 md:scroll-mt-36 sm:p-8" aria-labelledby="ingredients-heading" data-detail-scroll-section>
            <h2 id="ingredients-heading" class="text-heading-2 text-primary-950">Thành phần nổi bật</h2>
            <ul class="mt-5 grid gap-3 md:grid-cols-3">
              <li v-for="ingredient in product.ingredients" :key="ingredient" class="rounded-2xl bg-primary-50 p-4 text-body-sm leading-relaxed text-primary-950">
                {{ ingredient }}
              </li>
            </ul>
          </section>

          <section id="usage" class="scroll-mt-32 rounded-[2rem] border border-primary-100 bg-white p-6 md:scroll-mt-36 sm:p-8" aria-labelledby="usage-heading" data-detail-scroll-section>
            <h2 id="usage-heading" class="text-heading-2 text-primary-950">Hướng dẫn sử dụng</h2>
            <ol class="mt-5 grid gap-3 md:grid-cols-3">
              <li v-for="(step, index) in product.usage" :key="step" class="flex gap-3 rounded-2xl bg-[#f7faf8] p-4 text-body-sm text-primary-950">
                <span class="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-caption font-bold text-primary-foreground">{{ index + 1 }}</span>
                <span class="pt-1">{{ step }}</span>
              </li>
            </ol>
          </section>

          <section id="specifications" class="scroll-mt-32 rounded-[2rem] border border-primary-100 bg-white p-6 md:scroll-mt-36 sm:p-8" aria-labelledby="specifications-heading" data-detail-scroll-section>
            <h2 id="specifications-heading" class="text-heading-2 text-primary-950">Thông số sản phẩm</h2>
            <dl class="mt-5 divide-y divide-primary-100 overflow-hidden rounded-2xl border border-primary-100">
              <div v-for="specification in product.specifications" :key="specification.label" class="grid gap-1 p-4 sm:grid-cols-[13rem_1fr]">
                <dt class="font-semibold text-primary-900">{{ specification.label }}</dt>
                <dd class="text-text-secondary">{{ specification.value }}</dd>
              </div>
            </dl>
          </section>

          <section id="reviews" class="scroll-mt-32 rounded-[2rem] border border-primary-100 bg-white p-6 md:scroll-mt-36 sm:p-8" aria-labelledby="reviews-heading" data-review-section data-detail-scroll-section>
            <h2 id="reviews-heading" class="text-heading-2 text-primary-950">Đánh giá từ khách hàng</h2>
            <div class="mt-6 grid gap-7 lg:grid-cols-[15rem_1fr]">
              <div class="rounded-2xl bg-primary-50 p-5 text-center">
                <strong class="text-[3rem] font-semibold tracking-tight text-primary-950">{{ product.rating.toFixed(1) }}</strong>
                <div class="mt-1 flex justify-center gap-1 text-[#e3aa32]" aria-label="5 trên 5 sao">
                  <Star v-for="star in 5" :key="star" class="size-4 fill-current" aria-hidden="true" />
                </div>
                <p class="mt-2 text-body-sm text-text-secondary">{{ product.reviewCount }} lượt đánh giá</p>
              </div>
              <div class="space-y-2">
                <div v-for="row in product.ratingDistribution" :key="row.rating" class="grid grid-cols-[2.5rem_1fr_3rem] items-center gap-2 text-caption">
                  <span>{{ row.rating }} sao</span>
                  <span class="h-2 overflow-hidden rounded-full bg-primary-100">
                    <span class="block h-full rounded-full bg-primary-600" :style="{ width: `${row.percentage}%` }" />
                  </span>
                  <span class="text-right text-text-secondary">{{ row.count }}</span>
                </div>
              </div>
            </div>
            <div class="mt-7 space-y-4">
              <article v-for="review in product.reviews" :key="review.id" class="rounded-2xl border border-primary-100 p-5">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <strong class="text-primary-950">{{ review.author }}</strong>
                  <time class="text-caption text-text-muted">{{ review.date }}</time>
                </div>
                <div class="mt-2 flex items-center gap-2">
                  <span class="flex text-[#e3aa32]" :aria-label="`${review.rating} trên 5 sao`">
                    <Star v-for="star in review.rating" :key="star" class="size-3.5 fill-current" aria-hidden="true" />
                  </span>
                  <span v-if="review.verified" class="text-caption font-medium text-primary-700">Đã mua hàng</span>
                </div>
                <p class="mt-3 text-body-sm leading-relaxed text-text-secondary">{{ review.content }}</p>
              </article>
            </div>
          </section>

          <section id="questions" class="scroll-mt-32 rounded-[2rem] border border-primary-100 bg-white p-6 md:scroll-mt-36 sm:p-8" aria-labelledby="questions-heading" data-question-section data-detail-scroll-section>
            <h2 id="questions-heading" class="text-heading-2 text-primary-950">Hỏi đáp về sản phẩm</h2>
            <p class="mt-2 max-w-3xl text-body-sm leading-relaxed text-text-secondary">
              Hỏi đáp mở cho mọi khách hàng, không yêu cầu đã mua sản phẩm. Hãy chia sẻ đủ thông tin để Mizuki tư vấn phù hợp hơn.
            </p>

            <form
              class="mt-6 rounded-2xl border border-primary-100 bg-primary-50/60 p-4 sm:p-5"
              data-question-form
              @submit.prevent="submitQuestion"
            >
              <label for="product-question" class="text-body-sm font-semibold text-primary-950">
                Câu hỏi của bạn
              </label>
              <p id="product-question-description" class="mt-1 text-caption text-text-secondary">
                Không chia sẻ số điện thoại hoặc thông tin nhạy cảm.
              </p>
              <textarea
                id="product-question"
                v-model="questionDraft"
                rows="4"
                maxlength="500"
                class="mt-3 min-h-28 w-full resize-y rounded-2xl border border-primary-200 bg-white px-4 py-3 text-body-sm text-primary-950 outline-none placeholder:text-text-muted focus:border-primary-600 focus:ring-2 focus:ring-primary-200"
                placeholder="Đặt câu hỏi về sản phẩm, loại da, cách dùng hoặc tình trạng da của bạn..."
                :aria-invalid="questionError ? 'true' : undefined"
                :aria-describedby="questionError ? 'product-question-description product-question-error' : 'product-question-description'"
                @input="clearQuestionFeedback"
              />
              <div class="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p v-if="questionError" id="product-question-error" class="text-body-sm font-medium text-[#a5322d]" role="alert">
                    {{ questionError }}
                  </p>
                  <p v-else-if="questionFeedback" class="text-body-sm font-medium text-primary-800" role="status">
                    {{ questionFeedback }}
                  </p>
                  <p v-else class="text-caption text-text-muted">{{ questionDraft.length }}/500 ký tự</p>
                </div>
                <BaseButton
                  type="submit"
                  size="sm"
                  class="sm:shrink-0"
                  :disabled="questionDraft.trim().length === 0"
                >
                  <template #icon><Send class="size-4" /></template>
                  Gửi câu hỏi
                </BaseButton>
              </div>
            </form>

            <div class="mt-5 space-y-4">
              <article
                v-for="question in submittedQuestions"
                :key="question.id"
                class="rounded-2xl border border-primary-200 bg-white p-5"
                data-submitted-question
              >
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <p class="font-semibold text-primary-950">Hỏi: {{ question.question }}</p>
                  <span class="rounded-full bg-[#fff2d6] px-2.5 py-1 text-caption font-semibold text-[#805914]">
                    Chờ tư vấn
                  </span>
                </div>
                <p class="mt-3 text-caption text-text-muted">Câu hỏi của bạn · {{ question.date }}</p>
              </article>
              <article v-for="question in product.questions" :key="question.id" class="rounded-2xl bg-[#f7faf8] p-5">
                <p class="font-semibold text-primary-950">Hỏi: {{ question.question }}</p>
                <p class="mt-3 border-l-2 border-primary-300 pl-4 text-body-sm leading-relaxed text-text-secondary">
                  <strong class="text-primary-800">Mizuki trả lời:</strong> {{ question.answer }}
                </p>
                <p class="mt-3 text-caption text-text-muted">{{ question.author }} · {{ question.date }}</p>
              </article>
            </div>
          </section>

          <section id="branches" class="scroll-mt-32 rounded-[2rem] border border-primary-100 bg-white p-6 md:scroll-mt-36 sm:p-8" aria-labelledby="branches-heading" data-branch-section data-detail-scroll-section>
            <ProductBranchAvailabilityCarousel :branches="product.branches">
              <template #heading>
                <div class="flex min-w-0 items-center gap-3">
                  <Store class="size-6 flex-none text-primary-700" aria-hidden="true" />
                  <h2 id="branches-heading" class="min-w-0 text-heading-2 text-primary-950">Chi nhánh còn hàng</h2>
                </div>
              </template>
            </ProductBranchAvailabilityCarousel>
          </section>

          <ProductSuggestions v-if="relatedProducts.length" :products="relatedProducts" />
        </div>
      </template>
    </div>
  </CustomerLayout>
</template>
