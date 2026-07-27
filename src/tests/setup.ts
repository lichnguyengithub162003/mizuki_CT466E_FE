import { afterEach } from 'vitest'
import { enableAutoUnmount } from '@vue/test-utils'

enableAutoUnmount(afterEach)

Object.defineProperty(window, 'scrollTo', {
  configurable: true,
  value: () => undefined,
})
