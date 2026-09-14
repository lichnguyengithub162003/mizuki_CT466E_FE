<script setup lang="ts">
import { ArrowLeft, PackageSearch, RefreshCw } from "@lucide/vue";
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { useRoute, useRouter } from "vue-router";
import CustomerLayout from "@/layouts/CustomerLayout.vue";
import CustomerOrderCard from "@/components/orders/CustomerOrderCard.vue";
import CustomerOrderSkeleton from "@/components/orders/CustomerOrderSkeleton.vue";
import ProductSuggestions from "@/components/products/ProductSuggestions.vue";
import CustomerBackToTop from "@/components/customer-shell/CustomerBackToTop.vue";
import { useToast } from "@/components/common/toast";
import { ROUTE_NAMES } from "@/constants/routes";
import { useCustomerOrdersInfiniteQuery } from "@/queries/orders";
import { useAddCartItemMutation, useCustomerCartQuery } from "@/queries/cart";
import { useProductRecommendationsInfiniteQuery } from "@/queries/productListing";
import {
  useAddFavoriteMutation,
  useCustomerFavoritesQuery,
  useRemoveFavoriteMutation,
} from "@/queries/favorites";
import { useAuthStore } from "@/stores/auth";
import { pinia } from "@/stores/pinia";
import {
  CUSTOMER_ORDER_TABS,
  customerOrderPreviewEnabled,
  orderBelongsToTab,
  type CustomerOrder,
  type CustomerOrderTab,
} from "@/types/orders.ts";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore(pinia);
const selectedTab = ref<CustomerOrderTab>("all");
const previewOrders = ref<readonly CustomerOrder[]>([]);
const previewMode = computed(() =>
  customerOrderPreviewEnabled(import.meta.env.DEV, route.query.preview),
);
const ordersQuery = useCustomerOrdersInfiniteQuery(selectedTab);
const userId = computed(() => authStore.user?.id ?? null);
const cartQuery = useCustomerCartQuery(userId);
const addCartItemMutation = useAddCartItemMutation(userId);
const favoritesQuery = useCustomerFavoritesQuery(userId);
const addFavoriteMutation = useAddFavoriteMutation(userId);
const removeFavoriteMutation = useRemoveFavoriteMutation(userId);
const { toast } = useToast();
const pendingBuyAgain = ref<ReadonlySet<number>>(new Set());
const sentinel = ref<HTMLElement | null>(null);
const recommendationSentinel = ref<HTMLElement | null>(null);
const recommendationsActivated = ref(false);
const recommendationSentinelWasOutside = ref(false);
let observer: IntersectionObserver | null = null;
let recommendationObserver: IntersectionObserver | null = null;
let orderPageRequestInFlight = false;

const allLoadedOrders = computed(
  () => ordersQuery.data.value?.pages.flatMap((page) => page.orders) ?? [],
);
const visibleOrders = computed(() =>
  allLoadedOrders.value.filter((order) =>
    orderBelongsToTab(order, selectedTab.value),
  ),
);
const visiblePreviewOrders = computed(() =>
  previewMode.value
    ? previewOrders.value.filter((order) =>
        orderBelongsToTab(order, selectedTab.value),
      )
    : [],
);
const listExhausted = computed(() => ordersQuery.hasNextPage.value === false);
const trulyEmpty = computed(
  () => listExhausted.value && visibleOrders.value.length === 0,
);
const recommendationsEnabled = computed(
  () =>
    listExhausted.value &&
    (visibleOrders.value.length > 0 || previewMode.value),
);
const recommendationRequest = computed(() => ({
  ...(cartQuery.data.value?.branch?.id
    ? { branch_id: cartQuery.data.value.branch.id }
    : {}),
  sort: "newest" as const,
  per_page: 12,
}));
const recommendationsQuery = useProductRecommendationsInfiniteQuery(
  recommendationRequest,
  recommendationsEnabled,
);
const recommendations = computed(
  () =>
    recommendationsQuery.data.value?.pages.flatMap((page) => page.products) ??
    [],
);
const favoriteIds = computed<ReadonlySet<string>>(
  () =>
    new Set(
      (favoritesQuery.data.value ?? []).map((favorite) =>
        String(favorite.productId),
      ),
    ),
);
const favoritePending = computed(
  () =>
    addFavoriteMutation.isPending.value ||
    removeFavoriteMutation.isPending.value,
);
const recommendationsState = computed(() => {
  if (recommendationsQuery.isPending.value) return "loading" as const;
  if (recommendationsQuery.isError.value) return "error" as const;
  return recommendations.value.length
    ? ("success" as const)
    : ("empty" as const);
});

