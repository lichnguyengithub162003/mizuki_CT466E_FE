import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import AsyncActionButton from '@/components/feedback/AsyncActionButton.vue'
import AsyncContent from '@/components/feedback/AsyncContent.vue'
import DataGridSkeleton from '@/components/feedback/DataGridSkeleton.vue'
import DataListSkeleton from '@/components/feedback/DataListSkeleton.vue'
import FilterEmptyState from '@/components/feedback/FilterEmptyState.vue'
import LoadingState from '@/components/feedback/LoadingState.vue'
import NetworkErrorState from '@/components/feedback/NetworkErrorState.vue'
import PermissionErrorState from '@/components/feedback/PermissionErrorState.vue'
import RefreshingIndicator from '@/components/feedback/RefreshingIndicator.vue'
import SearchEmptyState from '@/components/feedback/SearchEmptyState.vue'
import SuccessState from '@/components/feedback/SuccessState.vue'
import WarningState from '@/components/feedback/WarningState.vue'
import { useAsyncState } from '@/composables/useAsyncState'
import type { AsyncError } from '@/types/feedback'

const networkError: AsyncError = {
  kind: 'network',
  title: 'Mất kết nối',
  message: 'Vui lòng thử lại.',
  retryable: true,
}

describe('useAsyncState', () => {
  it('starts idle without initial data', () => {
    const state = useAsyncState<string[]>()

    expect(state.status.value).toBe('idle')
    expect(state.data.value).toBeNull()
  })

  it('starts successful when initial data exists', () => {
    const state = useAsyncState(['A'])

    expect(state.status.value).toBe('success')
    expect(state.data.value).toEqual(['A'])
  })

  it('moves to loading and clears stale state', () => {
    const state = useAsyncState(['A'])
    state.setError(networkError)

    state.startLoading()

    expect(state.isLoading.value).toBe(true)
    expect(state.data.value).toBeNull()
    expect(state.error.value).toBeNull()
  })

  it('stores successful data and update time', () => {
    const state = useAsyncState<string[]>()

    state.setSuccess(['A', 'B'])

    expect(state.isSuccess.value).toBe(true)
    expect(state.data.value).toEqual(['A', 'B'])
    expect(state.lastUpdatedAt.value).toBeInstanceOf(Date)
  })

  it('moves to empty and removes data', () => {
    const state = useAsyncState(['A'])

    state.setEmpty()

    expect(state.isEmpty.value).toBe(true)
    expect(state.data.value).toBeNull()
  })

  it('stores a typed error without removing existing data', () => {
    const state = useAsyncState(['A'])

    state.setError(networkError)

    expect(state.isError.value).toBe(true)
    expect(state.error.value).toEqual(networkError)
    expect(state.data.value).toEqual(['A'])
  })

  it('refreshes without removing existing data', () => {
    const state = useAsyncState(['A'])

    state.startRefreshing()

    expect(state.isRefreshing.value).toBe(true)
    expect(state.data.value).toEqual(['A'])
    state.stopRefreshing()
    expect(state.isRefreshing.value).toBe(false)
  })

  it('uses initial loading when refresh starts without data', () => {
    const state = useAsyncState<string[]>()

    state.startRefreshing()

    expect(state.isLoading.value).toBe(true)
    expect(state.isRefreshing.value).toBe(false)
  })

  it('resets to its initial state', () => {
    const state = useAsyncState(['A'])
    state.setSuccess(['B'])

    state.reset()

    expect(state.status.value).toBe('success')
    expect(state.data.value).toEqual(['A'])
    expect(state.lastUpdatedAt.value).toBeUndefined()
  })
})

describe('AsyncContent', () => {
  it('renders a custom loading slot without main content', () => {
    const wrapper = mount(AsyncContent, {
      props: { status: 'loading' },
      slots: { loading: '<p data-test="loading">Đang chờ</p>', default: '<p data-test="content">Nội dung</p>' },
    })

    expect(wrapper.find('[data-test="loading"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="content"]').exists()).toBe(false)
  })

  it('renders its default loading state', () => {
    const wrapper = mount(AsyncContent, { props: { status: 'loading', loadingLabel: 'Đang đọc dữ liệu' } })

    expect(wrapper.get('[role="status"]').text()).toContain('Đang đọc dữ liệu')
  })

  it('renders successful content when data exists', () => {
    const wrapper = mount(AsyncContent, {
      props: { status: 'success', hasData: true },
      slots: { default: '<p data-test="content">Nội dung</p>' },
    })

    expect(wrapper.get('[data-test="content"]').text()).toBe('Nội dung')
  })

  it('renders empty state for success without data', () => {
    const wrapper = mount(AsyncContent, {
      props: { status: 'success', emptyTitle: 'Chưa có bản ghi' },
    })

    expect(wrapper.text()).toContain('Chưa có bản ghi')
  })

  it('renders empty state for explicit empty status', () => {
    const wrapper = mount(AsyncContent, {
      props: { status: 'empty', emptyDescription: 'Hãy tạo dữ liệu đầu tiên.' },
    })

    expect(wrapper.text()).toContain('Hãy tạo dữ liệu đầu tiên.')
  })

  it('renders a network error state', () => {
    const wrapper = mount(AsyncContent, { props: { status: 'error', error: networkError } })

    expect(wrapper.text()).toContain('Mất kết nối')
    expect(wrapper.get('[role="alert"]').text()).toContain('Mất kết nối')
  })

  it('emits retry from its error state', async () => {
    const wrapper = mount(AsyncContent, { props: { status: 'error', error: networkError } })

    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('retry')).toHaveLength(1)
  })

  it('keeps content and shows a refresh indicator', () => {
    const wrapper = mount(AsyncContent, {
      props: { status: 'success', hasData: true, isRefreshing: true },
      slots: { default: '<p data-test="content">Dữ liệu cũ</p>' },
    })

    expect(wrapper.get('[data-test="content"]').text()).toBe('Dữ liệu cũ')
    expect(wrapper.text()).toContain('Đang cập nhật')
  })

  it('can preserve content after a recoverable error', () => {
    const wrapper = mount(AsyncContent, {
      props: { status: 'error', error: networkError, hasData: true, preserveContentOnError: true },
      slots: { default: '<p data-test="content">Dữ liệu đang có</p>' },
    })

    expect(wrapper.get('[data-test="content"]').text()).toBe('Dữ liệu đang có')
    expect(wrapper.text()).toContain('Mất kết nối')
  })
})

