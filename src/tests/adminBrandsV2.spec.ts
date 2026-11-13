import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AdminBrandsListPage from '@/pages/admin/AdminBrandsListPage.vue'
import AdminBrandDetailPage from '@/pages/admin/AdminBrandDetailPage.vue'
import AdminBrandsTrashPage from '@/pages/admin/AdminBrandsTrashPage.vue'
import AdminBrandStorefrontTab from '@/components/admin/AdminBrandStorefrontTab.vue'
import AdminBrandPromotionsTab from '@/components/admin/AdminBrandPromotionsTab.vue'
import AdminBrandEditorPage from '@/pages/admin/AdminBrandEditorPage.vue'
import BrandStorefrontCanvas from '@/components/brand/BrandStorefrontCanvas.vue'
import BaseTooltip from '@/components/common/BaseTooltip.vue'
import { useAuthStore } from '@/stores/auth'
import { pinia } from '@/stores/pinia'
import type { AdminBrandRecord, AdminBrandStorefrontConfig } from '@/types/adminBrand'

const mocks = vi.hoisted(() => ({
  getAdminBrands: vi.fn(), getAdminBrand: vi.fn(), getAdminBrandProducts: vi.fn(),
  getAdminBrandEvents: vi.fn(), getAdminBrandTrash: vi.fn(), restoreAdminBrand: vi.fn(),
  getAdminBrandStorefront: vi.fn(), saveAdminBrandStorefrontDraft: vi.fn(),
  publishAdminBrandStorefront: vi.fn(), discardAdminBrandStorefrontDraft: vi.fn(),
  getAdminBrandPromotions: vi.fn(), associateAdminBrandPromotion: vi.fn(), dissociateAdminBrandPromotion: vi.fn(),
  getAdminBrandOriginCountries: vi.fn(), getAdminBrandPromotionOptions: vi.fn(),
  setAdminBrandFeaturedProduct: vi.fn(),
  updateAdminBrand: vi.fn(),
}))
vi.mock('@/api/adminApi', async original => ({ ...(await original()), ...mocks }))
const brand: AdminBrandRecord = {
  id: 8, name: 'Hoa Việt', slug: 'hoa-viet', logo_url: null, logo_rendition_url: null,
  banner_image: null, banner_rendition_url: null, description: 'Chăm sóc làn da',
  follower_count: 2, product_count: 1, is_active: true, status: 'published',
  origin_country: 'VN', official_website: null, established_year: null, joined_at: null,
  seo_title: null, seo_description: null, partner_name: null, partner_relationship: null,
  partnership_started_at: null, created_at: null, updated_at: null,
}
const pagination = { current_page: 1, last_page: 1, per_page: 20, total: 1 }

function login(role: 'super_admin' | 'branch_manager' = 'super_admin') {
  useAuthStore(pinia).$patch({ user: {
    id: 2, name: 'QA', email: 'qa@example.test', phone: null, avatar: null,
    role, role_label: role, branch_id: null, email_verified_at: null, created_at: '',
  }, isInitialized: true })
}
async function mountPage(component: typeof AdminBrandsListPage | typeof AdminBrandDetailPage | typeof AdminBrandsTrashPage | typeof AdminBrandEditorPage, path: string) {
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/admin/brands', name: 'admin-brands', component: AdminBrandsListPage },
    { path: '/admin/brands/trash', component: AdminBrandsTrashPage },
    { path: '/admin/brands/create', component: AdminBrandEditorPage },
    { path: '/admin/brands/:id', component: AdminBrandDetailPage },
    { path: '/products/:slug', component: { template: '<div />' } },
  ] })
  await router.push(path)
  const wrapper = mount(component, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}