async function loadPreviewOrders(): Promise<void> {
  if (!previewMode.value) {
    previewOrders.value = [];
    return;
  }
  const preview = await import(
    /* @vite-ignore */ "../../data/customerOrderPreview.ts"
  );
  previewOrders.value = preview.CUSTOMER_ORDER_PREVIEW_FIXTURES;
}

function safeBack(): void {
  if (typeof window.history.state?.back === "string") router.back();
  else void router.push({ name: ROUTE_NAMES.products });
}

function openOrder(order: CustomerOrder): void {
  if (order.previewId && previewMode.value) {
    void router.push({
      name: ROUTE_NAMES.customerOrderPreviewDetail,
      params: { fixtureId: order.previewId },
    });
    return;
  }
  void router.push({
    name: ROUTE_NAMES.customerOrderDetail,
    params: { id: order.id },
  });
}

async function buyAgain(order: CustomerOrder): Promise<void> {
  if (order.previewId || pendingBuyAgain.value.has(order.id)) return;
  pendingBuyAgain.value = new Set([...pendingBuyAgain.value, order.id]);
  let added = 0;
  const failed: string[] = [];
  try {
    for (const item of order.items) {
      try {
        await addCartItemMutation.mutateAsync({
          productVariantId: item.productVariantId,
          quantity: item.quantity,
        });
        added += 1;
      } catch {
        failed.push(item.productName);
      }
    }
    if (added > 0) await cartQuery.refetch();
    toast({
      title:
        failed.length === 0
          ? "Đã thêm sản phẩm vào giỏ hàng."
          : `Đã thêm ${added}/${order.items.length} sản phẩm. Không thể thêm: ${failed.join(", ")}.`,
      variant: failed.length === 0 ? "success" : "error",
    });
  } finally {
    pendingBuyAgain.value = new Set(
      [...pendingBuyAgain.value].filter((id) => id !== order.id),
    );
  }
}

async function toggleRecommendationFavorite(product: {
  id: string;
  name: string;
}): Promise<void> {
  const productId = Number(product.id);
  if (
    !Number.isSafeInteger(productId) ||
    productId <= 0 ||
    favoritePending.value
  )
    return;
  const removing = favoriteIds.value.has(product.id);
  try {
    if (removing) await removeFavoriteMutation.mutateAsync(productId);
    else await addFavoriteMutation.mutateAsync(productId);
    toast({
      title: removing
        ? "Đã bỏ sản phẩm khỏi yêu thích."
        : "Đã thêm sản phẩm vào yêu thích.",
      variant: "success",
    });
  } catch {
    toast({
      title: "Không thể cập nhật danh sách yêu thích.",
      variant: "error",
    });
  }
}

function observeSentinel(): void {
  observer?.disconnect();
  if (!sentinel.value || typeof IntersectionObserver === "undefined") return;
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting))
        void fetchNextOrderPage();
    },
    { rootMargin: "240px 0px" },
  );
  observer.observe(sentinel.value);
}

async function fetchNextOrderPage(): Promise<void> {
  if (
    orderPageRequestInFlight ||
    !ordersQuery.hasNextPage.value ||
    ordersQuery.isFetchingNextPage.value
  )
    return;
  orderPageRequestInFlight = true;
  try {
    await ordersQuery.fetchNextPage();
  } finally {
    orderPageRequestInFlight = false;
  }
}

