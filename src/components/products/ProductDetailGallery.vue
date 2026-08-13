<script setup lang="ts">
import { Image } from "@lucide/vue";
import { computed, ref, watch } from "vue";
import { PRODUCT_LISTING_FALLBACK_IMAGE } from "@/api/productListingAdapter";
import type { ProductDetailImage } from "@/types/products";
import { cn } from "@/utils/cn";

const props = defineProps<{
  images: readonly ProductDetailImage[];
}>();

const selectedImageId = ref(props.images[0]?.id ?? "");
const failedImages = ref<ReadonlySet<string>>(new Set());

const selectedImage = computed(
  () =>
    props.images.find((image) => image.id === selectedImageId.value) ??
    props.images[0],
);

const apiOrigin =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/api\/v1\/?$/, "") ||
  "http://localhost:8000";

const commitments = [
  {
    id: "nowfree",
    title: "Giao Nhanh Miễn Phí 2H. Trễ tặng 100K",
    imageUrl: `${apiOrigin}/storage/catalog/transports/nowfree.png`,
  },
  {
    id: "authentic",
    title: "Mizuki đền bù 100% hãng đền bù 100% nếu phát hiện hàng giả",
    imageUrl: `${apiOrigin}/storage/catalog/transports/authentic.png`,
  },
  {
    id: "freeship",
    title:
      "Giao Hàng Miễn Phí (từ 90K tại 60 Tỉnh Thành trừ huyện, toàn Quốc từ 249K)",
    imageUrl: `${apiOrigin}/storage/catalog/transports/freeship.png`,
  },
  {
    id: "return",
    title: "Đổi trả trong 30 ngày",
    imageUrl: `${apiOrigin}/storage/catalog/transports/return.png`,
  },
] as const;

function imageSource(image: ProductDetailImage): string | undefined {
  if (!image.imageUrl) return undefined;
  return failedImages.value.has(image.id)
    ? PRODUCT_LISTING_FALLBACK_IMAGE
    : image.imageUrl;
}

function markImageFailed(imageId: string): void {
  if (failedImages.value.has(imageId)) return;
  failedImages.value = new Set([...failedImages.value, imageId]);
}

watch(
  () => props.images,
  (images) => {
    if (!images.some((image) => image.id === selectedImageId.value)) {
      selectedImageId.value = images[0]?.id ?? "";
    }
  },
);
</script>

<template>
  <section
    class="min-w-0"
    aria-label="Thư viện hình ảnh sản phẩm"
    data-product-gallery
  >
    <div class="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_8rem]">
      <div
        v-if="selectedImage"
        class="relative grid h-72 w-full place-items-center overflow-hidden rounded-[1.75rem] border border-primary-100 bg-white sm:h-80 md:h-[23rem] lg:h-[25rem] xl:h-[27rem]"
        :aria-label="selectedImage.alt"
        role="img"
        :data-main-image-id="selectedImage.id"
        data-gallery-frame
      >
        <img
          v-if="imageSource(selectedImage)"
          :src="imageSource(selectedImage)"
          :alt="selectedImage.alt"
          class="absolute inset-0 size-full object-contain p-2 sm:p-2.5"
          width="720"
          height="720"
          data-detail-main-image
          @error="markImageFailed(selectedImage.id)"
        />
        <div
          v-else
          class="grid size-[56%] place-items-center rounded-[2.25rem] border border-white/80 bg-white/55 text-primary-700 shadow-sm"
        >
          <Image class="size-20 opacity-70 sm:size-24" aria-hidden="true" />
        </div>
      </div>

      <div
        class="gallery-scrollbar grid grid-cols-5 gap-3 lg:max-h-[27rem] lg:grid-cols-1 lg:auto-rows-[6rem] lg:overflow-y-auto lg:pr-5.25"
        role="list"
        aria-label="Chọn hình ảnh sản phẩm"
        data-gallery-thumbnails
      >
        <button
          v-for="image in props.images"
          :key="image.id"
          type="button"
          :class="
            cn(
              'motion-interactive relative aspect-square min-w-0 place-items-center overflow-hidden rounded border bg-white text-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              selectedImageId === image.id
                ? 'border-primary-700 ring-2 ring-primary-200'
                : 'border-primary-100 hover:border-primary-400',
            )
          "
          :aria-label="`Xem ảnh ${image.label}`"
          :aria-pressed="selectedImageId === image.id"
          :data-thumbnail-id="image.id"
          @click="selectedImageId = image.id"
        >
          <img
            v-if="imageSource(image)"
            :src="imageSource(image)"
            :alt="image.alt"
            class="absolute inset-0 size-full rounded-xl object-contain p-1"
            width="96"
            height="96"
            @error="markImageFailed(image.id)"
          />
          <Image v-else class="size-5 sm:size-6" aria-hidden="true" />
        </button>
      </div>
    </div>

    <div
      class="mt-0 overflow-hidden rounded-[1.75rem] bg-white"
      aria-label="Cam kết mua hàng"
      data-product-commitments
    >
      <div
        v-for="commitment in commitments"
        :key="commitment.title"
        class="flex items-center gap-3 px-4 py-1.5 last:border-b-0 sm:px-5"
      >
        <div
          class="grid size-10 shrink-0 place-items-center rounded-full text-primary-700"
          aria-hidden="true"
        >
          <img
            :src="commitment.imageUrl"
            :alt="commitment.title"
            class="size-full object-contain"
          />
        </div>
        <div class="min-w-0">
          <p class="text-body-sm font-semibold text-primary-950">
            {{ commitment.title }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.gallery-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}

.gallery-scrollbar:hover {
  scrollbar-color: #8b8b8b transparent;
}

.gallery-scrollbar::-webkit-scrollbar {
  width: 3px;
}

.gallery-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.gallery-scrollbar::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: 999px;
}

.gallery-scrollbar:hover::-webkit-scrollbar-thumb {
  background: #8b8b8b;
}
</style>