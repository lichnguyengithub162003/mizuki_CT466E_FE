import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createCustomerAddress,
  deleteCustomerAddress,
  getCustomerAddresses,
  setDefaultCustomerAddress,
  updateCustomerAddress,
} from '@/api/addressApi'
import type { CheckoutAddressDraft } from '@/types/customer'
import { customerAddressFormErrors } from '@/types/addresses'

const client = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('@/api/clients', () => ({ apiClient: client }))

const addressDto = {
  id: 17,
  recipient_name: 'Trần Ngọc Mai',
  recipient_phone: '0912345678',
  province: 'Cần Thơ',
  district: 'Ninh Kiều',
  ward: 'Xuân Khánh',
  hamlet: null,
  address_line: '25 đường Mậu Thân',
  is_default: true,
  ghn_province_id: 91,
  ghn_district_id: 1442,
  ghn_ward_code: '21012',
}

const draft: CheckoutAddressDraft = {
  fullName: 'Trần Ngọc Mai',
  phone: '0912345678',
  provinceName: 'Cần Thơ',
  districtName: 'Ninh Kiều',
  wardName: 'Xuân Khánh',
  detail: '25 đường Mậu Thân',
  isDefault: true,
  ghn_province_id: 91,
  ghn_district_id: 1442,
  ghn_ward_code: '21012',
}

afterEach(() => {
  client.get.mockReset()
  client.post.mockReset()
  client.patch.mockReset()
  client.delete.mockReset()
})

describe('customer address API', () => {
  it('lists saved addresses and preserves backend and GHN identifiers', async () => {
    client.get.mockResolvedValue({
      data: { success: true, data: [addressDto], message: 'OK' },
    })

    await expect(getCustomerAddresses()).resolves.toEqual([
      expect.objectContaining({
        id: '17',
        fullName: 'Trần Ngọc Mai',
        isDefault: true,
        ghn_province_id: 91,
        ghn_district_id: 1442,
        ghn_ward_code: '21012',
      }),
    ])
    expect(client.get).toHaveBeenCalledWith('/customer/addresses')
  })

  it('accepts null GHN identifiers from address responses', async () => {
    client.get.mockResolvedValue({
      data: {
        success: true,
        data: [{
          ...addressDto,
          ghn_province_id: null,
          ghn_district_id: null,
          ghn_ward_code: null,
        }],
        message: 'OK',
      },
    })

    await expect(getCustomerAddresses()).resolves.toEqual([
      expect.objectContaining({
        ghn_province_id: null,
        ghn_district_id: null,
        ghn_ward_code: '',
      }),
    ])
  })

  it('creates and updates with the confirmed backend field names', async () => {
    client.post.mockResolvedValue({
      data: { success: true, data: addressDto, message: 'Đã thêm' },
    })
    client.patch.mockResolvedValue({
      data: { success: true, data: addressDto, message: 'Đã cập nhật' },
    })

    const expectedPayload = {
      recipient_name: 'Trần Ngọc Mai',
      recipient_phone: '0912345678',
      province: 'Cần Thơ',
      district: 'Ninh Kiều',
      ward: 'Xuân Khánh',
      hamlet: null,
      address_line: '25 đường Mậu Thân',
      is_default: true,
      ghn_province_id: 91,
      ghn_district_id: 1442,
      ghn_ward_code: '21012',
    }

    await expect(createCustomerAddress(draft)).resolves.toMatchObject({ id: '17' })
    await expect(updateCustomerAddress('17', { ...draft, id: '17' })).resolves.toMatchObject({ id: '17' })
    expect(client.post).toHaveBeenCalledWith('/customer/addresses', expectedPayload)
    expect(client.patch).toHaveBeenCalledWith('/customer/addresses/17', expectedPayload)
  })

  it('sets the selected address as default through the dedicated endpoint', async () => {
    client.patch.mockResolvedValue({
      data: { success: true, data: addressDto, message: 'Đã đặt mặc định' },
    })

    await expect(setDefaultCustomerAddress('17')).resolves.toMatchObject({
      id: '17',
      isDefault: true,
    })
    expect(client.patch).toHaveBeenCalledWith('/customer/addresses/17/default')
  })

  it('deletes the requested customer address', async () => {
    client.delete.mockResolvedValue({
      data: { success: true, data: null, message: 'Đã xóa' },
    })

    await expect(deleteCustomerAddress('17')).resolves.toBeUndefined()
    expect(client.delete).toHaveBeenCalledWith('/customer/addresses/17')
  })

  it('rejects incomplete location identifiers before making a request', async () => {
    await expect(createCustomerAddress({ ...draft, ghn_district_id: null }))
      .rejects.toThrow('chưa có đủ mã')
    expect(client.post).not.toHaveBeenCalled()
  })

  it('maps backend validation fields to address form fields', () => {
    expect(customerAddressFormErrors({
      recipient_name: ['Tên người nhận chưa hợp lệ.'],
      recipient_phone: ['Số điện thoại chưa hợp lệ.'],
      province: ['Tỉnh/Thành phố chưa hợp lệ.'],
      district: ['Quận/Huyện chưa hợp lệ.'],
      ward: ['Phường/Xã chưa hợp lệ.'],
      address_line: ['Địa chỉ chi tiết chưa hợp lệ.'],
      ignored_field: ['Không hiển thị.'],
    })).toEqual({
      fullName: 'Tên người nhận chưa hợp lệ.',
      phone: 'Số điện thoại chưa hợp lệ.',
      province: 'Tỉnh/Thành phố chưa hợp lệ.',
      district: 'Quận/Huyện chưa hợp lệ.',
      ward: 'Phường/Xã chưa hợp lệ.',
      detail: 'Địa chỉ chi tiết chưa hợp lệ.',
    })
  })
})
