import { afterEach, describe, expect, it, vi } from 'vitest'
import { getCustomerWallet } from '@/api/walletApi'

const client = vi.hoisted(() => ({ get: vi.fn() }))

vi.mock('@/api/clients', () => ({ apiClient: client }))

afterEach(() => {
  client.get.mockReset()
})

describe('customer wallet API', () => {
  it('gets and adapts the exact authoritative wallet response', async () => {
    client.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          id: 7,
          balance: 825_000,
          currency: 'VND',
          updated_at: '2026-08-26T09:30:00.000000Z',
        },
        message: 'Lấy thông tin ví thành công!',
        meta: {},
      },
    })

    await expect(getCustomerWallet()).resolves.toEqual({
      id: 7,
      balance: 825_000,
      currency: 'VND',
      updatedAt: '2026-08-26T09:30:00.000000Z',
    })
    expect(client.get).toHaveBeenCalledOnce()
    expect(client.get).toHaveBeenCalledWith('/customer/wallet')
  })

  it('rejects an invalid balance instead of inventing a wallet amount', async () => {
    client.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          id: 7,
          balance: -1,
          currency: 'VND',
          updated_at: '2026-08-26T09:30:00.000000Z',
        },
        message: 'Lấy thông tin ví thành công!',
        meta: {},
      },
    })

    await expect(getCustomerWallet()).rejects.toThrow('không có số dư hợp lệ')
  })
})
