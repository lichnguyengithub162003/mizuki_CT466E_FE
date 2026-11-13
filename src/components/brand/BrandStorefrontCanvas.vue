<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { Image as ImageIcon } from '@lucide/vue'
import type { AdminBrandStorefrontConfig } from '@/types/adminBrand'

interface Identity {
  name: string
  description: string | null
  logo_url: string | null
  logo_rendition_url: string | null
  banner_image: string | null
  banner_rendition_url: string | null
  mobile_banner_image?: string | null
  supporting_image?: string | null
  origin_country?: string | null
  follower_count: number
}
interface Product { id: number; name: string; slug: string; image_url: string | null; price?: number | string | null }
interface Offer { id: number; name: string; code: string | null; discount_type: string; discount_value: number; ends_at: string | null }
const props = withDefaults(defineProps<{
  brand: Identity
  config: AdminBrandStorefrontConfig | null
  featuredProducts: Product[]
  promotions: Offer[]
  products: Product[]
  preview?: boolean
  viewport?: 'desktop' | 'mobile'
}>(), { preview: false, viewport: 'desktop' })
const logoFailed = ref(false)
const bannerFailed = ref(false)
watch(() => props.brand.logo_url, () => { logoFailed.value = false })
watch(() => [props.config?.assets, props.brand.banner_rendition_url, props.brand.banner_image, props.brand.mobile_banner_image, props.viewport], () => { bannerFailed.value = false }, { deep: true })
const sections = computed(() => props.config?.sections ?? ['vouchers', 'featured', 'story'])
const desktopBanner = computed(() => props.config?.assets && 'desktop_banner' in props.config.assets
  ? props.config.assets.desktop_banner : props.brand.banner_rendition_url || props.brand.banner_image)
const mobileBanner = computed(() => props.config?.assets && 'mobile_banner' in props.config.assets
  ? props.config.assets.mobile_banner : props.brand.mobile_banner_image)
const supportingImage = computed(() => props.config?.assets && 'supporting_image' in props.config.assets
  ? props.config.assets.supporting_image : props.brand.supporting_image)
const gallery = computed(() => props.config?.preset === 'gallery')
const mobilePreview = computed(() => props.viewport === 'mobile')
const heroImage = computed(() => Boolean(desktopBanner.value || mobileBanner.value))
const heroBanner = computed(() => props.preview && mobilePreview.value ? mobileBanner.value || desktopBanner.value : desktopBanner.value || mobileBanner.value)
function money(value: number | string): string { return `${Number(value).toLocaleString('vi-VN')} ₫` }
function originLabel(value: string): string {
  return /^[a-z]{2}$/i.test(value) ? new Intl.DisplayNames(['vi'], { type: 'region' }).of(value.toUpperCase()) || value : value
}
</script>

