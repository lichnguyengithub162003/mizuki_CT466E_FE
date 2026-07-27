import { describe, expect, it } from 'vitest'
import {
  createAppEnvironment,
  normalizeApiBaseUrl,
  normalizeSanctumOrigin,
} from '@/constants/env'

describe('environment normalization', () => {
  it('normalizes a relative API path and a full Sanctum origin', () => {
    expect(
      createAppEnvironment({
        VITE_API_BASE_URL: '/api/v1/',
        VITE_SANCTUM_BASE_URL: 'http://localhost:8000/',
      }),
    ).toEqual({
      apiBaseUrl: '/api/v1',
      sanctumBaseUrl: 'http://localhost:8000',
    })
  })

  it('supports an absolute API base URL without duplicating its path', () => {
    expect(normalizeApiBaseUrl('https://api.mizuki.example/api/v1/')).toBe(
      'https://api.mizuki.example/api/v1',
    )
  })

  it('rejects malformed or unsafe base values', () => {
    expect(() => normalizeApiBaseUrl('//api/v1')).toThrow()
    expect(() => normalizeSanctumOrigin('http://localhost:8000/api/v1')).toThrow()
    expect(() =>
      createAppEnvironment({
        VITE_API_BASE_URL: ' ',
        VITE_SANCTUM_BASE_URL: 'http://localhost:8000',
      }),
    ).toThrow('VITE_API_BASE_URL must not be empty.')
  })

  it('does not hide missing required environment variables', () => {
    expect(() => createAppEnvironment({})).toThrow('VITE_API_BASE_URL is required.')
  })
})