function observeRecommendationSentinel(): void {
  recommendationObserver?.disconnect();
  if (
    !recommendationsActivated.value ||
    !recommendationSentinel.value ||
    typeof IntersectionObserver === "undefined"
  )
    return;
  recommendationObserver = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => !entry.isIntersecting))
        recommendationSentinelWasOutside.value = true;
      if (
        recommendationSentinelWasOutside.value &&
        entries.some((entry) => entry.isIntersecting) &&
        recommendationsQuery.hasNextPage.value &&
        !recommendationsQuery.isFetchingNextPage.value
      ) {
        recommendationSentinelWasOutside.value = false;
        void recommendationsQuery.fetchNextPage();
      }
    },
    { rootMargin: "180px 0px" },
  );
  recommendationObserver.observe(recommendationSentinel.value);
}

async function activateRecommendations(): Promise<void> {
  if (
    recommendationsActivated.value ||
    !recommendationsQuery.hasNextPage.value ||
    recommendationsQuery.isFetchingNextPage.value
  )
    return;
  recommendationsActivated.value = true;
  recommendationSentinelWasOutside.value = false;
  await recommendationsQuery.fetchNextPage();
  await nextTick();
  observeRecommendationSentinel();
}

watch(
  previewMode,
  () => {
    void loadPreviewOrders();
  },
  { immediate: true },
);
watch(selectedTab, async () => {
  await nextTick();
  observeSentinel();
  observeRecommendationSentinel();
});
watch(sentinel, observeSentinel);
watch(recommendationSentinel, observeRecommendationSentinel);
onMounted(() => {
  observeSentinel();
  observeRecommendationSentinel();
});
onBeforeUnmount(() => {
  observer?.disconnect();
  recommendationObserver?.disconnect();
});
</script>

