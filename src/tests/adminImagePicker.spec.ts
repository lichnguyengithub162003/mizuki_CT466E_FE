import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import AdminImagePicker from '@/components/admin/AdminImagePicker.vue'
import AdminProductEditorPage from '@/pages/admin/AdminProductEditorPage.vue'

const mocks = vi.hoisted(() => ({
  upload: vi.fn(),
  mutateAsync: vi.fn(),
  push: vi.fn(),
  detail: null as Record<string, unknown> | null,
}))
vi.mock('@/api/adminApi', () => ({
  uploadAdminImage: mocks.upload,
  createAdminRecord: vi.fn(),
  updateAdminRecord: vi.fn(),
  getAdminList: vi.fn(),
}))
vi.mock('@/queries/admin', () => ({
  useAdminDetail: () => ({ data: { value: mocks.detail }, isError: { value: false }, error: { value: null }, refetch: vi.fn() }),
  useAdminMutation: () => ({ isPending: { value: false }, isError: { value: false }, error: { value: null }, mutateAsync: mocks.mutateAsync }),
}))
vi.mock('@tanstack/vue-query', () => ({
  useQuery: () => ({ data: { value: { items: [] } } }),
}))
vi.mock('vue-router', async (importOriginal) => ({
  ...await importOriginal<typeof import('vue-router')>(),
  useRoute: () => ({ params: { id: '88' } }),
  useRouter: () => ({ push: mocks.push }),
}))

describe('AdminImagePicker', () => {
  const uploaded = {
    upload_token: '123e4567-e89b-12d3-a456-426614174000',
    preview_url: 'https://res.cloudinary.com/mizuki/image/upload/staging/qa.webp',
    mime_type: 'image/webp',
    size: 12,
  }

  beforeEach(() => {
    mocks.upload.mockReset().mockResolvedValue(uploaded)
    mocks.mutateAsync.mockReset().mockResolvedValue({ id: 88 })
    mocks.push.mockReset()
    mocks.detail = null
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:qa-preview'), revokeObjectURL: vi.fn() })
  })

  it('uploads a selected file and emits the staging token with its UI-only preview', async () => {
    const wrapper = mount(AdminImagePicker, { props: { label: 'Ảnh QA' } })
    const file = new File(['image'], 'qa.webp', { type: 'image/webp' })
    Object.defineProperty(wrapper.get('input[type="file"]').element, 'files', { value: [file] })
    await wrapper.get('input[type="file"]').trigger('change')
    await vi.waitFor(() => expect(mocks.upload).toHaveBeenCalledWith(file))
    const value = wrapper.emitted('update:modelValue')?.at(-1)?.[0] as {
      image_url: null
      upload_token: string
      preview_url: string
    }
    expect(value).toEqual({ image_url: null, upload_token: uploaded.upload_token, preview_url: uploaded.preview_url })
    expect(value).not.toHaveProperty('url')
    await wrapper.setProps({ modelValue: value })
    expect(wrapper.get('img').attributes('src')).toBe(uploaded.preview_url)
  })

  it('rejects unsupported file types before upload', async () => {
    const wrapper = mount(AdminImagePicker)
    const file = new File(['text'], 'qa.txt', { type: 'text/plain' })
    Object.defineProperty(wrapper.get('input[type="file"]').element, 'files', { value: [file] })
    await wrapper.get('input[type="file"]').trigger('change')
    expect(mocks.upload).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP.')
  })

  it('keeps a persisted image URL backward-compatible for preview', () => {
    const wrapper = mount(AdminImagePicker, { props: { modelValue: { image_url: '/catalog/existing.webp' } } })
    expect(wrapper.get('img').attributes('src')).toBe('/catalog/existing.webp')
  })

  it('clears persisted and staged image state when removing the image', async () => {
    const wrapper = mount(AdminImagePicker, {
      props: { modelValue: { image_url: null, upload_token: uploaded.upload_token, preview_url: uploaded.preview_url } },
    })
    const remove = wrapper.findAll('button').find(button => button.text().includes('Bỏ ảnh'))
    expect(remove).toBeDefined()
    await remove!.trigger('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([{
      image_url: null,
      upload_token: null,
      preview_url: null,
    }])
  })
})

describe('AdminProductEditorPage media serialization', () => {
  const productToken = '123e4567-e89b-12d3-a456-426614174001'
  const variantToken = '123e4567-e89b-12d3-a456-426614174002'

  beforeEach(() => {
    mocks.mutateAsync.mockReset().mockResolvedValue({ id: 88 })
    mocks.push.mockReset()
    mocks.detail = null
  })

  it('serializes staged product and new-variant images only through payload.images', async () => {
    const wrapper = mount(AdminProductEditorPage, {
      props: { mode: 'create' },
      global: { stubs: { RouterLink: true } },
    })
    const pickers = wrapper.findAllComponents(AdminImagePicker)
    expect(pickers).toHaveLength(2)
    pickers[0]!.vm.$emit('update:modelValue', { image_url: null, upload_token: productToken, preview_url: 'https://preview.test/product.webp' })
    pickers[1]!.vm.$emit('update:modelValue', { image_url: null, upload_token: variantToken, preview_url: 'https://preview.test/variant.webp' })
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    const payload = mocks.mutateAsync.mock.calls[0]?.[0]
    expect(payload.images).toEqual([
      { upload_token: productToken, alt_text: '', sort_order: 0, is_primary: true },
      { upload_token: variantToken, variant_index: 0, alt_text: ' - Mặc định', sort_order: 0, is_primary: true },
    ])
    expect(payload.images).not.toEqual(expect.arrayContaining([expect.objectContaining({ preview_url: expect.anything() })]))
    expect(payload.variants[0]).not.toHaveProperty('upload_token')
    expect(payload.variants[0]).not.toHaveProperty('preview_url')
    expect(payload.variants[0]).not.toHaveProperty('image_url')
  })

  it('keeps persisted product URLs and targets a staged existing-variant image by product_variant_id', async () => {
    mocks.detail = {
      id: 88,
      category_id: 2,
      brand_id: 3,
      name: 'Serum QA',
      slug: 'serum-qa',
      specifications: {},
      images: [
        { id: 7, product_variant_id: null, image_url: '/catalog/product.webp', alt_text: 'Serum QA', sort_order: 0, is_primary: true },
        { id: 8, product_variant_id: 42, image_url: '/catalog/variant.webp', alt_text: 'Serum QA - 30ml', sort_order: 0, is_primary: true },
      ],
      variants: [{ id: 42, name: '30ml', sku: 'SERUM-30', barcode: null, attributes: {}, price: 100000, sale_price: null, weight: 30, sort_order: 0, is_active: true }],
    }
    const wrapper = mount(AdminProductEditorPage, {
      props: { mode: 'edit' },
      global: { stubs: { RouterLink: true } },
    })
    const pickers = wrapper.findAllComponents(AdminImagePicker)
    pickers[1]!.vm.$emit('update:modelValue', { image_url: null, upload_token: variantToken, preview_url: 'https://preview.test/variant.webp' })
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    const payload = mocks.mutateAsync.mock.calls[0]?.[0]
    expect(payload.images).toEqual([
      { image_url: '/catalog/product.webp', alt_text: 'Serum QA', sort_order: 0, is_primary: true },
      { upload_token: variantToken, product_variant_id: 42, alt_text: 'Serum QA - 30ml', sort_order: 0, is_primary: true },
    ])
    expect(payload.images[1]).not.toHaveProperty('variant_index')
    expect(payload.images[1]).not.toHaveProperty('preview_url')
  })
})