beforeEach(() => {
  vi.clearAllMocks()
  localStorage.removeItem('admin.brands.visibleColumns')
  useAuthStore(pinia).resetForTesting()
  mocks.getAdminBrands.mockResolvedValue({ items: [brand], pagination })
  mocks.getAdminBrandOriginCountries.mockResolvedValue(['VN'])
  mocks.getAdminBrandPromotionOptions.mockResolvedValue({ items: [{ id: 5, name: 'Mùa thu', code: 'THU', is_active: true }], pagination })
  mocks.getAdminBrand.mockResolvedValue(brand)
  mocks.getAdminBrandProducts.mockResolvedValue({ items: [], pagination: { ...pagination, per_page: 15 } })
  mocks.getAdminBrandEvents.mockResolvedValue({ items: [], pagination })
  mocks.getAdminBrandTrash.mockResolvedValue({ items: [{ ...brand, deleted_at: '2026-11-11T00:00:00Z', deletion_mode: 'brand_only' }], pagination })
  mocks.restoreAdminBrand.mockResolvedValue({ brand, restored_product_count: 0 })
  mocks.getAdminBrandStorefront.mockResolvedValue({ published: null, draft: null })
  mocks.getAdminBrandPromotions.mockResolvedValue({ items: [{ id: 5, name: 'Mùa thu', code: 'THU', discount_type: 'percent', discount_value: 10, starts_at: '2026-11-01T00:00:00Z', ends_at: null, usage_count: 3, status: 'active', show_on_storefront: false }], pagination })
  mocks.associateAdminBrandPromotion.mockResolvedValue({ promotion_id: 5 })
  mocks.dissociateAdminBrandPromotion.mockResolvedValue({ promotion_id: 5 })
  mocks.setAdminBrandFeaturedProduct.mockResolvedValue({})
  mocks.updateAdminBrand.mockResolvedValue({ ...brand, status: 'hidden' })
  mocks.saveAdminBrandStorefrontDraft.mockImplementation(async (_id: number, draft: unknown) => ({ draft }))
  mocks.publishAdminBrandStorefront.mockResolvedValue({ published: { preset: 'gallery', intro: null, sections: ['story', 'featured'] } })
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})
afterEach(() => {
  vi.restoreAllMocks()
})

