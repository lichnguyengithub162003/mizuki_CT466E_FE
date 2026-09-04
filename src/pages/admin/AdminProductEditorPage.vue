<script setup lang="ts">
import { computed, nextTick, reactive, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseTextarea from '@/components/common/BaseTextarea.vue'
import { AdminPageHeader, AdminDetailSection, AdminFormActions, AdminErrorState, AdminImagePicker } from '@/components/admin'
import { createAdminRecord, getAdminList, updateAdminRecord } from '@/api/adminApi'
import { useAdminDetail, useAdminMutation } from '@/queries/admin'
import type { AdminRecord } from '@/types/admin'
import { isApplicationError } from '@/types/admin'

const props = defineProps<{ mode: 'create' | 'edit' }>()
const route = useRoute(); const router = useRouter(); const id = computed(() => String(route.params.id || ''))
const detail = useAdminDetail<AdminRecord>('products', id)
const categories = useQuery({ queryKey: ['admin', 'lookups', 'categories'], queryFn: () => getAdminList<AdminRecord>('categories', { per_page: 100 }) })
const brands = useQuery({ queryKey: ['admin', 'lookups', 'brands'], queryFn: () => getAdminList<AdminRecord>('brands', { per_page: 100 }) })
const errors = reactive<Record<string, string>>({})
type KeyValueEntry = { key: string; value: string }
type AdminImageValue = { image_url?: string | null; upload_token?: string | null; preview_url?: string | null }
type ProductImageForm = AdminImageValue & { id?: number; product_variant_id?: number | null; alt_text: string; sort_order: number; is_primary: boolean }
type ProductVariantForm = Record<string, any> & AdminImageValue & { id?: number; name: string; attributes: KeyValueEntry[] }
type ProductForm = Record<string, any> & { specifications: KeyValueEntry[]; images: ProductImageForm[]; variants: ProductVariantForm[] }
const form = reactive<ProductForm>({
  category_id: null, brand_id: null, name: '', slug: '', short_description: '', description: '', ingredients: '', usage_instructions: '', specifications: [{ key: '', value: '' }], origin_country: '', is_active: true, is_featured: false,
  images: [{ image_url: null, upload_token: null, preview_url: null, alt_text: '', sort_order: 0, is_primary: true }],
  variants: [{ name: 'Mặc định', sku: '', barcode: '', attributes: [{ key: '', value: '' }], image_url: null, upload_token: null, preview_url: null, price: 0, sale_price: null, weight: 0, sort_order: 0, is_active: true }],
})
const objectEntries = (value: Record<string, unknown> | null | undefined) => Object.entries(value ?? {}).map(([key, entry]) => ({ key, value: typeof entry === 'string' ? entry : JSON.stringify(entry) }))
watch(() => detail.data.value, product => {
  if (!product || props.mode !== 'edit') return
  Object.assign(form, product, { specifications: objectEntries(product.specifications) })
  if (!form.specifications.length) form.specifications = [{ key: '', value: '' }]
  form.images = product.images?.filter((image: any) => !image.product_variant_id).map((image: any) => ({ ...image, upload_token: null, preview_url: null })) ?? []
  if (!form.images.length) form.images = [{ image_url: null, upload_token: null, preview_url: null, alt_text: '', sort_order: 0, is_primary: true }]
  form.variants = product.variants.map((variant: any) => {
    const image = product.images?.find((entry: any) => entry.product_variant_id === variant.id)
    return { ...variant, image_url: image?.image_url ?? null, upload_token: null, preview_url: null, attributes: objectEntries(variant.attributes) }
  })
}, { immediate: true })
function setImageValue(target: AdminImageValue, value: AdminImageValue): void {
  target.image_url = value.image_url ?? null
  target.upload_token = value.upload_token ?? null
  target.preview_url = value.preview_url ?? null
}
function imageSource(value: AdminImageValue): { upload_token: string } | { image_url: string } | null {
  if (value.upload_token) return { upload_token: value.upload_token }
  if (value.image_url) return { image_url: value.image_url }
  return null
}
const mutation = useAdminMutation<AdminRecord, Record<string, any>>('products', payload => props.mode === 'create' ? createAdminRecord('products', payload) : updateAdminRecord('products', id.value, payload))
function entriesObject(field: string, entries: Array<{ key: string; value: string }>): Record<string, string> {
  const result: Record<string, string> = {}
  for (const entry of entries) {
    const key = entry.key.trim()
    if (!key && entry.value.trim()) errors[field] = 'Vui lòng nhập tên thuộc tính.'
    if (key && key in result) errors[field] = `Thuộc tính “${key}” bị trùng.`
    if (key) result[key] = entry.value.trim()
  }
  return result
}
async function submit(): Promise<void> {
  if (mutation.isPending.value) return
  Object.keys(errors).forEach(key => delete errors[key])
  if (!form.variants.length) errors.variants = 'Sản phẩm phải có ít nhất một biến thể.'
  const specifications = entriesObject('specifications', form.specifications)
  const variants = form.variants.map((variant: any, index: number) => {
    if (variant.sale_price != null && Number(variant.sale_price) > Number(variant.price)) errors[`variants.${index}.sale_price`] = 'Giá bán không được vượt giá gốc.'
    const attributes = entriesObject(`variants.${index}.attributes`, variant.attributes)
    const { effective_price: __, inventory: ___, image_url: ____, upload_token: _____, preview_url: ______, ...rest } = variant
    return { ...rest, attributes }
  })
  if (Object.keys(errors).length) { await nextTick(); document.querySelector<HTMLElement>(`[name="${CSS.escape(Object.keys(errors)[0] ?? '')}"]`)?.focus(); return }
  const payload = {
    category_id: Number(form.category_id), brand_id: Number(form.brand_id), name: form.name, slug: form.slug,
    short_description: form.short_description || null, description: form.description || null, ingredients: form.ingredients || null,
    usage_instructions: form.usage_instructions || null, specifications, origin_country: form.origin_country || null,
    is_active: Boolean(form.is_active), is_featured: Boolean(form.is_featured), variants,
    images: [
      ...form.images.flatMap((image) => {
        const source = imageSource(image)
        if (!source || image.product_variant_id) return []
        return [{ ...source, alt_text: image.alt_text, sort_order: image.sort_order, is_primary: image.is_primary }]
      }),
      ...form.variants.flatMap((variant, index) => {
        const source = imageSource(variant)
        if (!source) return []
        const variantReference = variant.id ? { product_variant_id: Number(variant.id) } : { variant_index: index }
        return [{ ...source, ...variantReference, alt_text: `${form.name} - ${variant.name}`, sort_order: 0, is_primary: true }]
      }),
    ],
  }
  try { const product = await mutation.mutateAsync(payload); await router.push(`/admin/products/${product.id}`) }
  catch (error) {
    if (isApplicationError(error) && error.validationErrors) {
      for (const [key, messages] of Object.entries(error.validationErrors)) errors[key] = messages[0] ?? 'Không hợp lệ'
      await nextTick(); document.querySelector<HTMLElement>(`[name="${CSS.escape(Object.keys(errors)[0] ?? '')}"]`)?.focus()
    }
  }
}
function addVariant(): void { form.variants.push({ name: '', sku: '', barcode: '', image_url: null, upload_token: null, preview_url: null, attributes: [{ key: '', value: '' }], price: 0, sale_price: null, weight: 0, sort_order: form.variants.length, is_active: true }) }
function addImage(): void { form.images.push({ image_url: null, upload_token: null, preview_url: null, alt_text: '', sort_order: form.images.length, is_primary: false }) }
</script>

<template>
  <AdminPageHeader :title="mode === 'create' ? 'Tạo sản phẩm' : 'Chỉnh sửa sản phẩm'" :breadcrumbs="[{label:'Sản phẩm',to:'/admin/products'},{label:mode==='create'?'Tạo mới':'Chỉnh sửa'}]"/>
  <AdminErrorState v-if="mode === 'edit' && detail.isError.value" :not-found="isApplicationError(detail.error.value) && detail.error.value.kind === 'not-found'" @retry="detail.refetch()"/>
  <form v-else class="grid gap-5" novalidate @submit.prevent="submit">
    <AdminDetailSection title="Thông tin cơ bản"><div class="grid gap-4 sm:grid-cols-2"><BaseInput v-model="form.name" name="name" label="Tên" :error="errors.name" required/><BaseInput v-model="form.slug" name="slug" label="Slug" :error="errors.slug" required/><label class="grid gap-1 text-body-sm font-medium">Danh mục<select v-model="form.category_id" name="category_id" class="h-11 rounded-xl border border-border bg-surface px-3" required><option :value="null">Chọn danh mục</option><option v-for="category in categories.data.value?.items" :key="category.id" :value="category.id">{{ category.name }}</option></select><span v-if="errors.category_id" class="text-caption text-red-600">{{ errors.category_id }}</span></label><label class="grid gap-1 text-body-sm font-medium">Thương hiệu<select v-model="form.brand_id" name="brand_id" class="h-11 rounded-xl border border-border bg-surface px-3" required><option :value="null">Chọn thương hiệu</option><option v-for="brand in brands.data.value?.items" :key="brand.id" :value="brand.id">{{ brand.name }}</option></select><span v-if="errors.brand_id" class="text-caption text-red-600">{{ errors.brand_id }}</span></label><BaseInput v-model="form.origin_country" name="origin_country" label="Xuất xứ"/><BaseTextarea v-model="form.short_description" label="Mô tả ngắn" class="sm:col-span-2"/><label class="flex gap-2 text-body-sm"><input v-model="form.is_active" type="checkbox">Đang hoạt động</label><label class="flex gap-2 text-body-sm"><input v-model="form.is_featured" type="checkbox">Nổi bật</label></div></AdminDetailSection>
    <AdminDetailSection title="Nội dung và thông số"><div class="grid gap-4"><BaseTextarea v-model="form.description" label="Mô tả"/><BaseTextarea v-model="form.ingredients" label="Thành phần"/><BaseTextarea v-model="form.usage_instructions" label="Hướng dẫn sử dụng"/><fieldset class="grid gap-2"><legend class="text-body-sm font-medium">Thông số sản phẩm</legend><div v-for="(entry,index) in form.specifications" :key="index" class="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><BaseInput v-model="entry.key" :name="`specifications.${index}.key`" label="Tên thông số"/><BaseInput v-model="entry.value" :name="`specifications.${index}.value`" label="Giá trị"/><button v-if="form.specifications.length > 1" type="button" class="self-end px-3 py-3 text-body-sm font-semibold text-red-600" @click="form.specifications.splice(index,1)">Bỏ</button></div><p v-if="errors.specifications" class="text-caption text-red-600">{{ errors.specifications }}</p><button type="button" class="justify-self-start rounded-lg border border-border px-3 py-2 text-body-sm font-semibold" @click="form.specifications.push({key:'',value:''})">Thêm thông số</button></fieldset></div></AdminDetailSection>
    <AdminDetailSection title="Hình ảnh sản phẩm"><div class="grid gap-3"><article v-for="(image,index) in form.images" :key="image.id ?? index" class="grid gap-3 rounded-xl bg-surface-subtle p-4 sm:grid-cols-2"><AdminImagePicker :model-value="image" :label="`Ảnh sản phẩm ${index + 1}`" :error="errors[`images.${index}.upload_token`] || errors[`images.${index}.image_url`]" @update:model-value="setImageValue(image, $event)"/><div class="grid content-start gap-3"><BaseInput v-model="image.alt_text" :name="`images.${index}.alt_text`" label="Mô tả ảnh"/><label class="flex gap-2 text-body-sm"><input v-model="image.is_primary" type="checkbox">Ảnh chính</label><button v-if="form.images.length > 1" type="button" class="text-left text-body-sm font-semibold text-red-600" @click="form.images.splice(index,1)">Bỏ ảnh</button></div></article><button type="button" class="justify-self-start rounded-lg border border-border px-4 py-2 text-body-sm font-semibold" @click="addImage">Thêm ảnh</button></div></AdminDetailSection>
    <AdminDetailSection title="Biến thể" description="Mỗi biến thể có thể có ảnh riêng; nếu bỏ trống sẽ dùng ảnh chính của sản phẩm."><p v-if="errors.variants" class="mb-3 text-body-sm text-red-600">{{ errors.variants }}</p><div class="grid gap-4"><article v-for="(variant,index) in form.variants" :key="variant.id ?? index" class="grid gap-3 rounded-xl bg-surface-subtle p-4 sm:grid-cols-2 lg:grid-cols-4"><BaseInput v-model="variant.name" :name="`variants.${index}.name`" label="Tên" :error="errors[`variants.${index}.name`]"/><BaseInput v-model="variant.sku" :name="`variants.${index}.sku`" label="SKU" :error="errors[`variants.${index}.sku`]"/><BaseInput v-model="variant.barcode" :name="`variants.${index}.barcode`" label="Barcode" :error="errors[`variants.${index}.barcode`]"/><BaseInput v-model="variant.price" :name="`variants.${index}.price`" label="Giá" type="number" min="0" :error="errors[`variants.${index}.price`]"/><BaseInput v-model="variant.sale_price" :name="`variants.${index}.sale_price`" label="Giá bán" type="number" min="0" :max="variant.price" :error="errors[`variants.${index}.sale_price`]"/><BaseInput v-model="variant.weight" :name="`variants.${index}.weight`" label="Khối lượng (g)" type="number" min="0" :error="errors[`variants.${index}.weight`]"/><fieldset class="grid gap-2 sm:col-span-2 lg:col-span-4"><legend class="text-body-sm font-medium">Thuộc tính biến thể</legend><div v-for="(entry,attributeIndex) in variant.attributes" :key="attributeIndex" class="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><BaseInput v-model="entry.key" :name="`variants.${index}.attributes.${attributeIndex}.key`" label="Tên thuộc tính"/><BaseInput v-model="entry.value" :name="`variants.${index}.attributes.${attributeIndex}.value`" label="Giá trị"/><button v-if="variant.attributes.length > 1" type="button" class="self-end px-3 py-3 text-body-sm font-semibold text-red-600" @click="variant.attributes.splice(attributeIndex,1)">Bỏ</button></div><p v-if="errors[`variants.${index}.attributes`]" class="text-caption text-red-600">{{ errors[`variants.${index}.attributes`] }}</p><button type="button" class="justify-self-start rounded-lg border border-border px-3 py-2 text-body-sm font-semibold" @click="variant.attributes.push({key:'',value:''})">Thêm thuộc tính</button></fieldset><AdminImagePicker :model-value="variant" :label="`Ảnh biến thể ${variant.name || index + 1}`" :error="errors[`variants.${index}.image_url`]" class="sm:col-span-2" @update:model-value="setImageValue(variant, $event)"/><label class="flex gap-2 text-body-sm"><input v-model="variant.is_active" type="checkbox">Hoạt động</label><button v-if="form.variants.length > 1" type="button" class="text-left text-body-sm font-semibold text-red-600" @click="form.variants.splice(index,1)">Bỏ biến thể</button></article><button type="button" class="justify-self-start rounded-lg border border-border px-4 py-2 text-body-sm font-semibold" @click="addVariant">Thêm biến thể</button></div></AdminDetailSection>
    <p v-if="mutation.isError.value && !Object.keys(errors).length" role="alert" class="rounded-xl bg-red-50 p-3 text-red-700">{{ isApplicationError(mutation.error.value) ? mutation.error.value.message : 'Không thể lưu sản phẩm.' }}</p>
    <AdminFormActions :pending="mutation.isPending.value" :submit-label="mode === 'create' ? 'Tạo sản phẩm' : 'Lưu sản phẩm'" @cancel="router.push('/admin/products')"/>
  </form>
</template>