<template>
  <div class="brand-canvas min-w-0 overflow-hidden bg-[#f7f9f6] text-primary-950" :class="mobilePreview ? 'brand-canvas-mobile' : ''" data-testid="brand-storefront-canvas">
    <header class="brand-hero" :class="[gallery ? 'brand-hero-showcase' : 'brand-hero-editorial', heroImage && !bannerFailed ? 'brand-hero-has-image' : 'brand-hero-empty']">
      <picture v-if="heroImage && !bannerFailed" class="brand-hero-image" aria-hidden="true"><source v-if="!preview && mobileBanner" media="(max-width: 639px)" :srcset="mobileBanner"><img :src="heroBanner!" alt="" @error="bannerFailed = true"></picture>
      <div v-if="heroImage && !bannerFailed" class="brand-hero-overlay" aria-hidden="true" />
      <div class="brand-hero-identity">
        <span class="brand-hero-logo"><img v-if="!logoFailed && (brand.logo_rendition_url || brand.logo_url)" :src="brand.logo_rendition_url || brand.logo_url!" :alt="`Logo ${brand.name}`" @error="logoFailed = true"><ImageIcon v-else class="size-7" /></span>
        <div class="brand-hero-copy"><p class="brand-hero-eyebrow">Thương hiệu tại Mizuki</p><h1>{{ brand.name }}</h1><p class="brand-hero-followers"><span v-if="brand.origin_country">{{ originLabel(brand.origin_country) }} · </span>{{ brand.follower_count.toLocaleString('vi-VN') }} người theo dõi</p></div>
      </div>
    </header>
    <nav class="flex gap-5 overflow-x-auto border-b border-primary-100 bg-white px-5 text-xs font-semibold text-primary-800 sm:px-7" aria-label="Gian hàng thương hiệu"><a href="#brand-home" class="shrink-0 border-b-2 border-primary-700 py-3">Gian hàng</a><a href="#brand-products" class="shrink-0 py-3 hover:text-primary-950">Sản phẩm</a><a v-if="sections.includes('story')" href="#brand-story" class="shrink-0 py-3 hover:text-primary-950">Câu chuyện</a></nav>
    <div id="brand-home" class="space-y-7 p-4 sm:p-6">
      <template v-for="section in sections" :key="section">
        <section v-if="section === 'vouchers' && (promotions.length || preview)"><div class="mb-3 flex items-end justify-between"><h2 class="text-sm font-semibold sm:text-base">Ưu đãi thương hiệu</h2><span class="text-xs text-muted-foreground">Áp dụng theo điều kiện ưu đãi</span></div><div v-if="preview" class="flex gap-3 overflow-hidden pb-1" aria-label="Thẻ ưu đãi minh họa"><div v-for="n in 2" :key="n" class="min-w-40 flex-1 rounded-xl border border-primary-100 bg-white p-3"><span class="block h-3 w-2/3 rounded bg-primary-100" /><span class="mt-3 block h-2 w-1/2 rounded bg-primary-50" /></div></div><div v-else-if="promotions.length" class="flex gap-3 overflow-x-auto pb-1"><article v-for="offer in promotions" :key="offer.id" class="min-w-48 flex-1 rounded-xl border border-primary-100 bg-white p-3 shadow-xs"><p class="line-clamp-2 text-sm font-semibold">{{ offer.name }}</p><p v-if="offer.code" class="mt-2 text-xs font-medium text-primary-700">Mã {{ offer.code }}</p><p v-if="offer.ends_at" class="mt-1 text-[0.6875rem] text-muted-foreground">Đến {{ new Date(offer.ends_at).toLocaleDateString('vi-VN') }}</p></article></div><p v-else class="rounded-xl border border-dashed border-primary-200 bg-white p-4 text-xs text-muted-foreground">Chưa có ưu đãi đang hiệu lực để hiển thị.</p></section>
        <section v-else-if="section === 'featured' && (featuredProducts.length || preview)"><h2 class="mb-3 text-sm font-semibold sm:text-base">Sản phẩm nổi bật</h2><div v-if="preview" class="grid gap-3" :class="mobilePreview ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'" aria-label="Thẻ sản phẩm nổi bật minh họa"><div v-for="n in 4" :key="n" class="min-w-0 rounded-xl border border-primary-100 bg-white p-2"><div class="aspect-square rounded-lg bg-gradient-to-br from-[#edf3ef] to-[#f5eee7]" /><span class="mt-2 block h-2 w-3/4 rounded bg-primary-100" /><span class="mt-2 block h-2 w-1/2 rounded bg-primary-50" /></div></div><div v-else-if="featuredProducts.length" class="grid gap-3" :class="mobilePreview ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'"><RouterLink v-for="item in featuredProducts" :key="item.id" :to="`/products/${item.slug}`" class="min-w-0 overflow-hidden rounded-xl border border-primary-100 bg-white p-2 shadow-xs transition hover:border-primary-300"><span class="grid aspect-square place-items-center overflow-hidden rounded-lg bg-primary-50 text-primary-300"><img v-if="item.image_url" :src="item.image_url" :alt="item.name" class="size-full object-contain"><ImageIcon v-else class="size-7" /></span><span class="mt-2 line-clamp-2 block text-xs font-semibold">{{ item.name }}</span><span v-if="item.price != null" class="mt-1 block text-xs font-semibold text-rose-700">{{ money(item.price) }}</span></RouterLink></div><p v-else class="rounded-xl border border-dashed border-primary-200 bg-white p-4 text-xs text-muted-foreground">Chưa chọn sản phẩm nổi bật.</p></section>
        <section v-else-if="section === 'story' && (config?.intro || brand.description || preview)" id="brand-story" class="grid items-center gap-4 rounded-2xl bg-white p-5 ring-1 ring-primary-100" :class="gallery && supportingImage ? 'sm:grid-cols-2' : ''"><div><p class="text-[0.6875rem] font-semibold uppercase tracking-[.14em] text-primary-600">Về thương hiệu</p><h2 class="mt-1 text-base font-semibold">Câu chuyện {{ brand.name }}</h2><p class="mt-3 whitespace-pre-wrap text-sm leading-6 text-primary-800">{{ config?.intro || brand.description || 'Chưa có lời giới thiệu.' }}</p></div><img v-if="gallery && supportingImage" :src="supportingImage" alt="Ảnh phụ thương hiệu" class="max-h-56 w-full rounded-xl object-cover"></section>
      </template>
      <img v-if="supportingImage && !gallery" :src="supportingImage" alt="Ảnh phụ thương hiệu" class="max-h-64 w-full rounded-2xl object-cover">
      <section id="brand-products"><h2 class="mb-3 text-sm font-semibold sm:text-base">Tất cả sản phẩm</h2><div v-if="preview" class="grid gap-3" :class="mobilePreview ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'" aria-label="Thẻ danh mục sản phẩm minh họa"><div v-for="n in 4" :key="n" class="min-w-0 rounded-xl border border-primary-100 bg-white p-2"><div class="aspect-square rounded-lg bg-gradient-to-br from-[#edf3ef] to-[#f5eee7]" /><span class="mt-2 block h-2 w-3/4 rounded bg-primary-100" /><span class="mt-2 block h-2 w-1/2 rounded bg-primary-50" /></div></div><div v-else-if="products.length" class="grid gap-3" :class="mobilePreview ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'"><RouterLink v-for="item in products" :key="item.id" :to="`/products/${item.slug}`" class="min-w-0 overflow-hidden rounded-xl border border-primary-100 bg-white p-2 shadow-xs transition hover:border-primary-300"><span class="grid aspect-square place-items-center overflow-hidden rounded-lg bg-primary-50 text-primary-300"><img v-if="item.image_url" :src="item.image_url" :alt="item.name" class="size-full object-contain"><ImageIcon v-else class="size-7" /></span><span class="mt-2 line-clamp-2 block text-xs font-semibold">{{ item.name }}</span><span v-if="item.price != null" class="mt-1 block text-xs font-semibold text-rose-700">{{ money(item.price) }}</span></RouterLink></div><p v-else-if="preview" class="rounded-xl border border-dashed border-primary-200 bg-white p-4 text-xs text-muted-foreground">Sản phẩm đang bán sẽ xuất hiện tại đây.</p><slot name="catalog-feedback" /></section>
    </div>
  </div>
