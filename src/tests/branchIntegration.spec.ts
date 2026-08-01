import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const { apiGetMock } = vi.hoisted(() => ({ apiGetMock: vi.fn() }))

vi.mock('@/api/clients', () => ({
  apiClient: { get: apiGetMock },
}))

import { getBranches, type Branch } from '@/api/branchApi'
import {
  BRANCH_PREFERENCE_KEY,
  useBranchPreferenceStore,
} from '@/stores/branchPreference'

const activeBranches: Branch[] = [
  {
    id: 1,
    code: 'MZ-NK-01',
    name: 'Mizuki Ninh Kiều',
    address: '51 Đường 3/2, Ninh Kiều, Cần Thơ',
    phone: '02923730101',
    email: 'ninhkieu@mizuki.vn',
    is_active: true,
    opening_hours: [
      { weekday: 1, opens_at: '08:00:00', closes_at: '21:00:00', is_closed: false },
    ],
  },
  {
    id: 6,
    code: 'MZ-VL-01',
    name: 'Mizuki Vĩnh Long',
    address: '68 Phạm Thái Bường, Vĩnh Long',
    phone: '02703730606',
    email: 'vinhlong@mizuki.vn',
    is_active: true,
    opening_hours: [
      { weekday: 1, opens_at: '08:00:00', closes_at: '21:00:00', is_closed: false },
    ],
  },
]

const inactiveBranch: Branch = {
  ...activeBranches[0]!,
  id: 99,
  code: 'MZ-INACTIVE',
  name: 'Mizuki Inactive',
  is_active: false,
}

beforeEach(() => {
  setActivePinia(createPinia())
  window.localStorage.clear()
  apiGetMock.mockReset()
})

describe('real branch API and preference store', () => {
  it('maps the exact branch response and opening-hours fields', async () => {
    apiGetMock.mockResolvedValue({ data: { success: true, data: activeBranches } })

    await expect(getBranches()).resolves.toEqual(activeBranches)
    expect(apiGetMock).toHaveBeenCalledWith('/branches')
  })

  it('restores a saved selectedBranchId when it remains active', async () => {
    window.localStorage.setItem(BRANCH_PREFERENCE_KEY, '6')
    apiGetMock.mockResolvedValue({ data: { success: true, data: activeBranches } })
    const store = useBranchPreferenceStore()

    store.restore()
    await store.load()

    expect(store.selectedBranchId).toBe(6)
    expect(store.selectedBranch?.name).toBe('Mizuki Vĩnh Long')
  })

  it('reconciles an invalid saved branch to the first active backend branch', async () => {
    window.localStorage.setItem(BRANCH_PREFERENCE_KEY, '999')
    apiGetMock.mockResolvedValue({
      data: { success: true, data: [inactiveBranch, ...activeBranches] },
    })
    const store = useBranchPreferenceStore()

    store.restore()
    await store.load()

    expect(store.branches.map((branch) => branch.id)).toEqual([1, 6])
    expect(store.selectedBranchId).toBe(1)
    expect(window.localStorage.getItem(BRANCH_PREFERENCE_KEY)).toBe('1')
  })

  it('persists only the selected backend branch ID', async () => {
    apiGetMock.mockResolvedValue({ data: { success: true, data: activeBranches } })
    const store = useBranchPreferenceStore()
    await store.load()

    store.selectBranch(6)

    expect(store.selectedBranchId).toBe(6)
    expect(window.localStorage.getItem(BRANCH_PREFERENCE_KEY)).toBe('6')
    expect(window.localStorage.length).toBe(1)
  })

  it('shows an error state with no demo fallback when the API fails', async () => {
    apiGetMock.mockRejectedValue(new Error('network unavailable'))
    const store = useBranchPreferenceStore()

    await store.load()

    expect(store.status).toBe('error')
    expect(store.branches).toEqual([])
    expect(store.selectedBranch).toBeNull()
  })
})
