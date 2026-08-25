import type { CheckoutAddress, CheckoutAddressDraft } from '@/types/customer'
import type { ApiValidationErrors } from '@/types/api'

export type CustomerAddressFormField =
  | 'fullName'
  | 'phone'
  | 'province'
  | 'district'
  | 'ward'
  | 'detail'

export type CustomerAddressFormErrors = Partial<Record<CustomerAddressFormField, string>>

export interface CustomerAddressPayload {
  readonly recipient_name: string
  readonly recipient_phone: string
  readonly province: string
  readonly district: string
  readonly ward: string
  readonly hamlet?: string | null
  readonly address_line: string
  readonly is_default: boolean
  readonly ghn_province_id: number
  readonly ghn_district_id: number
  readonly ghn_ward_code: string
}

export interface CustomerAddressDto {
  readonly id: number
  readonly recipient_name: string
  readonly recipient_phone: string
  readonly province: string
  readonly district: string
  readonly ward: string
  readonly hamlet?: string | null
  readonly address_line: string
  readonly is_default: boolean
  readonly ghn_province_id: number | null
  readonly ghn_district_id: number | null
  readonly ghn_ward_code: string | null
}

export interface CustomerAddressResponse {
  readonly success: boolean
  readonly data: CustomerAddressDto
  readonly message: string
}

export interface CustomerAddressListResponse {
  readonly success: boolean
  readonly data: readonly CustomerAddressDto[]
  readonly message: string
}

const CUSTOMER_ADDRESS_VALIDATION_FIELDS = {
  recipient_name: 'fullName',
  recipient_phone: 'phone',
  province: 'province',
  district: 'district',
  ward: 'ward',
  address_line: 'detail',
} as const satisfies Readonly<Record<string, CustomerAddressFormField>>

export function customerAddressFormErrors(
  validationErrors: ApiValidationErrors | undefined,
): CustomerAddressFormErrors {
  if (!validationErrors) return {}

  return Object.entries(CUSTOMER_ADDRESS_VALIDATION_FIELDS).reduce<CustomerAddressFormErrors>(
    (formErrors, [backendField, formField]) => {
      const message = validationErrors[backendField]?.[0]?.trim()
      if (message) formErrors[formField] = message
      return formErrors
    },
    {},
  )
}

export function customerAddressPayload(draft: CheckoutAddressDraft): CustomerAddressPayload {
  if (
    draft.ghn_province_id === null
    || draft.ghn_district_id === null
    || !draft.ghn_ward_code
  ) {
    throw new Error('Địa chỉ chưa có đủ mã tỉnh, quận/huyện và phường/xã.')
  }

  return {
    recipient_name: draft.fullName,
    recipient_phone: draft.phone,
    province: draft.provinceName,
    district: draft.districtName,
    ward: draft.wardName,
    hamlet: draft.hamlet?.trim() || null,
    address_line: draft.detail,
    is_default: draft.isDefault,
    ghn_province_id: draft.ghn_province_id,
    ghn_district_id: draft.ghn_district_id,
    ghn_ward_code: draft.ghn_ward_code,
  }
}

export function adaptCustomerAddress(address: CustomerAddressDto): CheckoutAddress {
  return {
    id: String(address.id),
    fullName: address.recipient_name,
    phone: address.recipient_phone,
    provinceName: address.province,
    districtName: address.district,
    wardName: address.ward,
    hamlet: address.hamlet ?? undefined,
    detail: address.address_line,
    isDefault: address.is_default,
    ghn_province_id: address.ghn_province_id,
    ghn_district_id: address.ghn_district_id,
    ghn_ward_code: address.ghn_ward_code ?? '',
  }
}
