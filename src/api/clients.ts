import axios, { type AxiosInstance } from 'axios'
import { readAppEnvironment } from '@/constants/env'
import { normalizeApiError } from '@/api/normalizeApiError'

const HTTP_TIMEOUT_MS = 15_000
const appEnv = readAppEnvironment()

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
    (error: unknown) => Promise.reject(normalizeApiError(error)),
  )

  return client
}

export const apiClient = createHttpClient(appEnv.apiBaseUrl)
export const sanctumClient = createHttpClient(appEnv.sanctumBaseUrl)
