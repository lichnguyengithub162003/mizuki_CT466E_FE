<script setup lang="ts">
import { ChevronRight } from "@lucide/vue";
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { RouterLink } from "vue-router";
import { cn } from "@/utils/cn";

interface BrandConveyorItem {
  id: string;
  name: string;
  logoUrl?: string;
}

const props = defineProps<{
  brands: readonly BrandConveyorItem[];
  selectedBrandId?: string;
}>();

const emit = defineEmits<{
  selectBrand: [brandId: string];
}>();

const viewport = ref<HTMLElement | null>(null);
const interactionPaused = ref(false);
const dragging = ref(false);
const dragged = ref(false);
const reducedMotion = ref(false);
const failedLogos = ref<ReadonlySet<string>>(new Set());
const visibleBrands = computed(() =>
  props.brands.filter(
    (brand) =>
      hasUsableLogo(brand) &&
      brand.name.trim().toLocaleLowerCase() !== "9wishes",
  ),
);
let pointerStartX = 0;
let pointerStartScrollLeft = 0;
let pointerBrandId: string | undefined;
let suppressNextPointerClick = false;
let motionQuery: MediaQueryList | undefined;

const autoplayEnabled = computed(
  () =>
    visibleBrands.value.length > 1 &&
    !props.selectedBrandId &&
    !reducedMotion.value,
);
const marqueeRunning = computed(
  () => autoplayEnabled.value && !interactionPaused.value && !dragging.value,
);

const featuredBrandNames = [
  'Bioderma',
  "Paula's Choice",
  'La Roche-Posay',
  'CeraVe',
  'Cocoon',
  'Eucerin',
  'Vichy',
  "L'Oréal Paris",
  'Maybelline',
  'SVR',
] as const

const featuredBrands = computed(() =>
  featuredBrandNames.flatMap((name) => {
    const brand = visibleBrands.value.find(
      (item) => item.name.trim().toLowerCase() === name.toLowerCase(),
    )

    return brand ? [brand] : []
  }),
)

function markLogoFailed(brandId: string): void {
  failedLogos.value = new Set([...failedLogos.value, brandId]);
}

function hasUsableLogo(brand: BrandConveyorItem): boolean {
  return Boolean(brand.logoUrl) && !failedLogos.value.has(brand.id);
}

function updateReducedMotion(event: MediaQueryListEvent): void {
  reducedMotion.value = event.matches;
}

function startDrag(event: PointerEvent): void {
  if (!viewport.value) return;
  dragging.value = true;
  dragged.value = false;
  pointerStartX = event.clientX;
  pointerStartScrollLeft = viewport.value.scrollLeft;
  pointerBrandId = (event.target as HTMLElement | null)?.closest<HTMLElement>(
    "[data-brand-id]",
  )?.dataset.brandId;
  viewport.value.setPointerCapture?.(event.pointerId);
}

function moveDrag(event: PointerEvent): void {
  if (!dragging.value || !viewport.value) return;
  const distance = event.clientX - pointerStartX;
  if (Math.abs(distance) > 6) dragged.value = true;
  viewport.value.scrollLeft = pointerStartScrollLeft - distance;
}

function finishDrag(event: PointerEvent): void {
  if (!dragging.value) return;
  viewport.value?.releasePointerCapture?.(event.pointerId);
  dragging.value = false;
  suppressNextPointerClick = true;
  if (!dragged.value && pointerBrandId) emit("selectBrand", pointerBrandId);
  pointerBrandId = undefined;
}

function cancelDrag(): void {
  dragging.value = false;
  dragged.value = false;
  pointerBrandId = undefined;
  suppressNextPointerClick = false;
}

function selectBrand(brandId: string, event: MouseEvent): void {
  if (suppressNextPointerClick && event.detail !== 0) {
    suppressNextPointerClick = false;
    dragged.value = false;
    return;
  }
  suppressNextPointerClick = false;
  dragged.value = false;
  emit("selectBrand", brandId);
}

async function keepSelectedBrandVisible(): Promise<void> {
  if (!props.selectedBrandId) return;
  await nextTick();
  const selected = viewport.value?.querySelector<HTMLElement>(
    '[data-brand-id="' + props.selectedBrandId + '"]',
  );
  selected?.scrollIntoView({ block: "nearest", inline: "center" });
}

watch(
  () => props.selectedBrandId,
  () => {
    void keepSelectedBrandVisible();
  },
);

