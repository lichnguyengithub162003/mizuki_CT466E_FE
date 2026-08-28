import { apiClient } from '@/api/clients'
import { ENDPOINTS } from '@/constants/endpoints'
import type { CustomerWallet, CustomerWalletResponse } from '@/types/wallet'

export async function getCustomerWallet(): Promise<CustomerWallet> {
  const response = await apiClient.get<CustomerWalletResponse>(ENDPOINTS.customerWallet)
  const wallet = response.data.data

  if (!Number.isInteger(wallet.balance) || wallet.balance < 0) {
    throw new Error('Phản hồi ví không có số dư hợp lệ.')
  }

  return {
    id: wallet.id,
    balance: wallet.balance,
    currency: wallet.currency,
    updatedAt: wallet.updated_at,
  }
}
