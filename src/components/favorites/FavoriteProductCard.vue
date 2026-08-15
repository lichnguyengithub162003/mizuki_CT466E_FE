<script setup lang="ts">
import { Heart, PackageOpen } from "@lucide/vue";
import { computed, ref } from "vue";
import { RouterLink } from "vue-router";
import { ROUTE_NAMES } from "@/constants/routes";
import type { CustomerFavorite } from "@/types/favorites";

const props = withDefaults(
  defineProps<{
    item: CustomerFavorite;
    pending?: boolean;
    editing?: boolean;
    selected?: boolean;
  }>(),
  {
    pending: false,
    editing: false,
    selected: false,
  },
);

defineEmits<{
  remove: [productId: number];
  toggleSelection: [productId: number];
}>();

const imageFailed = ref(false);
const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
});

const showOriginalPrice = computed(
  () =>
    props.item.originalPrice !== null &&
    props.item.originalPrice > props.item.minimumPrice,
);

const hasUnavailableOverlay = computed(
  () =>
    props.item.stockState === "sold-out" ||
    props.item.stockState === "discontinued",
);

const stockLabels: Record<CustomerFavorite["stockState"], string> = {
  available: "Còn hàng",
  "low-stock": "Sắp hết",
  "sold-out": "Hết hàng",
  discontinued: "Ngưng bán",
};

const stockClasses: Record<CustomerFavorite["stockState"], string> = {
  available: "bg-primary-50 text-primary-700",
  "low-stock": "bg-[#fff6df] text-[#8a6116]",
  "sold-out": "bg-[#fff0ee] text-[#a34640]",
  discontinued: "bg-[#f1f3f2] text-[#69716e]",
};

const imageOverlayClasses: Record<"sold-out" | "discontinued", string> = {
  "sold-out": "bg-primary-950/24",
  discontinued: "bg-[#59635f]/20",
};

const imageOverlayPillClasses: Record<"sold-out" | "discontinued", string> = {
  "sold-out": "text-primary-950",
  discontinued: "text-[#59635f]",
};

function unavailableClass(
  classes: Record<"sold-out" | "discontinued", string>,
): string {
  return props.item.stockState === "sold-out" ||
    props.item.stockState === "discontinued"
    ? classes[props.item.stockState]
    : "";
}
</script>

<template>
  <article
    class="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-primary-100 bg-white shadow-xs transition duration-200 hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-sm"
    :aria-labelledby="`favorite-name-${props.item.productId}`"
    data-favorite-item
    :data-stock-state="props.item.stockState"
  >
    <div
      class="relative aspect-[3/2] overflow-hidden bg-[#edf6f1] p-2.5 sm:p-3"
      data-favorite-image-area
    >
      <img
        v-if="props.item.imageUrl && !imageFailed"
        :src="props.item.imageUrl"
        :alt="props.item.name"
        :class="hasUnavailableOverlay ? 'opacity-75 saturate-[0.65]' : ''"
        class="size-full rounded-xl bg-white object-contain transition-[transform,filter,opacity] duration-300 group-hover:scale-[1.025]"
        loading="lazy"
        data-favorite-image-visual
        @error="imageFailed = true"
      />
      <div
        v-else
        :class="hasUnavailableOverlay ? 'opacity-75 saturate-[0.65]' : ''"
        class="grid size-full place-items-center rounded-xl bg-white text-primary-700 transition-[filter,opacity] duration-300"
        data-favorite-image-visual
      >
        <PackageOpen class="size-7 opacity-70" aria-hidden="true" />
      </div>

      <div
        v-if="hasUnavailableOverlay"
        :class="unavailableClass(imageOverlayClasses)"
        class="pointer-events-none absolute inset-0 z-10 grid place-items-center"
        data-favorite-stock-overlay
        aria-hidden="true"
      >
        <span
          :class="unavailableClass(imageOverlayPillClasses)"
          class="rounded-full bg-white px-3 py-1.5 text-xs font-semibold shadow-xs sm:text-sm"
          data-favorite-stock-overlay-pill
        >
          {{ stockLabels[props.item.stockState] }}
        </span>
      </div>

      <label
        v-if="props.editing"
        class="absolute left-2.5 top-2.5 z-20 grid size-9 cursor-pointer place-items-center rounded-full border border-primary-200 bg-white shadow-sm"
        :aria-label="`Chọn ${props.item.name}`"
      >
        <input
          type="checkbox"
          class="size-4 accent-primary"
          :checked="props.selected"
          :disabled="props.pending"
          @change="$emit('toggleSelection', props.item.productId)"
        />
      </label>

      <button
        v-else
        type="button"
        class="motion-interactive absolute right-2.5 top-2.5 z-20 grid size-10 place-items-center rounded-full border border-[#f1d3d0] bg-white text-[#c8423a] shadow-sm hover:border-[#e6b8b3] hover:bg-[#fff7f6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-wait disabled:opacity-60"
        :disabled="props.pending"
        :aria-label="`Bỏ ${props.item.name} khỏi yêu thích`"
        aria-pressed="true"
        @click="$emit('remove', props.item.productId)"
      >
        <Heart class="size-5 fill-current" aria-hidden="true" />
      </button>
    </div>

    <div class="flex flex-1 flex-col px-1.5 py-2.5 sm:p-3.5">
      <div class="mb-1.5 flex min-h-[1.125rem] min-w-0 items-center justify-between gap-2">
        <p
          v-if="props.item.brand"
          class="truncate text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-primary-700 sm:text-xs"
          data-favorite-brand
        >
          {{ props.item.brand.name }}
        </p>
        <span
          :class="[
            stockClasses[props.item.stockState],
            hasUnavailableOverlay ? 'sr-only' : '',
          ]"
          class="ml-auto shrink-0 rounded-md px-1.5 py-0.5 text-[0.625rem] font-semibold sm:text-[0.6875rem]"
          data-favorite-stock-label
        >
          {{ stockLabels[props.item.stockState] }}
        </span>
      </div>

      <h2
        :id="`favorite-name-${props.item.productId}`"
        class="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-primary-950"
      >
        {{ props.item.name }}
      </h2>

      <div class="mt-2 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
        <span class="text-xs text-text-muted">Giá từ</span>
        <strong
          class="text-[0.9375rem] font-bold leading-5 text-[#c8423a] sm:text-base"
        >
          {{ currencyFormatter.format(props.item.minimumPrice) }}
        </strong>
        <span
          v-if="showOriginalPrice"
          class="text-xs text-text-muted line-through decoration-text-muted/70"
          data-favorite-original-price
        >
          {{ currencyFormatter.format(props.item.originalPrice!) }}
        </span>
      </div>

      <div
        class="mt-auto pt-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.12fr)] sm:gap-2"
      >
        <RouterLink
          :to="{
            name: ROUTE_NAMES.productDetail,
            params: { slug: props.item.slug },
          }"
          class="motion-interactive mt-auto inline-flex min-h-9 w-full items-center justify-center whitespace-nowrap rounded-lg bg-primary-600 px-3 text-caption font-semibold text-white hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          :aria-label="`Chi tiết ${props.item.name}`"
          data-favorite-detail-link
        >
          Chi tiết
        </RouterLink>
      </div>
    </div>
  </article>
</template>
