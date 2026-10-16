import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ENDPOINTS } from '@/constants/endpoints'

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), csrf: vi.fn() }))
vi.mock('@/api/clients', () => ({ apiClient: { get: mocks.get, post: mocks.post, patch: mocks.patch } }))
vi.mock('@/api/csrf', () => ({ ensureCsrfCookie: mocks.csrf }))

import {
  changeProfilePassword, getProfile, promoteProfileAvatar, removeProfileAvatar,
  stageProfileAvatar, updateProfile,
} from '@/api/profileApi'

describe('self-service profile API contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.csrf.mockResolvedValue(undefined)
  })

  it('reads the authoritative profile envelope', async () => {
    const profile = { id: 7, name: 'Mizuki' }
    mocks.get.mockResolvedValue({ data: { data: profile } })
    await expect(getProfile()).resolves.toBe(profile)
    expect(mocks.get).toHaveBeenCalledWith(ENDPOINTS.authProfile)
  })

  it('updates only name and phone with CSRF', async () => {
    const payload = { name: 'Nguyễn An', phone: null }
    mocks.patch.mockResolvedValue({ data: { data: { ...payload, id: 7 } } })
    await updateProfile(payload)
    expect(mocks.csrf).toHaveBeenCalledOnce()
    expect(mocks.patch).toHaveBeenCalledWith(ENDPOINTS.authProfile, payload)
  })

  it('stages multipart image and sends only the owned token for promotion', async () => {
    const image = new File(['image'], 'avatar.png', { type: 'image/png' })
    mocks.post.mockResolvedValue({ data: { data: { upload_token: 'server-token', preview_url: 'https://preview.test' } } })
    mocks.patch.mockResolvedValue({ data: { data: { avatar: 'https://cdn.test/avatar' } } })
    await stageProfileAvatar(image)
    expect(mocks.post).toHaveBeenCalledWith(ENDPOINTS.authProfileAvatarUploads, expect.any(FormData), expect.any(Object))
    const body = mocks.post.mock.calls[0]?.[1] as FormData
    expect(body.get('image')).toBe(image)
    await promoteProfileAvatar('server-token')
    expect(mocks.patch).toHaveBeenCalledWith(ENDPOINTS.authProfileAvatar, { avatar_upload_token: 'server-token' })
  })

  it('removes avatar with explicit null and changes password with confirmation', async () => {
    mocks.patch.mockResolvedValue({ data: { data: { avatar: null } } })
    await removeProfileAvatar()
    expect(mocks.patch).toHaveBeenCalledWith(ENDPOINTS.authProfileAvatar, { avatar: null })
    const payload = { current_password: 'old-password', password: 'new-password', password_confirmation: 'new-password' }
    await changeProfilePassword(payload)
    expect(mocks.patch).toHaveBeenCalledWith(ENDPOINTS.authProfilePassword, payload)
    expect(mocks.csrf).toHaveBeenCalledTimes(2)
  })
})