describe('Admin Brands V2', () => {
  it('opens the complete Brand row with mouse and keyboard', async () => {
    login()
    const { wrapper, router } = await mountPage(AdminBrandsListPage, '/admin/brands')
    await wrapper.get('[data-testid="brand-row-8"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/admin/brands/8')
    await router.push('/admin/brands')
    await flushPromises()
    await wrapper.get('[data-testid="brand-row-8"]').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/admin/brands/8')
  })

  it('constrains long names without losing the full accessible title', async () => {
    login()
    const name = 'Thương hiệu chăm sóc sắc đẹp có tên dài để kiểm tra bảng'
    mocks.getAdminBrands.mockResolvedValue({ items: [{ ...brand, name }], pagination })
    const { wrapper } = await mountPage(AdminBrandsListPage, '/admin/brands')
    const row = wrapper.get('[data-testid="brand-row-8"]')
    expect(row.get('[title]').attributes('title')).toBe(name)
    expect(row.get('[title]').classes()).toContain('truncate')
    expect(row.attributes('aria-label')).toContain(name)
  })

  it('uses complete origin options from the server', async () => {
    login()
    mocks.getAdminBrandOriginCountries.mockResolvedValue(['VN', 'JP'])
    const { wrapper } = await mountPage(AdminBrandsListPage, '/admin/brands')
    expect(mocks.getAdminBrandOriginCountries).toHaveBeenCalledOnce()
    await wrapper.get('[data-testid="brands-filter-trigger"]').trigger('click')
    await flushPromises()
    expect(document.body.querySelector('select[aria-label="Lọc xuất xứ thương hiệu"]')?.textContent).toContain('JP')
  })

  it('preserves server search, filter, sorting and pagination from the URL', async () => {
    login()
    const { router } = await mountPage(AdminBrandsListPage, '/admin/brands?search=hoa&origin_country=VN&product_count_max=0&sort=product_count&direction=desc&page=3')
    expect(mocks.getAdminBrands).toHaveBeenCalledWith(expect.objectContaining({
      search: 'hoa', origin_country: 'VN', product_count_max: 0,
      sort: 'product_count', direction: 'desc', page: 3,
    }))
    expect(router.currentRoute.value.query.search).toBe('hoa')
  })

  it('updates the unsaved Create profile preview as the name changes', async () => {
    login()
    const { wrapper } = await mountPage(AdminBrandEditorPage, '/admin/brands/create')
    await wrapper.get('input[name="name"]').setValue('Mizuki Test')
    expect(wrapper.get('[data-testid="brand-profile-preview"]').text()).toContain('Mizuki Test')
  })

  it('offers keyboard-focusable SEO help without changing form values', async () => {
    login()
    const { wrapper } = await mountPage(AdminBrandEditorPage, '/admin/brands/create')
    expect(wrapper.get('button[aria-label="Giải thích tiêu đề SEO"]').attributes('type')).toBe('button')
    expect(wrapper.get('button[aria-label="Giải thích mô tả SEO"]').attributes('type')).toBe('button')
    expect(wrapper.findAllComponents(BaseTooltip).map(item => item.props('content')).join(' ')).toContain('50 Megumi')
    expect((wrapper.get('input[name="seo_title"]').element as HTMLInputElement).value).toBe('')
  })

  it('uses server Brand list filters and keeps create/trash actions role aware', async () => {
    login()
    mocks.getAdminBrands.mockResolvedValueOnce({ items: [{ ...brand, logo_url: '/logo.png' }], pagination })
    const { wrapper } = await mountPage(AdminBrandsListPage, '/admin/brands?search=hoa&page=2&status=published')
    expect(mocks.getAdminBrands).toHaveBeenCalledWith(expect.objectContaining({ search: 'hoa', page: 2, status: 'published' }))
    expect(wrapper.get('img').classes()).toContain('object-contain')
    expect(wrapper.find('[data-testid="brands-create-link"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="brands-trash-link"]').exists()).toBe(true)
    login('branch_manager')
    const reader = await mountPage(AdminBrandsListPage, '/admin/brands')
    expect(reader.wrapper.find('[data-testid="brands-create-link"]').exists()).toBe(false)
    expect(reader.wrapper.find('[data-testid="brands-trash-link"]').exists()).toBe(false)
  })

  it('loads Product and Audit data only after their authorized tabs open', async () => {
    login()
    const { wrapper } = await mountPage(AdminBrandDetailPage, '/admin/brands/8')
    expect(mocks.getAdminBrandProducts).not.toHaveBeenCalled()
    expect(mocks.getAdminBrandEvents).not.toHaveBeenCalled()
    await wrapper.get('[data-testid="brand-tab-products"]').trigger('click')
    await flushPromises()
    expect(mocks.getAdminBrandProducts).toHaveBeenCalledWith(8, 1, '')
    await wrapper.get('[data-testid="brand-tab-audit"]').trigger('click')
    await flushPromises()
    expect(mocks.getAdminBrandEvents).toHaveBeenCalledWith(8, 1, '')
  })

  it('shows real product imagery and toggles the featured star separately from its link', async () => {
    login()
    mocks.getAdminBrandProducts.mockResolvedValue({ items: [{ id: 21, name: 'Kem dưỡng', slug: 'kem-duong', is_active: true, brand_featured_sort_order: null, primary_image_thumb_url: '/product.png' }], pagination })
    const { wrapper } = await mountPage(AdminBrandDetailPage, '/admin/brands/8')
    await wrapper.get('[data-testid="brand-tab-products"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('img[src="/product.png"]').attributes('alt')).toBe('')
    expect(wrapper.get('a[href="/products/kem-duong"]').text()).toContain('Kem dưỡng')
    await wrapper.get('button[aria-label="Đánh dấu nổi bật"]').trigger('click')
    await flushPromises()
    expect(mocks.setAdminBrandFeaturedProduct).toHaveBeenCalledWith(8, 21, true)
  })

  it('presents audit events in Vietnamese without exposing raw event codes', async () => {
    login()
    mocks.getAdminBrandEvents.mockResolvedValue({ items: [{ id: 1, action: 'created', changes: {}, actor: { id: 2, name: 'QA' }, created_at: '2026-11-11T00:00:00Z' }], pagination })
    const { wrapper } = await mountPage(AdminBrandDetailPage, '/admin/brands/8')
    await wrapper.get('[data-testid="brand-tab-audit"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('ol').text()).toContain('Đã tạo thương hiệu')
    expect(wrapper.get('ol').text()).toContain('QA')
    expect(wrapper.get('ol').text()).not.toContain('created')
  })

  it('requires confirmation before restoring a Brand from Trash', async () => {
    login()
    const { wrapper } = await mountPage(AdminBrandsTrashPage, '/admin/brands/trash')
    await wrapper.findAll('button').find(button => button.text().includes('Khôi phục'))!.trigger('click')
    expect(mocks.restoreAdminBrand).not.toHaveBeenCalled()
    await wrapper.get('[data-testid="brand-restore-confirm"]').trigger('click')
    await flushPromises()
    expect(mocks.restoreAdminBrand).toHaveBeenCalledWith(8, false)
  })

  it('keeps storefront draft private until an explicit publish', async () => {
    login()
    mocks.getAdminBrandStorefront.mockResolvedValueOnce({
      published: { preset: 'editorial', intro: 'Lời giới thiệu công khai', sections: ['story', 'featured'] },
      draft: { preset: 'editorial', intro: 'Lời giới thiệu bản nháp', sections: ['story', 'featured'] },
      featured_products: [], promotions: [],
    })
    const wrapper = mount(AdminBrandStorefrontTab, { props: { brand } })
    await flushPromises()
    expect(wrapper.get('[data-testid="brand-storefront-designer"]').text()).toContain('Xem trước trực tiếp')
    expect(mocks.getAdminBrandProducts).not.toHaveBeenCalled()
    expect(wrapper.get('[aria-label="Thẻ sản phẩm nổi bật minh họa"]').findAll('img')).toHaveLength(0)
    expect(wrapper.get('[data-testid="brand-storefront-canvas"]').text()).toContain('Lời giới thiệu bản nháp')
    await wrapper.get('textarea').setValue('Đang chỉnh sửa trong bộ nhớ')
    expect(wrapper.get('[data-testid="brand-storefront-canvas"]').text()).toContain('Đang chỉnh sửa trong bộ nhớ')
    expect(wrapper.get('[data-testid="brand-storefront-canvas"] header').classes()).toContain('brand-hero-editorial')
    await wrapper.findAll('input[type="radio"]')[1]!.setValue()
    expect(wrapper.get('[data-testid="brand-storefront-canvas"] header').classes()).toContain('brand-hero-showcase')
    await wrapper.findAll('button').find(button => button.text().includes('Lưu bản nháp'))!.trigger('click')
    await flushPromises()
    expect(mocks.saveAdminBrandStorefrontDraft).toHaveBeenCalledWith(8, expect.objectContaining({ preset: 'gallery' }))
    expect(mocks.publishAdminBrandStorefront).not.toHaveBeenCalled()
    expect(mocks.getAdminBrandStorefront).toHaveBeenCalledTimes(1)
    expect(mocks.getAdminBrandStorefront).toHaveBeenCalledWith(8, true)
    expect(mocks.getAdminBrandProducts).not.toHaveBeenCalled()
  })

  it('keeps unsaved Designer edits and explains an expired media token', async () => {
    login()
    mocks.saveAdminBrandStorefrontDraft.mockRejectedValueOnce({
      name: 'ApplicationError', kind: 'validation', status: 422,
      validationErrors: { mobile_banner_upload_token: ['Invalid token'] },
      message: 'Dữ liệu không hợp lệ', cause: null,
    })
    const wrapper = mount(AdminBrandStorefrontTab, { props: { brand } })
    await flushPromises()
    await wrapper.get('textarea').setValue('Bản nháp cần giữ lại')
    await wrapper.findAll('button').find(button => button.text().includes('Lưu bản nháp'))!.trigger('click')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('Ảnh tải lên không hợp lệ')
    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('Bản nháp cần giữ lại')
    expect(wrapper.findAll('button').find(button => button.text().includes('Lưu bản nháp'))!.attributes('disabled')).toBeUndefined()
  })

  it('renders supplied real products in public canvas mode without preview placeholders', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/products/:slug', component: { template: '<div />' } }] })
    const wrapper = mount(BrandStorefrontCanvas, { props: {
      brand, config: { preset: 'editorial', intro: null, sections: ['featured'] },
      featuredProducts: [{ id: 21, name: 'Kem dưỡng', slug: 'kem-duong', image_url: '/product.png' }],
      promotions: [], products: [],
    }, global: { plugins: [router] } })
    expect(wrapper.get('img[src="/product.png"]').attributes('alt')).toBe('Kem dưỡng')
    expect(wrapper.find('[aria-label="Thẻ sản phẩm nổi bật minh họa"]').exists()).toBe(false)
  })

  it('uses the selected mobile banner in mobile design preview', () => {
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/products/:slug', component: { template: '<div />' } }] })
    const wrapper = mount(BrandStorefrontCanvas, { props: {
      brand, config: { preset: 'gallery', intro: null, sections: ['featured'], assets: { desktop_banner: '/desktop.png', mobile_banner: '/mobile.png' } },
      featuredProducts: [], promotions: [], products: [], preview: true, viewport: 'mobile',
    }, global: { plugins: [router] } })
    expect(wrapper.find('header img[src="/mobile.png"]').exists()).toBe(true)
  })

  it('keeps Brand identity inside one full-bleed Hero in both responsive presets', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/products/:slug', component: { template: '<div />' } }] })
    const longName = 'Thương hiệu chăm sóc sắc đẹp và sức khỏe Mizuki'
    const identity = { ...brand, name: longName, logo_url: '/logo.png' }
    const config: AdminBrandStorefrontConfig = { preset: 'editorial', intro: null, sections: ['story'], assets: { desktop_banner: '/wide.png', mobile_banner: '/tall.png' } }
    const wrapper = mount(BrandStorefrontCanvas, { props: {
      brand: identity, config, featuredProducts: [], promotions: [], products: [], preview: true, viewport: 'desktop',
    }, global: { plugins: [router] } })
    expect(wrapper.get('header').classes()).toContain('brand-hero-editorial')
    expect(wrapper.get('header h1').text()).toBe(longName)
    expect(wrapper.get('.brand-hero-followers').text()).toContain('Việt Nam')
    expect(wrapper.get('.brand-hero-image img').attributes('src')).toBe('/wide.png')
    expect(wrapper.findAll('.brand-hero-image img')).toHaveLength(1)
    expect(wrapper.get('.brand-hero-overlay').attributes('aria-hidden')).toBe('true')
    expect(wrapper.find('.brand-hero-backdrop').exists()).toBe(false)
    expect(wrapper.get('.brand-hero-logo img').attributes('alt')).toBe(`Logo ${longName}`)

    await wrapper.setProps({ config: { ...config, preset: 'gallery' }, viewport: 'mobile' })
    expect(wrapper.get('header').classes()).toContain('brand-hero-showcase')
    expect(wrapper.get('[data-testid="brand-storefront-canvas"]').classes()).toContain('brand-canvas-mobile')
    expect(wrapper.get('.brand-hero-image img').attributes('src')).toBe('/tall.png')
    expect(wrapper.get('header h1').text()).toBe(longName)

    await wrapper.setProps({ brand: { ...identity, logo_url: null }, config: { ...config, assets: { desktop_banner: null, mobile_banner: null } } })
    expect(wrapper.get('header').classes()).toContain('brand-hero-empty')
    expect(wrapper.find('.brand-hero-image').exists()).toBe(false)
    expect(wrapper.find('.brand-hero-logo img').exists()).toBe(false)
  })

  it('requires the styled Hide dialog and retains status after API failure', async () => {
    login()
    mocks.updateAdminBrand.mockRejectedValueOnce(new Error('network'))
    const { wrapper } = await mountPage(AdminBrandDetailPage, '/admin/brands/8')
    await wrapper.findAll('button').find(button => button.text() === 'Ẩn')!.trigger('click')
    await flushPromises()
    expect(mocks.updateAdminBrand).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('Đơn đã hoàn thành được giữ nguyên')
    document.body.querySelector<HTMLButtonElement>('[data-testid="brand-status-confirm"]')!.click()
    await flushPromises()
    expect(mocks.updateAdminBrand).toHaveBeenCalledWith(8, { status: 'hidden' })
    expect(wrapper.text()).toContain('Đã xuất bản')
    expect(document.body.textContent).toContain('Không thể cập nhật trạng thái thương hiệu')
    document.body.querySelectorAll<HTMLButtonElement>('button').forEach(button => { if (button.textContent?.trim() === 'Hủy') button.click() })
  })

  it('cancels Hide without mutation and updates the status only after confirmation', async () => {
    login()
    const { wrapper } = await mountPage(AdminBrandDetailPage, '/admin/brands/8')
    await wrapper.findAll('button').find(button => button.text() === 'Ẩn')!.trigger('click')
    await flushPromises()
    const cancel = [...document.body.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.trim() === 'Hủy')
    cancel!.click()
    await flushPromises()
    expect(mocks.updateAdminBrand).not.toHaveBeenCalled()
    await wrapper.findAll('button').find(button => button.text() === 'Ẩn')!.trigger('click')
    await flushPromises()
    document.body.querySelector<HTMLButtonElement>('[data-testid="brand-status-confirm"]')!.click()
    await flushPromises()
    expect(mocks.updateAdminBrand).toHaveBeenCalledOnce()
    expect(wrapper.text()).toContain('Đã ẩn')
  })

  it('loads real linked promotions only when the authorized tab opens', async () => {
    login()
    const { wrapper } = await mountPage(AdminBrandDetailPage, '/admin/brands/8')
    expect(mocks.getAdminBrandPromotions).not.toHaveBeenCalled()
    await wrapper.get('[data-testid="brand-tab-promotions"]').trigger('click')
    await flushPromises()
    expect(mocks.getAdminBrandPromotions).toHaveBeenCalledWith(8, { search: '', status: '', page: 1 })
    expect(wrapper.get('[data-testid="brand-promotions"]').text()).toContain('Mùa thu')
  })

  it('filters, links and exposes only explicit storefront promotions', async () => {
    const wrapper = mount(AdminBrandPromotionsTab, { props: { brandId: 8 } })
    await flushPromises()
    await wrapper.get('[aria-label="Lọc trạng thái ưu đãi"]').trigger('click')
    await flushPromises()
    const activeOption = [...document.body.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.trim() === 'Đang chạy')
    expect(activeOption).toBeDefined()
    activeOption!.click()
    await flushPromises()
    expect(mocks.getAdminBrandPromotions).toHaveBeenCalledWith(8, { search: '', status: 'active', page: 1 })
    await wrapper.get('input[placeholder="Tìm theo tên hoặc mã"]').trigger('focus')
    await flushPromises()
    await wrapper.findAll('button').find(button => button.text().includes('Mùa thu') && button.text().includes('#5'))!.trigger('click')
    await wrapper.get('form input[type="checkbox"]').setValue(true)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(mocks.associateAdminBrandPromotion).toHaveBeenCalledWith(8, 5, true)
  })
})