</template>

<style scoped>
.brand-canvas { container-type: inline-size; }
.brand-hero { position: relative; isolation: isolate; width: 100%; min-width: 0; height: clamp(19rem, 50cqi, 39rem); overflow: hidden; background: linear-gradient(125deg, #e7f0e9, #f5efe2); }
.brand-hero-image, .brand-hero-overlay { position: absolute; inset: 0; display: block; }
.brand-hero-image img { display: block; width: 100%; height: 100%; object-fit: cover; }
.brand-hero-overlay { z-index: 1; pointer-events: none; }
.brand-hero-editorial .brand-hero-image img { object-position: 58% 44%; }
.brand-hero-editorial .brand-hero-overlay { background: linear-gradient(0deg, rgb(9 33 25 / 88%) 0%, rgb(12 38 29 / 56%) 22%, transparent 65%), linear-gradient(90deg, rgb(12 38 29 / 24%), transparent 30%), linear-gradient(270deg, rgb(12 38 29 / 15%), transparent 25%); }
.brand-hero-showcase { height: clamp(19rem, 43cqi, 34rem); }
.brand-hero-showcase .brand-hero-image img { object-position: 68% center; }
.brand-hero-showcase .brand-hero-overlay { background: linear-gradient(90deg, #e9f1e9 0%, rgb(233 241 233 / 98%) 24%, rgb(233 241 233 / 73%) 42%, rgb(233 241 233 / 20%) 64%, transparent 80%), linear-gradient(0deg, rgb(233 241 233 / 20%), transparent 14%); }
.brand-hero-identity { position: absolute; z-index: 2; display: flex; align-items: center; gap: 1.15rem; min-width: 0; padding: clamp(1.25rem, 4cqi, 3.5rem); }
.brand-hero-editorial .brand-hero-identity { inset: auto 0 0; max-width: min(76%, 52rem); color: #fffdf6; text-shadow: 0 2px 14px rgb(6 24 18 / 28%); }
.brand-hero-showcase .brand-hero-identity { inset: 0 auto 0 0; width: min(58%, 44rem); color: #173b30; }
.brand-hero-logo { display: grid; width: clamp(4rem, 7cqi, 5.5rem); aspect-ratio: 1; flex: none; place-items: center; overflow: hidden; border: 1px solid rgb(255 255 255 / 75%); border-radius: 1rem; background: white; padding: .55rem; color: #547764; box-shadow: 0 8px 28px rgb(22 58 44 / 13%); }
.brand-hero-logo img { width: 100%; height: 100%; object-fit: contain; }
.brand-hero-copy { min-width: 0; }
.brand-hero-eyebrow { font-size: .68rem; font-weight: 600; letter-spacing: .16em; text-transform: uppercase; opacity: .8; }
.brand-hero-copy h1 { margin-top: .3rem; overflow-wrap: anywhere; color: inherit; font-size: clamp(2.2rem, 4.7cqi, 3.5rem); font-weight: 700; line-height: 1.12; letter-spacing: -.035em; }
.brand-hero-followers { margin-top: .55rem; font-size: .8rem; font-weight: 500; opacity: .85; }
.brand-hero-empty { height: auto; min-height: 11rem; }
.brand-hero-empty .brand-hero-identity { position: relative; inset: auto; width: 100%; max-width: none; min-height: 11rem; color: #173b30; text-shadow: none; }
@container (max-width: 680px) {
  .brand-hero-has-image { height: clamp(24rem, 110cqi, 35rem); }
  .brand-hero-editorial .brand-hero-image img { object-position: 62% center; }
  .brand-hero-editorial .brand-hero-overlay { background: linear-gradient(0deg, rgb(9 33 25 / 90%) 0%, rgb(12 38 29 / 58%) 28%, transparent 72%), linear-gradient(90deg, rgb(12 38 29 / 20%), transparent 42%); }
  .brand-hero-showcase .brand-hero-image img { object-position: 68% center; }
  .brand-hero-showcase .brand-hero-overlay { background: linear-gradient(0deg, #e9f1e9 0%, rgb(233 241 233 / 96%) 22%, rgb(233 241 233 / 64%) 43%, transparent 75%), linear-gradient(90deg, rgb(233 241 233 / 32%), transparent 60%); }
  .brand-hero-identity { gap: .75rem; padding: 1.25rem; }
  .brand-hero-editorial .brand-hero-identity, .brand-hero-showcase .brand-hero-identity { inset: auto 0 0; width: 100%; max-width: none; }
  .brand-hero-logo { width: 3.75rem; }
  .brand-hero-copy h1 { font-size: clamp(2rem, 8cqi, 2.75rem); }
}
.brand-canvas-mobile .brand-hero-has-image { height: clamp(24rem, 110cqi, 35rem); }
.brand-canvas-mobile .brand-hero-showcase .brand-hero-overlay { background: linear-gradient(0deg, #e9f1e9 0%, rgb(233 241 233 / 96%) 22%, rgb(233 241 233 / 64%) 43%, transparent 75%), linear-gradient(90deg, rgb(233 241 233 / 32%), transparent 60%); }
.brand-canvas-mobile .brand-hero-identity { inset: auto 0 0; width: 100%; max-width: none; padding: 1.25rem; }
.brand-canvas-mobile .brand-hero-logo { width: 3.75rem; }
.brand-canvas-mobile .brand-hero-copy h1 { font-size: clamp(2rem, 8cqi, 2.75rem); }
.brand-canvas-mobile nav { gap: 1rem; }
</style>
