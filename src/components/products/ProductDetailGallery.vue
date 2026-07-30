<script setup lang="ts">
import { Image, Search } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import type { ProductDetailImage } from '@/types/products'
import { cn } from '@/utils/cn'

const props = defineProps<{
  images: readonly ProductDetailImage[]
}>()

const selectedImageId = ref(props.images[0]?.id ?? '')
const selectedImage = computed(
  () => props.images.find((image) => image.id === selectedImageId.value) ?? props.images[0],
)

const toneClasses: Record<ProductDetailImage['tone'], string> = {
  sage: 'from-[#dcebe3] to-[#f7fbf8]',
  mint: 'from-[#dff2ec] to-[#fbfdfc]',
  sand: 'from-[#f2e8d8] to-[#fffdf8]',
  rose: 'from-[#f0e0df] to-[#fffafa]',
  sky: 'from-[#dfeaf0] to-[#fbfdff]',
}

watch(
  () => props.images,
  (images) => {
    if (!images.some((image) => image.id === selectedImageId.value)) {
      selectedImageId.value = images[0]?.id ?? ''
    }
  },
)
</script>

<template>
  <section class="min-w-0" aria-label="Thư viện hình ảnh sản phẩm" data-product-gallery>
    <div
      v-if="selectedImage"
      :class="cn(
        'relative grid aspect-square max-h-[36rem] w-full place-items-center overflow-hidden rounded-[2rem] border border-primary-100 bg-gradient-to-br',
        toneClasses[selectedImage.tone],
      )"
      :aria-label="selectedImage.alt"
      role="img"
      :data-main-image-id="selectedImage.id"
    >
      <div class="grid size-[56%] place-items-center rounded-[2.5rem] border border-white/80 bg-white/55 text-primary-700 shadow-sm">
        <Image class="size-20 opacity-70 sm:size-28" aria-hidden="true" />
      </div>
      <span class="absolute bottom-5 left-5 rounded-full bg-white/88 px-3 py-1.5 text-body-sm font-medium text-primary-900 shadow-xs">
        {{ selectedImage.label }}
      </span>
      <Search class="absolute right-5 top-5 size-5 text-primary-700" aria-hidden="true" />
    </div>

    <div
      class="mt-3 grid grid-cols-5 gap-2"
      role="list"
      aria-label="Chọn hình ảnh sản phẩm"
    >
      <button
        v-for="image in props.images"
        :key="image.id"
        type="button"
        :class="cn(
          'motion-interactive grid aspect-square min-w-0 place-items-center rounded-2xl border bg-gradient-to-br text-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          toneClasses[image.tone],
          selectedImageId === image.id
            ? 'border-primary-700 ring-2 ring-primary-200'
            : 'border-primary-100 hover:border-primary-400',
        )"
        :aria-label="`Xem ảnh ${image.label}`"
        :aria-pressed="selectedImageId === image.id"
        :data-thumbnail-id="image.id"
        @click="selectedImageId = image.id"
      >
        <Image class="size-5 sm:size-7" aria-hidden="true" />
      </button>
    </div>
  </section>
</template>
