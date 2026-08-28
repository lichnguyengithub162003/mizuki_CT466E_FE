<script setup lang="ts">
import { BadgeCheck, ChevronRight } from "@lucide/vue";
import { computed, ref } from "vue";
import { RouterLink } from "vue-router";
import { PRODUCT_LISTING_FALLBACK_IMAGE } from "@/api/productListingAdapter";
import { ROUTE_NAMES } from "@/constants/routes";
import type { CustomerOrderItem } from "@/types/orders";

const props = defineProps<{ items: readonly CustomerOrderItem[] }>();
const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
});

interface ProductGroup {
  key: string;
  brandId: number | null;
  brandName: string | null;
  items: CustomerOrderItem[];
}
const groups = computed<ProductGroup[]>(() => {
  const grouped = new Map<string, ProductGroup>();
  for (const item of props.items) {
    const brandName = item.brandName?.trim() || null;
    const brandId =
      Number.isInteger(item.brandId) && Number(item.brandId) > 0
        ? Number(item.brandId)
        : null;
    const key = brandName ? `brand:${brandId ?? brandName}` : "brand:neutral";
    const group = grouped.get(key);
    if (group) group.items.push(item);
    else grouped.set(key, { key, brandId, brandName, items: [item] });
  }
  return [...grouped.values()];
});

const imageFailures = ref<ReadonlySet<number>>(new Set());
function imageFor(item: CustomerOrderItem): string {
  return !item.imageUrl || imageFailures.value.has(item.id)
    ? PRODUCT_LISTING_FALLBACK_IMAGE
    : item.imageUrl;
}
function failImage(itemId: number): void {
  imageFailures.value = new Set([...imageFailures.value, itemId]);
}
function finalPrice(item: CustomerOrderItem): number {
  return item.finalUnitPrice ?? item.unitPrice;
}
function showsLineTotal(item: CustomerOrderItem): boolean {
  return item.quantity > 1 || item.lineTotal !== finalPrice(item);
}
</script>

<template>
  <div class="grid gap-3" data-order-product-groups>
    <section
      v-for="group in groups"
      :key="group.key"
      class="overflow-hidden rounded-[1.15rem] bg-[#f7f8f7] ring-1 ring-black/[0.045]"
      data-brand-group
      :data-brand-name="group.brandName ?? 'neutral'"
    >
      <header
        class="flex min-h-11 items-center justify-between gap-2 px-3 py-2.5 sm:px-4"
      >
        <p
          class="flex min-w-0 items-center gap-2 truncate text-body-sm font-semibold text-primary-950"
        >
          <BadgeCheck
            v-if="group.brandName"
            class="size-5 shrink-0 text-blue-600"
            aria-label="Thương hiệu chính hãng"
            data-brand-verified-icon
          />
          <span
            :class="[
              'truncate',
              group.brandName && 'uppercase tracking-[0.025em]',
            ]"
            >{{ group.brandName ?? "Sản phẩm khác" }}</span
          >
        </p>
        <RouterLink
          v-if="group.brandId"
          :to="{
            name: ROUTE_NAMES.products,
            query: { brand_id: String(group.brandId), page: '1' },
          }"
          class="grid size-8 shrink-0 place-items-center rounded-lg text-primary-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          :aria-label="`Xem sản phẩm ${group.brandName}`"
        >
          <ChevronRight class="size-4" aria-hidden="true" />
        </RouterLink>
      </header>
      <ul class="grid gap-2 px-2 pb-2 sm:px-3 sm:pb-3" data-order-products>
        <li
          v-for="item in group.items"
          :key="item.id"
          class="grid min-w-0 grid-cols-[4.5rem_minmax(0,1fr)] gap-3 rounded-2xl bg-white p-3 shadow-[0_2px_10px_rgba(18,50,38,0.035)] sm:grid-cols-[5rem_minmax(0,1fr)_auto]"
        >
          <div class="aspect-square overflow-hidden rounded-xl bg-primary-50">
            <img
              :src="imageFor(item)"
              :alt="item.productName"
              class="size-full object-contain"
              data-order-product-image
              @error="failImage(item.id)"
            />
          </div>
          <div class="min-w-0">
            <h3
              class="break-words text-body-sm font-semibold leading-snug text-primary-950"
              data-order-product-name
            >
              {{ item.productName }}
            </h3>
            <p
              class="mt-1 text-caption text-text-secondary"
              data-order-product-quantity
            >
              Số lượng: {{ item.quantity }}
            </p>
            <div
              class="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 sm:hidden"
              data-order-price-row
            >
              <span
                v-if="
                  item.originalPrice && item.originalPrice > finalPrice(item)
                "
                class="text-caption text-text-muted line-through"
                data-order-original-price
                >{{ currency.format(item.originalPrice) }}</span
              >
              <strong
                class="text-body-sm font-bold text-[#d63f38]"
                data-order-final-price
                >{{ currency.format(finalPrice(item)) }}</strong
              >
            </div>
            <div
              v-if="showsLineTotal(item)"
              class="mt-2 flex items-baseline justify-between gap-3 text-caption text-text-secondary sm:hidden"
              data-order-line-total
            >
              <span>Thành tiền ({{ item.quantity }} sản phẩm)</span
              ><strong class="shrink-0 text-body-sm text-[#173d30]">{{
                currency.format(item.lineTotal)
              }}</strong>
            </div>
          </div>
          <div class="hidden min-w-40 text-right sm:block">
            <div
              class="flex flex-wrap items-baseline justify-end gap-x-2 gap-y-1"
              data-order-price-row
            >
              <span
                v-if="
                  item.originalPrice && item.originalPrice > finalPrice(item)
                "
                class="text-caption text-text-muted line-through"
                data-order-original-price
                >{{ currency.format(item.originalPrice) }}</span
              >
              <strong
                class="text-body-sm font-bold text-[#d63f38]"
                data-order-final-price
                >{{ currency.format(finalPrice(item)) }}</strong
              >
            </div>
            <div
              v-if="showsLineTotal(item)"
              class="mt-2 flex items-baseline justify-end gap-2 text-caption text-text-secondary"
              data-order-line-total
            >
              <span>Thành tiền ({{ item.quantity }} sản phẩm)</span
              ><strong class="text-body-sm text-primary-950">{{
                currency.format(item.lineTotal)
              }}</strong>
            </div>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>
