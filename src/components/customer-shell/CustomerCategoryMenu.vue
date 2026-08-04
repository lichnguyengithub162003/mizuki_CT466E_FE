<script setup lang="ts">
import { ChevronDown, Sparkles } from "@lucide/vue";
import { computed, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import BasePopover from "@/components/common/BasePopover.vue";
import { PRODUCT_LISTING_FALLBACK_IMAGE } from "@/api/productListingAdapter";
import {
  useProductDiscoveryQuery,
  useRepresentativeProductsQuery,
} from "@/queries/productListing";
import { pinia } from "@/stores/pinia";
import { useBranchPreferenceStore } from "@/stores/branchPreference";

const open = ref(false);
const activeParentId = ref<number | null>(null);
const failedImages = ref<ReadonlySet<string>>(new Set());
const discoveryQuery = useProductDiscoveryQuery(computed(() => open.value));
const branchStore = useBranchPreferenceStore(pinia);
const rootCategories = computed(
  () => discoveryQuery.data.value?.categories ?? [],
);

watch(
  rootCategories,
  (categories) => {
    if (!categories.some((category) => category.id === activeParentId.value)) {
      activeParentId.value = categories[0]?.id ?? null;
    }
  },
  { immediate: true },
);

const activeParent = computed(
  () =>
    rootCategories.value.find(
      (category) => category.id === activeParentId.value,
    ) ?? rootCategories.value[0],
);
const visibleChildren = computed(
  () => activeParent.value?.children.slice(0, 6) ?? [],
);
const representativeQuery = useRepresentativeProductsQuery(
  computed(() => ({
    categoryIds: visibleChildren.value.map((category) => category.id),
    brandIds: [],
    ...(branchStore.selectedBranchId
      ? { branchId: branchStore.selectedBranchId }
      : {}),
  })),
  computed(() => open.value && visibleChildren.value.length > 0),
);

function closeMenu(): void {
  open.value = false;
}

function representativeImage(categoryId: number): string {
  if (failedImages.value.has(String(categoryId)))
    return PRODUCT_LISTING_FALLBACK_IMAGE;
  return (
    representativeQuery.data.value?.categories.get(categoryId)?.imageUrl ??
    PRODUCT_LISTING_FALLBACK_IMAGE
  );
}

function markImageFailed(categoryId: number): void {
  failedImages.value = new Set([...failedImages.value, String(categoryId)]);
}
</script>

<template>
  <BasePopover
    v-model="open"
    align="start"
    :side-offset="10"
    class="max-h-[calc(100svh-9rem)] w-[min(52rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border-white/80 bg-background/98 p-0 shadow-lg"
  >
    <template #trigger>
      <button
        type="button"
        class="motion-interactive inline-flex min-h-10 items-center gap-2 rounded-pill border border-primary-100 bg-admin-sage-soft px-4 text-body-sm font-normal leading-6 tracking-[0.01em] text-primary-900 shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        :aria-expanded="open"
        aria-label="Mở danh mục sản phẩm"
      >
        <Sparkles class="size-4 text-primary-700" aria-hidden="true" />
        Danh mục
        <ChevronDown
          class="size-3.5 transition-transform duration-(--duration-fast)"
          :class="open && 'rotate-180'"
          aria-hidden="true"
        />
      </button>
    </template>

    <section
      class="flex max-h-[calc(100svh-12rem)] min-w-0 flex-col overflow-hidden"
      aria-label="Danh mục sản phẩm"
      data-real-category-menu
    >
      <p
        v-if="discoveryQuery.isPending.value"
        class="px-5 py-6 text-center text-body-sm text-text-secondary"
      >
        Đang tải danh mục…
      </p>
      <div
        v-else-if="discoveryQuery.isError.value"
        class="grid justify-items-center gap-2 px-5 py-6"
      >
        <p class="text-body-sm text-text-secondary">Chưa thể tải danh mục.</p>
        <button
          type="button"
          class="text-body-sm font-semibold text-primary-800"
          @click="discoveryQuery.refetch()"
        >
          Thử lại
        </button>
      </div>
      <div
        v-else
        class="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-5 py-4"
        data-category-menu-scroll-region
      >
        <div
          class="grid min-h-64 min-w-0 grid-cols-[13rem_minmax(0,1fr)] gap-4"
        >
          <nav
            class="min-w-0 border-r border-border pr-3"
            aria-label="Danh mục cha"
          >
            <RouterLink
              v-for="category in rootCategories"
              :key="category.id"
              :to="{
                path: '/products',
                query: { category_id: String(category.id), page: '1' },
              }"
              class="motion-interactive flex min-h-9 items-center rounded-lg px-3 text-body-sm text-text-secondary hover:bg-primary-50 hover:text-primary-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              :class="
                activeParent?.id === category.id &&
                'bg-primary-50 font-semibold text-primary-900'
              "
              :data-header-category-id="category.id"
              @mouseenter="activeParentId = category.id"
              @focus="activeParentId = category.id"
              @click="closeMenu"
            >
              {{ category.name }}
            </RouterLink>
          </nav>

          <div class="min-w-0 pr-1">
            <h3 class="text-body-md font-semibold text-primary-950">
              {{ activeParent?.name }}
            </h3>
            <div
              v-if="visibleChildren.length > 0"
              class="mt-3 grid gap-2 sm:grid-cols-2"
            >
              <RouterLink
                v-for="category in visibleChildren"
                :key="category.id"
                :to="{
                  path: '/products',
                  query: { category_id: String(category.id), page: '1' },
                }"
                class="motion-interactive flex min-h-20 items-center gap-3 rounded-xl border border-border bg-surface-subtle/55 p-2.5 text-body-sm font-medium text-primary-900 hover:border-primary-200 hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                :data-header-child-category-id="category.id"
                @click="closeMenu"
              >
                <img
                  :src="representativeImage(category.id)"
                  :alt="category.name"
                  class="size-16 shrink-0 rounded-xl border border-white bg-white object-contain p-1 shadow-xs"
                  width="64"
                  height="64"
                  loading="lazy"
                  data-category-representative-image
                  @error="markImageFailed(category.id)"
                />
                <span class="line-clamp-2">{{ category.name }}</span>
              </RouterLink>
            </div>
            <RouterLink
              v-else-if="activeParent"
              :to="{
                path: '/products',
                query: { category_id: String(activeParent.id), page: '1' },
              }"
              class="mt-3 inline-flex min-h-10 items-center rounded-xl bg-primary-50 px-4 text-body-sm font-semibold text-primary-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              @click="closeMenu"
            >
              Xem sản phẩm
            </RouterLink>
          </div>
        </div>
      </div>
    </section>
  </BasePopover>
</template>
