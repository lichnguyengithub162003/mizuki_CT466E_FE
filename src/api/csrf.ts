import { sanctumClient } from '@/api/clients'
import { ENDPOINTS } from '@/constants/endpoints'

export async function ensureCsrfCookie(): Promise<void> {
  await sanctumClient.get<void>(ENDPOINTS.sanctumCsrfCookie)
}
