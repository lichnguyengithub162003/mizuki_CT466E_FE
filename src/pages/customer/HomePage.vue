<script setup lang="ts">
import {
  HomeBrandShowcase,
  HomeCategorySidebar,
  HomeFlashSale,
  HomeHeroSlider,
  HomeProductSection,
  HomePromotionGrid,
  HomeQuickLinks,
} from '@/components/home'
import CustomerLayout from '@/layouts/CustomerLayout.vue'
import {
  featuredProducts,
  flashSaleProducts,
  homeBrands,
  homeCategories,
  homeHeroSlides,
  homePromotions,
  homeQuickLinks,
  recommendedProducts,
} from '@/data/home/homeDemoData'
</script>

<template>
  <CustomerLayout>
    <div class="mx-auto w-full max-w-[90rem] px-4 py-5 sm:px-5 md:py-7 lg:px-7">
      <div class="grid items-start gap-4 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <HomeCategorySidebar class="lg:row-span-2" :categories="homeCategories" />
        <HomeHeroSlider :slides="homeHeroSlides" />
        <section
          class="lg:col-start-2"
          aria-labelledby="home-quick-links-title"
          data-home-quick-links-row
        >
          <h2 id="home-quick-links-title" class="sr-only">Truy cập nhanh</h2>
          <HomeQuickLinks :links="homeQuickLinks" />
        </section>
      </div>

      <HomeFlashSale class="mt-7" :products="flashSaleProducts" />

      <HomeProductSection
        id="featured"
        class="py-9"
        title="Sản phẩm nổi bật"
        description="Lựa chọn minh họa được quan tâm tại Mizuki"
        :products="featuredProducts"
      />

      <HomeBrandShowcase :brands="homeBrands" />

      <HomePromotionGrid class="py-9" :promotions="homePromotions" />

      <HomeProductSection
        id="recommended"
        class="pb-12"
        title="Gợi ý cho bạn"
        description="Danh sách demo để hoàn thiện nền tảng trang chủ"
        :products="recommendedProducts"
      />
    </div>
  </CustomerLayout>
</template>
