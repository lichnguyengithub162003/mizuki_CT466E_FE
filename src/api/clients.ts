import axios, { type AxiosInstance } from 'axios'
import { readAppEnvironment } from '@/constants/env'
import { normalizeApiError } from '@/api/normalizeApiError'

const HTTP_TIMEOUT_MS = 15_000
const appEnv = readAppEnvironment()
let unauthorizedHandler: (() => void) | undefined

export function setUnauthorizedHandler(handler: () => void): void {
  unauthorizedHandler = handler
}

function createHttpClient(baseURL: string): AxiosInstance {
  const client = axios.create({
    baseURL,
    timeout: HTTP_TIMEOUT_MS,
    withCredentials: true,
    withXSRFToken: true,
    headers: {
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
  })

  client.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
      const normalized = normalizeApiError(error)
      if (normalized.kind === 'unauthorized') unauthorizedHandler?.()
      return Promise.reject(normalized)
    },
  )

  return client
}

export const apiClient = createHttpClient(appEnv.apiBaseUrl)
export const sanctumClient = createHttpClient(appEnv.sanctumBaseUrl)
