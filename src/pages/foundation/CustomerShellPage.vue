<script setup lang="ts">
import {
  CustomerCategoryHighlights,
  CustomerHeroBanners,
} from '@/components/customer-shell'
import CustomerLayout from '@/layouts/CustomerLayout.vue'
</script>

<template>
  <CustomerLayout>
    <div class="mx-auto w-full max-w-[90rem] px-4 py-5 sm:px-5 md:py-7 lg:px-7">
      <CustomerHeroBanners />
      <CustomerCategoryHighlights />

      <section class="pb-10" aria-labelledby="product-preview-title">
        <div>
          <p class="text-caption uppercase tracking-[0.12em] text-primary-700">Kiểm tra khoảng cách</p>
          <h2 id="product-preview-title" class="mt-1 text-heading-3">Khung sản phẩm trung tính</h2>
        </div>
        <div class="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          <article
            v-for="index in 4"
            :key="index"
            class="overflow-hidden rounded-2xl border border-border bg-surface shadow-xs"
            aria-label="Thẻ sản phẩm trình diễn"
          >
            <div class="aspect-[4/3] bg-surface-subtle p-4">
              <div class="h-full rounded-xl bg-primary-100/55"></div>
            </div>
            <div class="grid gap-2 p-4">
              <div class="h-3 w-3/4 rounded-pill bg-border"></div>
              <div class="h-3 w-1/2 rounded-pill bg-primary-100"></div>
            </div>
          </article>
        </div>
      </section>
    </div>
  </CustomerLayout>
</template>
