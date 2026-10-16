import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import ProfileWorkspace from '@/components/profile/ProfileWorkspace.vue'
import BaseToastProvider from '@/components/common/BaseToastProvider.vue'
import { useAuthStore } from '@/stores/auth'
import type { AuthenticatedUser } from '@/types/auth'
import type { Profile, StaffProfile } from '@/types/profile'

const mocks = vi.hoisted(() => ({
  getProfile: vi.fn(), updateProfile: vi.fn(), stageProfileAvatar: vi.fn(),
  promoteProfileAvatar: vi.fn(), removeProfileAvatar: vi.fn(), changeProfilePassword: vi.fn(),
  getCurrentUser: vi.fn(), toast: vi.fn(),
}))
vi.mock('@/api/profileApi', () => mocks)
vi.mock('@/api/auth/authApi', () => ({ getCurrentUser: mocks.getCurrentUser }))
vi.mock('@/components/common/toast', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/common/toast')>()),
  useToast: () => ({ toast: mocks.toast }),
}))

const session: AuthenticatedUser = {
  id: 29, name: 'Nguyễn An', email: 'an@mizuki.test', phone: '0901000029', avatar: null,
  role: 'technician', role_label: 'Kỹ thuật viên', branch_id: 5,
  branch: { id: 5, name: 'Mizuki Ninh Kiều' }, email_verified_at: null, created_at: '2026-01-01T00:00:00Z',
}
const staff: StaffProfile = {
  id: 29, name: 'Nguyễn An', email: 'an@mizuki.test', phone: '0901000029', avatar: null,
  avatar_rendition_url: null, role: 'technician', role_label: 'Kỹ thuật viên',
  staff_code: 'NV-00029', branch_id: 5, branch: { id: 5, code: 'MZ-NK', name: 'Mizuki Ninh Kiều' },
  job_title: 'Chuyên viên chăm sóc da', work_area: 'clinic', employment_status: 'working',
  employment_status_label: 'Đang làm việc',
  current_assignment: { id: 12, branch: { id: 5, code: 'MZ-NK', name: 'Mizuki Ninh Kiều' }, role: 'technician', role_label: 'Kỹ thuật viên', job_title: 'Chuyên viên chăm sóc da', work_area: 'clinic', effective_from: '2026-01-01T00:00:00Z', effective_to: null },
  created_at: '2026-01-01T00:00:00Z',
}
const wrappers: VueWrapper[] = []

async function mountProfile(data: Profile = staff, loadImplementation?: () => Promise<Profile>) {
  const pinia = createPinia()
  const auth = useAuthStore(pinia)
  auth.$patch({ user: { ...session, role: data.role, role_label: data.role_label }, isInitialized: true })
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/profile', component: ProfileWorkspace },
    { path: '/home', component: { template: '<div>Home</div>' } },
  ] })
  await router.push('/profile')
  await router.isReady()
  if (loadImplementation) mocks.getProfile.mockImplementation(loadImplementation)
  else mocks.getProfile.mockResolvedValue(data)
  mocks.getCurrentUser.mockResolvedValue(session)
  const wrapper = mount(ProfileWorkspace, { attachTo: document.body, global: { plugins: [pinia, router] } })
  wrappers.push(wrapper)
  await flushPromises()
  return { wrapper, auth, router }
}

function bodyButton(selector: string): HTMLButtonElement {
  const button = document.body.querySelector<HTMLButtonElement>(selector)
  expect(button).not.toBeNull()
  return button!
}
async function click(selector: string): Promise<void> {
  bodyButton(selector).click()
  await flushPromises()
}
function input(id: string): HTMLInputElement {
  const value = document.body.querySelector<HTMLInputElement>(id)
  expect(value).not.toBeNull()
  return value!
}
async function fill(id: string, value: string): Promise<void> {
  const field = input(id)
  field.value = value
  field.dispatchEvent(new Event('input', { bubbles: true }))
  await flushPromises()
}

beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:profile-preview') })
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
})
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  document.body.innerHTML = ''
})

