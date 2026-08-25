import { apiClient } from '@/api/clients'
import { ENDPOINTS } from '@/constants/endpoints'
import type { CheckoutAddress, CheckoutAddressDraft } from '@/types/customer'
import {
  adaptCustomerAddress,
  customerAddressPayload,
  type CustomerAddressListResponse,
  type CustomerAddressResponse,
} from '@/types/addresses'

export async function getCustomerAddresses(): Promise<CheckoutAddress[]> {
  const response = await apiClient.get<CustomerAddressListResponse>(ENDPOINTS.customerAddresses)
  return response.data.data.map(adaptCustomerAddress)
}

export async function createCustomerAddress(
  draft: CheckoutAddressDraft,
): Promise<CheckoutAddress> {
  const response = await apiClient.post<CustomerAddressResponse>(
    ENDPOINTS.customerAddresses,
    customerAddressPayload(draft),
  )
  return adaptCustomerAddress(response.data.data)
}

export async function updateCustomerAddress(
  id: string,
  draft: CheckoutAddressDraft,
): Promise<CheckoutAddress> {
  const response = await apiClient.patch<CustomerAddressResponse>(
    ENDPOINTS.customerAddress(id),
    customerAddressPayload(draft),
  )
  return adaptCustomerAddress(response.data.data)
}

export async function setDefaultCustomerAddress(id: string): Promise<CheckoutAddress> {
  const response = await apiClient.patch<CustomerAddressResponse>(
    ENDPOINTS.customerAddressDefault(id),
  )
  return adaptCustomerAddress(response.data.data)
}

export async function deleteCustomerAddress(id: string): Promise<void> {
  await apiClient.delete(ENDPOINTS.customerAddress(id))
}
