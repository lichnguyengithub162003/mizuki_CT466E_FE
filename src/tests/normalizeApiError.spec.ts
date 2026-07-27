import { describe, expect, it } from 'vitest'
import { normalizeApiError } from '@/api/normalizeApiError'

describe('normalizeApiError', () => {
  it('normalizes network and timeout errors', () => {
    expect(normalizeApiError({ isAxiosError: true, code: 'ERR_NETWORK' }).kind).toBe('network')
    expect(normalizeApiError({ isAxiosError: true, code: 'ECONNABORTED' }).kind).toBe('timeout')
  })

  it('normalizes a 422 response with typed validation messages', () => {
    const error = normalizeApiError({
      isAxiosError: true,
      response: {
        status: 422,
        data: {
          message: 'Dữ liệu chưa hợp lệ.',
          errors: {
            email: ['Email không hợp lệ.'],
            name: 'Tên là bắt buộc.',
            ignored: 42,
          },
        },
      },
    })

    expect(error).toMatchObject({
      name: 'ApplicationError',
      kind: 'validation',
      status: 422,
      message: 'Dữ liệu chưa hợp lệ.',
      validationErrors: {
        email: ['Email không hợp lệ.'],
        name: ['Tên là bắt buộc.'],
      },
    })
  })

  it.each([
    [401, 'unauthorized'],
    [403, 'forbidden'],
    [404, 'not-found'],
    [500, 'server'],
    [409, 'http'],
  ] as const)('maps HTTP %i to %s', (status, expectedKind) => {
    const error = normalizeApiError({
      isAxiosError: true,
      response: { status, data: {} },
    })

    expect(error.kind).toBe(expectedKind)
  })

  it('keeps non-Axios causes as unknown', () => {
    expect(normalizeApiError(new Error('Unexpected')).kind).toBe('unknown')
  })
})