describe('Profile V2 restored visual', () => {
  it('loads the own staff profile and authoritative assignment', async () => {
    const { wrapper } = await mountProfile()
    expect(wrapper.get('.profile-breadcrumb').text()).toContain('Hồ sơ cá nhân')
    expect(wrapper.get('.profile-name').text()).toBe('Nguyễn An')
    expect(wrapper.get('.profile-hero').text()).toContain('NV-00029')
    expect(wrapper.text().split('NV-00029')).toHaveLength(2)
    expect(wrapper.text()).toContain('Mizuki Ninh Kiều')
    expect(wrapper.get('[data-testid="profile-assignment"]').text()).toContain('Phân công hiện tại')
    expect(wrapper.get('[data-testid="profile-assignment"]').text()).toContain('01/01/2026')
    expect(wrapper.get('[data-testid="profile-assignment"]').text()).not.toContain('Mizuki Ninh Kiều')
    expect(wrapper.get('.profile-content').find('.personal-section').exists()).toBe(true)
    expect(wrapper.get('.profile-content').find('.security-section').exists()).toBe(true)
    expect(wrapper.get('.profile-content').find('.employment-section').exists()).toBe(true)
    expect(wrapper.get('.profile-hero').text()).not.toContain('Vai trò hệ thống')
    expect(wrapper.get('.profile-hero').text()).not.toContain('Mizuki Ninh Kiều')
    expect(wrapper.get('.profile-hero').text()).not.toContain(staff.email)
    expect(wrapper.findAll('[data-testid="profile-edit-open"]')).toHaveLength(1)
    expect(wrapper.get('.personal-section').find('[data-testid="profile-edit-open"]').exists()).toBe(true)
    expect(wrapper.get('.profile-hero').find('[data-testid="profile-edit-open"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Email · chỉ đọc')
    expect(wrapper.text()).toContain('Vai trò hệ thống')
    expect(wrapper.text()).toContain('Chức danh công việc')
    expect(wrapper.get('.employment-grid').text()).toContain('Chuyên viên chăm sóc da')
    expect(wrapper.get('.employment-grid').text()).toContain('Đang làm việc')
    expect(wrapper.get('#security-heading').text()).toBe('Bảo mật tài khoản')
    expect(wrapper.text()).not.toContain('Mật khẩu & quyền truy cập')
  })

  it('shows system-wide scope without inventing a branch assignment for a branchless Super Admin', async () => {
    const { wrapper } = await mountProfile({
      ...staff, role: 'super_admin', role_label: 'Quản trị hệ thống',
      branch_id: null, branch: null, current_assignment: null, job_title: null,
    })
    expect(wrapper.text()).toContain('Phạm vi quản trị: Toàn hệ thống')
    expect(wrapper.find('[data-testid="profile-assignment"]').exists()).toBe(false)
    expect(wrapper.get('.profile-hero').text()).not.toContain('Toàn hệ thống')
    expect(wrapper.text()).not.toContain('Chưa có chi nhánh được phân công')
    expect(wrapper.get('.employment-grid').text()).not.toContain('Chức danh công việc')
    expect(wrapper.text().split('Phạm vi quản trị: Toàn hệ thống')).toHaveLength(2)
  })

  it('keeps a missing job title distinct from the system role', async () => {
    const { wrapper } = await mountProfile({ ...staff, job_title: null })
    expect(wrapper.get('.profile-hero').text()).not.toContain('Kỹ thuật viên')
    const job = wrapper.findAll('.employment-grid > div').find((item) => item.text().includes('Chức danh công việc'))
    expect(job).toBeUndefined()
    expect(wrapper.get('.employment-grid').text()).toContain('Kỹ thuật viên')
  })

  it('shows an authoritative branch assignment for a Super Admin who actually has one', async () => {
    const { wrapper } = await mountProfile({
      ...staff, role: 'super_admin', role_label: 'Quản trị hệ thống',
      branch_id: null, branch: null,
    })
    expect(wrapper.get('.employment-grid').text()).toContain('Mizuki Ninh Kiều')
    expect(wrapper.get('[data-testid="profile-assignment"]').text()).toContain('Phân công hiện tại')
    expect(wrapper.text()).not.toContain('Phạm vi quản trị: Toàn hệ thống')
    expect(wrapper.text()).not.toContain('Chưa có chi nhánh được phân công')
  })

  it('shows an honest empty assignment state for regular staff without duplicating role and branch', async () => {
    const { wrapper } = await mountProfile({ ...staff, current_assignment: null })
    expect(wrapper.get('[data-testid="profile-assignment"]').text()).toContain('Chưa có phân công hiện tại')
    expect(wrapper.get('.employment-grid').text()).toContain('Mizuki Ninh Kiều')
    expect(wrapper.get('.profile-hero').text()).not.toContain('Mizuki Ninh Kiều')
    expect(wrapper.get('.profile-hero').text()).not.toContain('Kỹ thuật viên')
  })

  it('shows truthful empty states and hides employment data for a customer', async () => {
    const { wrapper } = await mountProfile({ ...staff, branch: null, branch_id: 5, current_assignment: null, work_area: null })
    expect(wrapper.text()).toContain('Chưa xác định chi nhánh')
    expect(wrapper.text()).toContain('Chưa có phân công hiện tại')
    wrapper.unmount()
    wrappers.splice(wrappers.indexOf(wrapper), 1)
    document.body.innerHTML = ''
    const customer: Profile = { id: 8, name: 'Khách Mizuki', email: 'khach@mizuki.test', phone: null, avatar: null, avatar_rendition_url: null, role: 'customer', role_label: 'Khách hàng', created_at: null }
    const mounted = await mountProfile(customer)
    expect(mounted.wrapper.text()).not.toContain('Thông tin công tác')
    expect(mounted.wrapper.text()).not.toContain('Mã nhân viên')
    expect(mounted.wrapper.text()).not.toContain('Vai trò hệ thống')
    expect(mounted.wrapper.text()).not.toContain('Chức danh công việc')
    expect(mounted.wrapper.find('.employment-section').exists()).toBe(false)
    expect(mounted.wrapper.get('.profile-content').classes()).toContain('profile-content--solo')
    expect(mounted.wrapper.get('#security-heading').text()).toBe('Bảo mật tài khoản')
    expect(mounted.wrapper.text()).toContain('Chưa cập nhật')
  })

  it('restores the forest-to-sage hero and keeps its identity text legible', () => {
    const source = readFileSync('src/components/profile/ProfileWorkspace.vue', 'utf8')
    expect(source).toMatch(/\.profile-hero\s*\{[^}]*linear-gradient\(112deg, #285d4b 0%, #356d56 56%, #447a62 100%\)/i)
    expect(source).toMatch(/\.profile-name\s*\{[^}]*color:\s*#fffdf6/i)
    expect(source).toContain('profile-hero--menu-open')
    expect(source).toMatch(/\.profile-hero--menu-open\s*\{\s*overflow:\s*visible/i)
    expect(source).not.toContain('hero-band')
    const luminance = (hex: string) => {
      const channels = hex.match(/\w\w/g)!.map((part) => {
        const value = parseInt(part, 16) / 255
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
      })
      return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722
    }
    expect((luminance('fffdf6') + 0.05) / (luminance('447a62') + 0.05)).toBeGreaterThanOrEqual(4.5)
  })

  it('shows retry after a failed GET and loads on retry', async () => {
    let attempts = 0
    const { wrapper } = await mountProfile(staff, () => {
      attempts += 1
      return attempts === 1
        ? Promise.reject({ name: 'ApplicationError', kind: 'server', message: 'SQLSTATE[42S02]: private query' })
        : Promise.resolve(staff)
    })
    expect(wrapper.get('[data-testid="profile-error"]').text()).toContain('Không thể tải hồ sơ. Vui lòng thử lại.')
    expect(wrapper.text()).not.toContain('SQLSTATE')
    await click('[data-testid="profile-error"] button')
    expect(wrapper.get('.profile-name').text()).toBe(staff.name)
    expect(attempts).toBe(2)
  })

  it('edits only name and phone, then synchronizes the complete auth session', async () => {
    const { auth } = await mountProfile()
    const updated = { ...staff, name: 'Nguyễn Bình', phone: '0902000030' }
    mocks.updateProfile.mockResolvedValue(updated)
    mocks.getProfile.mockResolvedValue(updated)
    mocks.getCurrentUser.mockResolvedValue({ ...session, name: updated.name, phone: updated.phone })
    await click('[data-testid="profile-edit-open"]')
    await fill('#self-name', updated.name)
    await fill('#self-phone', updated.phone)
    await click('[data-testid="profile-edit-save"]')
    expect(mocks.updateProfile).toHaveBeenCalledWith({ name: updated.name, phone: updated.phone })
    expect(mocks.getProfile).toHaveBeenCalledTimes(2)
    expect(mocks.getCurrentUser).toHaveBeenCalledOnce()
    expect(auth.user?.name).toBe(updated.name)
    expect(document.body.textContent).toContain(updated.name)
  })

  it('keeps the edit save action disabled for unchanged values', async () => {
    await mountProfile()
    await click('[data-testid="profile-edit-open"]')
    expect(bodyButton('[data-testid="profile-edit-save"]').disabled).toBe(true)
    await fill('#self-name', 'Nguyễn Bình')
    expect(bodyButton('[data-testid="profile-edit-save"]').disabled).toBe(false)
    expect(document.body.textContent).toContain('Bỏ thay đổi')
    await click('button[aria-label="Đóng hộp thoại"]')
    expect(input('#self-name').value).toBe('Nguyễn Bình')
    const discard = Array.from(document.body.querySelectorAll('button')).find((button) => button.textContent?.trim() === 'Bỏ thay đổi')
    discard?.click()
    await flushPromises()
    expect(document.body.querySelector('#self-name')).toBeNull()
  })

  it('renders inline API validation without changing read-only email', async () => {
    await mountProfile()
    mocks.updateProfile.mockRejectedValue({ name: 'ApplicationError', kind: 'validation', message: 'Dữ liệu không hợp lệ', validationErrors: { phone: ['Số điện thoại không hợp lệ'] } })
    await click('[data-testid="profile-edit-open"]')
    expect(document.body.querySelector<HTMLInputElement>('#self-email')).toBeNull()
    await fill('#self-phone', '0902000030')
    await click('[data-testid="profile-edit-save"]')
    expect(document.body.textContent).toContain('Số điện thoại không hợp lệ')
  })

  it('previews, stages and promotes an avatar from one file selection without a confirmation step', async () => {
    const { auth } = await mountProfile()
    const updated = { ...staff, avatar: 'https://cdn.mizuki.test/avatar.jpg', avatar_rendition_url: null }
    let finishStage: ((result: { upload_token: string; preview_url: string }) => void) | undefined
    mocks.stageProfileAvatar.mockImplementation(() => new Promise((resolve) => { finishStage = resolve }))
    mocks.promoteProfileAvatar.mockResolvedValue(updated)
    mocks.getProfile.mockResolvedValue(updated)
    mocks.getCurrentUser.mockResolvedValue({ ...session, avatar: updated.avatar })
    const file = new File(['image'], 'avatar.png', { type: 'image/png' })
    await click('button[aria-label="Tùy chọn ảnh đại diện"]')
    expect(document.body.querySelector('[data-testid="profile-avatar-menu"]')).not.toBeNull()
    expect(document.body.querySelector('[data-testid="profile-avatar-remove-open"]')).toBeNull()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flushPromises()
    expect(document.body.querySelector('[data-testid="profile-avatar-menu"]')).toBeNull()
    await click('button[aria-label="Tùy chọn ảnh đại diện"]')
    await click('[data-testid="profile-avatar-replace"]')
    expect(document.body.querySelector('[data-testid="profile-avatar-menu"]')).toBeNull()
    Object.defineProperty(input('[data-testid="profile-avatar-file"]'), 'files', { configurable: true, value: [file] })
    input('[data-testid="profile-avatar-file"]').dispatchEvent(new Event('change', { bubbles: true }))
    await flushPromises()
    expect(document.body.querySelector('img[alt="Xem trước ảnh được chọn"]')).not.toBeNull()
    expect(mocks.stageProfileAvatar).toHaveBeenCalledWith(file)
    expect(mocks.promoteProfileAvatar).not.toHaveBeenCalled()
    expect(document.body.querySelector('[data-testid="profile-avatar-upload"]')).toBeNull()
    expect(document.body.querySelector('[data-testid="profile-avatar-save"]')).toBeNull()
    finishStage?.({ upload_token: 'owned-token', preview_url: 'https://preview.mizuki.test/owned-token' })
    await flushPromises()
    expect(mocks.promoteProfileAvatar).toHaveBeenCalledWith('owned-token')
    expect(auth.user?.avatar).toBe(updated.avatar)
    expect(mocks.toast).toHaveBeenCalledWith({ title: 'Ảnh đại diện đã được cập nhật', variant: 'success' })
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:profile-preview')
  })

  it('keeps the previous avatar and avoids promotion when staging fails', async () => {
    const current = { ...staff, avatar: 'https://cdn.mizuki.test/old.jpg' }
    const { wrapper } = await mountProfile(current)
    mocks.stageProfileAvatar.mockRejectedValue({ name: 'ApplicationError', kind: 'server', message: 'SQLSTATE: private query' })
    const file = new File(['image'], 'avatar.webp', { type: 'image/webp' })
    Object.defineProperty(input('[data-testid="profile-avatar-file"]'), 'files', { configurable: true, value: [file] })
    input('[data-testid="profile-avatar-file"]').dispatchEvent(new Event('change', { bubbles: true }))
    await flushPromises()
    expect(mocks.promoteProfileAvatar).not.toHaveBeenCalled()
    expect(wrapper.get('[data-testid="profile-avatar"] img').attributes('src')).toBe(current.avatar)
    expect(mocks.toast).toHaveBeenCalledWith({ title: 'Không thể cập nhật ảnh đại diện. Vui lòng thử lại.', variant: 'error' })
    expect(document.body.textContent).not.toContain('SQLSTATE')
  })

  it('keeps the current avatar visible alongside the local preview until promotion succeeds', async () => {
    const current = { ...staff, avatar: 'https://cdn.mizuki.test/old.jpg' }
    const { wrapper } = await mountProfile(current)
    let finishStage: ((result: { upload_token: string; preview_url: string }) => void) | undefined
    mocks.stageProfileAvatar.mockImplementation(() => new Promise((resolve) => { finishStage = resolve }))
    mocks.promoteProfileAvatar.mockResolvedValue({ ...current, avatar: 'https://cdn.mizuki.test/new.jpg' })
    mocks.getProfile.mockResolvedValue({ ...current, avatar: 'https://cdn.mizuki.test/new.jpg' })
    mocks.getCurrentUser.mockResolvedValue({ ...session, avatar: 'https://cdn.mizuki.test/new.jpg' })
    const picker = input('[data-testid="profile-avatar-file"]')
    Object.defineProperty(picker, 'files', { configurable: true, value: [new File(['image'], 'new.png', { type: 'image/png' })] })
    picker.dispatchEvent(new Event('change', { bubbles: true }))
    await flushPromises()
    expect(wrapper.get('[data-testid="profile-avatar"] > img').attributes('src')).toBe(current.avatar)
    expect(wrapper.get('.portrait-preview img').attributes('src')).toBe('blob:profile-preview')
    expect(mocks.promoteProfileAvatar).not.toHaveBeenCalled()
    finishStage?.({ upload_token: 'new-token', preview_url: 'https://preview.mizuki.test/new' })
    await flushPromises()
    expect(wrapper.get('[data-testid="profile-avatar"] > img').attributes('src')).toBe('https://cdn.mizuki.test/new.jpg')
    expect(wrapper.find('.portrait-preview').exists()).toBe(false)
  })

  it('does not reuse a consumed token or lose the previous avatar when promotion fails', async () => {
    const current = { ...staff, avatar: 'https://cdn.mizuki.test/old.jpg' }
    const { wrapper } = await mountProfile(current)
    mocks.stageProfileAvatar.mockResolvedValue({ upload_token: 'single-use', preview_url: 'https://preview.mizuki.test/image' })
    mocks.promoteProfileAvatar.mockRejectedValue(new Error('private backend detail'))
    const file = new File(['image'], 'avatar.png', { type: 'image/png' })
    Object.defineProperty(input('[data-testid="profile-avatar-file"]'), 'files', { configurable: true, value: [file] })
    input('[data-testid="profile-avatar-file"]').dispatchEvent(new Event('change', { bubbles: true }))
    await flushPromises()
    expect(mocks.promoteProfileAvatar).toHaveBeenCalledTimes(1)
    expect(wrapper.get('[data-testid="profile-avatar"] img').attributes('src')).toBe(current.avatar)
    expect(document.body.textContent).not.toContain('private backend detail')
  })

  it('prevents an older staging response from promoting after a newer image is selected', async () => {
    await mountProfile()
    let finishFirst: ((result: { upload_token: string; preview_url: string }) => void) | undefined
    mocks.stageProfileAvatar.mockImplementationOnce(() => new Promise((resolve) => { finishFirst = resolve }))
    mocks.stageProfileAvatar.mockResolvedValueOnce({ upload_token: 'new-token', preview_url: 'https://preview.mizuki.test/new' })
    const updated = { ...staff, avatar: 'https://cdn.mizuki.test/new.jpg' }
    mocks.promoteProfileAvatar.mockResolvedValue(updated)
    mocks.getProfile.mockResolvedValue(updated)
    mocks.getCurrentUser.mockResolvedValue({ ...session, avatar: updated.avatar })
    const picker = input('[data-testid="profile-avatar-file"]')
    Object.defineProperty(picker, 'files', { configurable: true, value: [new File(['first'], 'first.png', { type: 'image/png' })] })
    picker.dispatchEvent(new Event('change', { bubbles: true }))
    await flushPromises()
    Object.defineProperty(picker, 'files', { configurable: true, value: [new File(['second'], 'second.png', { type: 'image/png' })] })
    picker.dispatchEvent(new Event('change', { bubbles: true }))
    await flushPromises()
    finishFirst?.({ upload_token: 'old-token', preview_url: 'https://preview.mizuki.test/old' })
    await flushPromises()
    expect(mocks.promoteProfileAvatar).toHaveBeenCalledTimes(1)
    expect(mocks.promoteProfileAvatar).toHaveBeenCalledWith('new-token')
  })

  it('requires confirmation to remove avatar and updates session afterward', async () => {
    const current = { ...staff, avatar: 'https://cdn.mizuki.test/avatar.jpg' }
    const { auth } = await mountProfile(current)
    const updated = { ...current, avatar: null, avatar_rendition_url: null }
    mocks.removeProfileAvatar.mockResolvedValue(updated)
    mocks.getProfile.mockResolvedValue(updated)
    mocks.getCurrentUser.mockResolvedValue({ ...session, avatar: null })
    expect(document.body.querySelector('[data-testid="profile-avatar-remove-open"]')).toBeNull()
    await click('button[aria-label="Tùy chọn ảnh đại diện"]')
    expect(document.body.querySelector('[data-testid="profile-avatar-replace"]')).not.toBeNull()
    await click('[data-testid="profile-avatar-remove-open"]')
    expect(document.body.querySelector('[data-testid="profile-avatar-menu"]')).toBeNull()
    expect(mocks.removeProfileAvatar).not.toHaveBeenCalled()
    await click('[data-testid="profile-avatar-remove-confirm"]')
    expect(mocks.removeProfileAvatar).toHaveBeenCalledOnce()
    expect(auth.user?.avatar).toBeNull()
  })

  it('positions shared toasts above the page content with mobile-safe horizontal margins', () => {
    const wrapper = mount(BaseToastProvider)
    const region = wrapper.get('[role="region"]')
    expect(region.classes()).toContain('fixed')
    expect(region.classes()).toContain('inset-x-4')
    expect(region.classes()).toContain('top-[calc(4.5rem+env(safe-area-inset-top))]')
    expect(region.classes()).toContain('sm:w-96')
    wrapper.unmount()
  })

  it('checks password confirmation and clears secret inputs after success', async () => {
    await mountProfile()
    mocks.changeProfilePassword.mockResolvedValue(undefined)
    await click('[data-testid="profile-password-open"]')
    await fill('#self-current_password', 'old-password')
    await fill('#self-password', 'new-password')
    await fill('#self-password_confirmation', 'mismatch')
    await click('[data-testid="profile-password-save"]')
    expect(mocks.changeProfilePassword).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('Mật khẩu xác nhận chưa khớp')
    await fill('#self-password_confirmation', 'new-password')
    await click('[data-testid="profile-password-save"]')
    expect(mocks.changeProfilePassword).toHaveBeenCalledWith({ current_password: 'old-password', password: 'new-password', password_confirmation: 'new-password' })
    await click('[data-testid="profile-password-open"]')
    expect(input('#self-current_password').value).toBe('')
  })
})