describe('feedback components', () => {
  it('disables an async action and blocks clicks while pending', async () => {
    const wrapper = mount(AsyncActionButton, {
      props: { pending: true, pendingLabel: 'Đang lưu' },
      slots: { default: 'Lưu' },
    })

    await wrapper.get('button').trigger('click')

    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
    expect(wrapper.get('button').attributes('aria-busy')).toBe('true')
    expect(wrapper.text()).toContain('Đang lưu')
    expect(wrapper.emitted('click')).toBeUndefined()
  })

  it('emits one click when an async action is available', async () => {
    const wrapper = mount(AsyncActionButton, {
      props: { pending: false },
      slots: { default: 'Lưu' },
    })

    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('shows a search query in the empty copy', () => {
    const wrapper = mount(SearchEmptyState, { props: { query: 'serum dịu nhẹ' } })

    expect(wrapper.text()).toContain('serum dịu nhẹ')
    expect(wrapper.text()).toContain('Không tìm thấy kết quả')
  })

  it('renders the filter empty action slot', () => {
    const wrapper = mount(FilterEmptyState, { slots: { action: '<button>Xóa bộ lọc</button>' } })

    expect(wrapper.get('button').text()).toBe('Xóa bộ lọc')
  })

  it('emits retry from a network error', async () => {
    const wrapper = mount(NetworkErrorState)

    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('retry')).toHaveLength(1)
  })

  it('uses permission-specific language and action', () => {
    const wrapper = mount(PermissionErrorState, { slots: { action: '<button>Quay lại</button>' } })

    expect(wrapper.text()).toContain('không có quyền truy cập')
    expect(wrapper.get('button').text()).toBe('Quay lại')
  })

  it('renders success semantics and an action', () => {
    const wrapper = mount(SuccessState, {
      props: { title: 'Đã hoàn tất', description: 'Thay đổi đã lưu.' },
      slots: { action: '<button>Tiếp tục</button>' },
    })

    expect(wrapper.get('[role="status"]').text()).toContain('Đã hoàn tất')
    expect(wrapper.get('button').text()).toBe('Tiếp tục')
  })

  it('renders warning semantics without destructive alert role', () => {
    const wrapper = mount(WarningState, { props: { title: 'Cần kiểm tra' } })

    expect(wrapper.get('[role="status"]').text()).toContain('Cần kiểm tra')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('renders the requested number of list skeleton rows', () => {
    const wrapper = mount(DataListSkeleton, { props: { rows: 3 } })

    expect(wrapper.findAll('[data-skeleton-row]')).toHaveLength(3)
    expect(wrapper.get('[role="status"]').attributes('aria-label')).toBe('Đang tải danh sách')
  })

  it('renders the requested number of grid skeleton items', () => {
    const wrapper = mount(DataGridSkeleton, { props: { items: 5, columns: 3 } })

    expect(wrapper.findAll('[data-skeleton-item]')).toHaveLength(5)
    expect(wrapper.classes()).toContain('lg:grid-cols-3')
  })

  it('provides polite live regions for loading and refreshing', () => {
    const loading = mount(LoadingState)
    const refreshing = mount(RefreshingIndicator)

    expect(loading.get('[role="status"]').attributes('aria-live')).toBe('polite')
    expect(refreshing.get('[role="status"]').attributes('aria-live')).toBe('polite')
  })

  it('does not make a network request while rendering or interacting', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open')
    const wrapper = mount(NetworkErrorState)

    await wrapper.get('button').trigger('click')
    await nextTick()

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(xhrSpy).not.toHaveBeenCalled()
    xhrSpy.mockRestore()
    vi.unstubAllGlobals()
  })
})
