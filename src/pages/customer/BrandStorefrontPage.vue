<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { RefreshCw } from '@lucide/vue'
import CustomerLayout from '@/layouts/CustomerLayout.vue'
import BrandStorefrontCanvas from '@/components/brand/BrandStorefrontCanvas.vue'
import { getBrandStorefront, getProductListing } from '@/api/productListingApi'
import type { ProductListingItemDto, PublicBrandStorefrontDto } from '@/api/productListingApi'

const route = useRoute()
const slug = computed(() => String(route.params.slug ?? ''))
const brand = ref<PublicBrandStorefrontDto | null>(null)
const products = ref<ProductListingItemDto[]>([])
const page = ref(1)
const lastPage = ref(1)
const loading = ref(true)
const productsLoading = ref(false)
const error = ref('')
const productsError = ref('')
let brandSequence = 0
let productSequence = 0
const cards = computed(() => products.value.map(item => ({
  id: item.id, name: item.name, slug: item.slug,
  image_url: item.primary_image_card_url ?? item.primary_image_url,
  price: item.price,
})))

async function loadBrand(): Promise<void> {
  const current = ++brandSequence
  loading.value = true; error.value = ''; brand.value = null; products.value = []
  try {
    const result = await getBrandStorefront(slug.value)
    if (current !== brandSequence) return
    page.value = 1
    brand.value = result
    void loadProducts()
  } catch { if (current === brandSequence) error.value = 'Không thể tải gian hàng thương hiệu.' }
  finally { if (current === brandSequence) loading.value = false }
}
async function loadProducts(): Promise<void> {
  if (!brand.value) return
  const current = ++productSequence
  productsLoading.value = true; productsError.value = ''
  try {
    const result = await getProductListing({ brand_id: brand.value.id, sort: 'newest', page: page.value, per_page: 12 })
    if (current !== productSequence) return
    products.value = result.data
    lastPage.value = result.meta.pagination.last_page
  } catch { if (current === productSequence) productsError.value = 'Không thể tải sản phẩm thương hiệu.' }
  finally { if (current === productSequence) productsLoading.value = false }
}
watch(slug, () => { productSequence++; void loadBrand() }, { immediate: true })
watch(page, () => { if (brand.value) void loadProducts() })
onBeforeUnmount(() => { brandSequence++; productSequence++ })
</script>

<template>
  <CustomerLayout><main class="mx-auto w-full max-w-[90rem] px-4 py-6 sm:px-6 lg:px-8" data-testid="brand-storefront">
    <div v-if="loading" role="status" class="rounded-2xl bg-white p-8 text-sm text-primary-800">Đang tải gian hàng…</div>
    <div v-else-if="error" role="alert" class="rounded-2xl bg-white p-8 text-center text-sm text-red-800">{{ error }} <button type="button" class="font-semibold text-primary-700" @click="loadBrand"><RefreshCw class="inline size-4" /> Thử lại</button></div>
    <template v-else-if="brand"><BrandStorefrontCanvas :brand="brand" :config="brand.storefront" :featured-products="brand.featured_products" :promotions="brand.promotions ?? []" :products="cards"><template #catalog-feedback><p v-if="productsLoading" role="status" class="mt-3 text-sm text-primary-700">Đang tải sản phẩm…</p><p v-else-if="productsError" role="alert" class="mt-3 text-sm text-red-800">{{ productsError }} <button type="button" class="font-semibold text-primary-700" @click="loadProducts">Thử lại</button></p><p v-else-if="!products.length" class="mt-3 text-sm text-primary-700">Chưa có sản phẩm đang bán.</p></template></BrandStorefrontCanvas><div v-if="lastPage > 1" class="mt-5 flex items-center justify-center gap-4 text-sm"><button type="button" :disabled="page <= 1 || productsLoading" @click="page--">Trước</button><span>Trang {{ page }} / {{ lastPage }}</span><button type="button" :disabled="page >= lastPage || productsLoading" @click="page++">Tiếp</button></div></template>
  </main></CustomerLayout>
</template>