<template>
  <CustomerLayout :hide-floating-utilities="true">
    <div class="min-h-[70svh] bg-[#f5f6f5]">
      <div
        class="mx-auto w-full max-w-[90rem] overflow-x-clip px-4 py-4 sm:px-5 md:py-5 lg:px-7"
      >
        <header class="flex items-center gap-2">
          <button
            type="button"
            class="grid size-9 shrink-0 place-items-center rounded-xl text-primary-900 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            aria-label="Quay lại"
            @click="safeBack"
          >
            <ArrowLeft class="size-4.5" aria-hidden="true" />
          </button>
          <h1
            class="text-[1.55rem] font-bold tracking-[-0.025em] text-primary-950"
          >
            Đơn hàng của tôi
          </h1>
        </header>

        <nav
          class="mt-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Lọc đơn hàng"
        >
          <div class="flex min-w-max gap-2 border-b border-border">
            <button
              v-for="tab in CUSTOMER_ORDER_TABS"
              :key="tab.id"
              type="button"
              class="relative min-h-11 whitespace-nowrap px-3 text-body-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              :class="
                selectedTab === tab.id
                  ? 'text-primary-900 after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-primary-700'
                  : 'text-text-secondary hover:text-primary-800'
              "
              :aria-current="selectedTab === tab.id ? 'page' : undefined"
              @click="selectedTab = tab.id"
            >
              {{ tab.label }}
            </button>
          </div>
        </nav>

        <section
          class="mt-6"
          aria-label="Đơn hàng của bạn"
          data-real-orders-section
        >
          <div
            v-if="ordersQuery.isPending.value"
            class="grid gap-4"
            aria-label="Đang tải đơn hàng"
          >
            <CustomerOrderSkeleton v-for="index in 4" :key="index" />
          </div>
          <div
            v-else-if="
              ordersQuery.isError.value && allLoadedOrders.length === 0
            "
            class="rounded-2xl border border-red-200 bg-red-50 p-6 text-center"
            role="alert"
          >
            <p class="font-semibold text-red-800">
              Chưa thể tải danh sách đơn hàng.
            </p>
            <button
              type="button"
              class="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary-800 px-4 text-body-sm font-semibold text-white"
              @click="ordersQuery.refetch()"
            >
              <RefreshCw class="size-4" aria-hidden="true" />Thử lại
            </button>
          </div>
          <template v-else>
            <div
              v-if="visibleOrders.length"
              class="grid items-start gap-5"
              data-order-list
            >
              <CustomerOrderCard
                v-for="order in visibleOrders"
                :key="order.id"
                :order="order"
                :buy-again-pending="pendingBuyAgain.has(order.id)"
                @detail="openOrder"
                @buy-again="buyAgain"
              />
            </div>
            <div
              v-else-if="trulyEmpty"
              class="rounded-2xl border border-dashed border-border bg-surface p-8 text-center"
              data-orders-empty
            >
              <PackageSearch
                class="mx-auto size-10 text-primary-600"
                aria-hidden="true"
              />
              <h3 class="mt-3 text-heading-3">Chưa có đơn hàng phù hợp</h3>
              <p class="mt-1 text-body-sm text-text-secondary">
                Đơn hàng thuộc trạng thái này sẽ xuất hiện tại đây.
              </p>
            </div>
            <div
              ref="sentinel"
              class="flex min-h-12 items-center justify-center py-3"
              data-order-sentinel
            >
              <span
                v-if="ordersQuery.isFetchingNextPage.value"
                class="text-body-sm text-text-secondary"
                >Đang tải thêm đơn hàng…</span
              >
              <button
                v-else-if="ordersQuery.isFetchNextPageError.value"
                type="button"
                class="inline-flex min-h-9 items-center gap-2 rounded-xl border border-primary-500 bg-white px-3 text-body-sm font-semibold text-primary-800"
                @click="fetchNextOrderPage"
              >
                <RefreshCw class="size-3.5" aria-hidden="true" />Thử tải lại
              </button>
            </div>
          </template>
        </section>

        <section
          v-if="previewMode"
          class="mt-8 border-t border-black/[0.055] pt-6"
          aria-labelledby="preview-orders-title"
          data-preview-orders-section
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h2
              id="preview-orders-title"
              class="text-heading-3 text-primary-950"
            >
              Mẫu giao diện
            </h2>
            <span
              class="rounded-pill border border-sky-200 bg-sky-50 px-3 py-1 text-caption font-semibold text-sky-800"
              >Chỉ trong môi trường phát triển</span
            >
          </div>
          <div
            v-if="visiblePreviewOrders.length"
            class="mt-4 grid items-start gap-5"
            data-preview-order-list
          >
            <CustomerOrderCard
              v-for="order in visiblePreviewOrders"
              :key="order.previewId"
              :order="order"
              preview
              @detail="openOrder"
            />
          </div>
          <p
            v-else
            class="mt-4 rounded-xl bg-surface-subtle p-4 text-body-sm text-text-secondary"
          >
            Không có mẫu phù hợp với trạng thái này.
          </p>
        </section>

        <section
          v-if="recommendationsEnabled"
          class="mt-8"
          data-order-recommendations
        >
          <div class="mb-5 flex items-center gap-4" data-recommendation-heading>
            <span class="h-px flex-1 bg-black/10" aria-hidden="true" />
            <h2
              class="shrink-0 text-center text-lg font-semibold tracking-[-0.01em] text-[#25493a]"
            >
              Có thể bạn cũng thích
            </h2>
            <span class="h-px flex-1 bg-black/10" aria-hidden="true" />
          </div>
          <ProductSuggestions
            layout="six-column-grid"
            :show-header="false"
            :products="recommendations"
            :state="recommendationsState"
            :favorite-ids="favoriteIds"
            :favorite-pending="favoritePending"
            @retry="recommendationsQuery.refetch()"
            @toggle-favorite="toggleRecommendationFavorite"
          />
          <div
            ref="recommendationSentinel"
            class="mt-5 flex min-h-10 items-center justify-center"
            data-recommendation-sentinel
          >
            <span
              v-if="recommendationsQuery.isFetchingNextPage.value"
              class="text-body-sm text-text-secondary"
              >Đang tải thêm gợi ý…</span
            >
            <button
              v-else-if="
                recommendationsQuery.hasNextPage.value &&
                !recommendationsActivated
              "
              type="button"
              class="min-h-10 rounded-xl border border-primary-200 px-4 text-body-sm font-semibold text-primary-800"
              @click="activateRecommendations"
            >
              Xem thêm gợi ý
            </button>
          </div>
        </section>
      </div>
    </div>
    <CustomerBackToTop />
  </CustomerLayout>
</template>
