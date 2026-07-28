import { computed, ref, type ComputedRef, type Ref } from 'vue'
import type { AsyncError, AsyncStatus } from '@/types/feedback'

export interface UseAsyncStateReturn<T> {
  status: Ref<AsyncStatus>
  data: Ref<T | null>
  error: Ref<AsyncError | null>
  isLoading: ComputedRef<boolean>
  isSuccess: ComputedRef<boolean>
  isEmpty: ComputedRef<boolean>
  isError: ComputedRef<boolean>
  isRefreshing: Ref<boolean>
  lastUpdatedAt: Ref<Date | undefined>
  startLoading: () => void
  setSuccess: (data: T) => void
  setEmpty: () => void
  setError: (error: AsyncError) => void
  startRefreshing: () => void
  stopRefreshing: () => void
  reset: () => void
}

/**
 * Provides minimal local orchestration for async view states.
 * Server data ownership remains with TanStack Query.
 */
export function useAsyncState<T>(initialData: T | null = null): UseAsyncStateReturn<T> {
  const initialStatus: AsyncStatus = initialData === null ? 'idle' : 'success'
  const status = ref<AsyncStatus>(initialStatus)
  const data = ref<T | null>(initialData) as Ref<T | null>
  const error = ref<AsyncError | null>(null)
  const isRefreshing = ref(false)
  const lastUpdatedAt = ref<Date>()

  const isLoading = computed(() => status.value === 'loading')
  const isSuccess = computed(() => status.value === 'success')
  const isEmpty = computed(() => status.value === 'empty')
  const isError = computed(() => status.value === 'error')

  function startLoading(): void {
    status.value = 'loading'
    data.value = null
    error.value = null
    isRefreshing.value = false
  }

  function setSuccess(nextData: T): void {
    status.value = 'success'
    data.value = nextData
    error.value = null
    isRefreshing.value = false
    lastUpdatedAt.value = new Date()
  }

  function setEmpty(): void {
    status.value = 'empty'
    data.value = null
    error.value = null
    isRefreshing.value = false
    lastUpdatedAt.value = new Date()
  }

  function setError(nextError: AsyncError): void {
    status.value = 'error'
    error.value = nextError
    isRefreshing.value = false
  }

  function startRefreshing(): void {
    if (data.value === null) {
      startLoading()
      return
    }
    isRefreshing.value = true
    error.value = null
  }

  function stopRefreshing(): void {
    isRefreshing.value = false
  }

  function reset(): void {
    status.value = initialStatus
    data.value = initialData
    error.value = null
    isRefreshing.value = false
    lastUpdatedAt.value = undefined
  }

  return {
    status,
    data,
    error,
    isLoading,
    isSuccess,
    isEmpty,
    isError,
    isRefreshing,
    lastUpdatedAt,
    startLoading,
    setSuccess,
    setEmpty,
    setError,
    startRefreshing,
    stopRefreshing,
    reset,
  }
}