onMounted(() => {
  if (typeof window.matchMedia === "function") {
    motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotion.value = motionQuery.matches;
    motionQuery.addEventListener("change", updateReducedMotion);
  }
  void keepSelectedBrandVisible();
});

onBeforeUnmount(() => {
  motionQuery?.removeEventListener("change", updateReducedMotion);
});
</script>

<template>
  <section aria-labelledby="product-listing-heading">
    <nav
      aria-label="Đường dẫn trang"
      class="flex flex-wrap items-center gap-1.5 text-caption text-text-secondary"
    >
      <RouterLink
        to="/home"
        class="rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        Trang chủ
      </RouterLink>
      <ChevronRight class="size-3.5" aria-hidden="true" />
      <span aria-current="page" class="font-medium text-primary-800"
        >Sản phẩm</span
      >
    </nav>

    <h1 id="product-listing-heading" class="sr-only">Sản phẩm chăm sóc da</h1>

    <section
      class="mt-4 min-w-0 rounded-2xl border border-border bg-surface px-3 py-3 shadow-xs sm:px-4"
      aria-labelledby="listing-brand-heading"
      data-brand-conveyor
      data-motion="continuous-marquee"
      data-drag-enabled="true"
      :data-autoplay-enabled="autoplayEnabled"
      :data-marquee-running="marqueeRunning"
      :data-paused="
        interactionPaused || dragging || Boolean(props.selectedBrandId)
      "
      :data-reduced-motion="reducedMotion"
      @mouseenter="interactionPaused = true"
      @mouseleave="interactionPaused = false"
      @focusin="interactionPaused = true"
      @focusout="interactionPaused = false"
    >
      <h2
        id="listing-brand-heading"
        class="text-body-md font-semibold text-primary-950"
      >
        Thương hiệu nổi bật
      </h2>

      <div
        ref="viewport"
        :class="
          cn(
            'mt-3 overflow-x-auto pb-1 scrollbar-none [&::-webkit-scrollbar]:hidden touch-pan-y select-none',
            dragging ? 'cursor-grabbing' : 'cursor-grab',
          )
        "
        data-brand-marquee-viewport
        role="group"
        aria-label="Danh sách thương hiệu nổi bật"
        @pointerdown="startDrag"
        @pointermove="moveDrag"
        @pointerup="finishDrag"
        @pointercancel="cancelDrag"
      >
        <div
          :key="props.selectedBrandId ?? 'marquee'"
          class="brand-marquee-track flex w-max gap-2.5"
          :style="{ animationPlayState: marqueeRunning ? 'running' : 'paused' }"
          data-brand-marquee-track
        >
          <template v-for="copy in 5" :key="copy">
            <button
              v-for="brand in featuredBrands"
              :key="copy + '-' + brand.id"
              type="button"
              :tabindex="copy === 1 ? 0 : -1"
              :aria-hidden="copy === 2 ? 'true' : undefined"
              :aria-label="
                copy === 1 ? 'Lọc theo thương hiệu ' + brand.name : undefined
              "
              :aria-pressed="
                copy === 1 ? props.selectedBrandId === brand.id : undefined
              "
              :data-brand-id="brand.id"
              :data-brand-copy="copy"
              :class="
                cn(
                  'motion-interactive flex h-20 w-44 shrink-0 items-center justify-center rounded-xl border bg-[#f7faf8] px-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:w-48',
                  props.selectedBrandId === brand.id
                    ? 'border-primary-700 bg-primary-50 ring-2 ring-primary-700/15'
                    : 'border-primary-100 hover:border-primary-300 hover:bg-primary-50/70',
                )
              "
              data-brand-item
              @click="selectBrand(brand.id, $event)"
            >
              <img
                :src="brand.logoUrl"
                :alt="brand.name"
                class="max-h-12 max-w-full object-contain"
                loading="lazy"
                draggable="false"
                data-brand-logo
                @error="markLogoFailed(brand.id)"
              />
            </button>
          </template>
        </div>
      </div>
    </section>
  </section>
</template>

<style scoped>
@keyframes brand-marquee-scroll {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(calc(-50% - 0.3125rem));
  }
}

.brand-marquee-track {
  animation: brand-marquee-scroll 38s linear infinite;
  will-change: transform;
}

@media (prefers-reduced-motion: reduce) {
  .brand-marquee-track {
    animation: none;
    transform: none;
  }
}
</style>
