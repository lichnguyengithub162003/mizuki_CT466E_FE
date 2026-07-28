<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BasePagination from '@/components/common/BasePagination.vue'
import { useAsyncState } from '@/composables/useAsyncState'
import type { AsyncError } from '@/types/feedback'
import AsyncActionButton from './AsyncActionButton.vue'
import AsyncContent from './AsyncContent.vue'
import DataGridSkeleton from './DataGridSkeleton.vue'
import DataListSkeleton from './DataListSkeleton.vue'
import FilterEmptyState from './FilterEmptyState.vue'
import PermissionErrorState from './PermissionErrorState.vue'
import SearchEmptyState from './SearchEmptyState.vue'
import SuccessState from './SuccessState.vue'
import WarningState from './WarningState.vue'

type DemoState =
  | 'loading'
  | 'loaded'
  | 'empty'
  | 'search-empty'
  | 'filter-empty'
  | 'network-error'
  | 'permission-error'
  | 'refreshing'
  | 'success'
  | 'warning'

interface DemoControl {
  value: DemoState
  label: string
}

const demoItems = ['Nội dung mẫu A', 'Nội dung mẫu B', 'Nội dung mẫu C']
const controls: readonly DemoControl[] = [
  { value: 'loading', label: 'Đang tải' },
  { value: 'loaded', label: 'Đã tải' },
  { value: 'empty', label: 'Trống' },
  { value: 'search-empty', label: 'Tìm kiếm trống' },
  { value: 'filter-empty', label: 'Bộ lọc trống' },
  { value: 'network-error', label: 'Lỗi mạng' },
  { value: 'permission-error', label: 'Không có quyền' },
  { value: 'refreshing', label: 'Đang cập nhật' },
  { value: 'success', label: 'Thành công' },
  { value: 'warning', label: 'Cảnh báo' },
]

const networkError: AsyncError = {
  kind: 'network',
  title: 'Không thể kết nối',
  message: 'Kết nối đang gián đoạn. Vui lòng kiểm tra mạng và thử lại.',
  retryable: true,
}

const selectedState = ref<DemoState>('loading')
const currentPage = ref(1)
const actionPending = ref(false)
const actionCount = ref(0)
const asyncState = useAsyncState<string[]>()
const hasData = computed(() => (asyncState.data.value?.length ?? 0) > 0)

asyncState.startLoading()

function selectState(state: DemoState): void {
  selectedState.value = state
  if (state === 'loading') asyncState.startLoading()
  if (state === 'loaded') asyncState.setSuccess(demoItems)
  if (state === 'empty') asyncState.setEmpty()
  if (state === 'network-error') asyncState.setError(networkError)
  if (state === 'refreshing') {
    asyncState.setSuccess(demoItems)
    asyncState.startRefreshing()
  }
}

function showLoaded(): void {
  selectState('loaded')
}

function retryNetwork(): void {
  if (asyncState.isLoading.value) return
  selectState('loading')
}

async function runAsyncAction(): Promise<void> {
  if (actionPending.value) return
  actionPending.value = true
  actionCount.value += 1
  await new Promise<void>((resolve) => window.setTimeout(resolve, 350))
  actionPending.value = false
}
</script>

<template>
  <div class="grid gap-8" data-testid="feedback-states-demo">
    <div class="flex flex-wrap gap-2" aria-label="Điều khiển trạng thái">
      <BaseButton
        v-for="control in controls"
        :key="control.value"
        :variant="selectedState === control.value ? 'primary' : 'outline'"
        size="sm"
        :aria-pressed="selectedState === control.value"
        @click="selectState(control.value)"
      >
        {{ control.label }}
      </BaseButton>
    </div>

    <div class="min-w-0 rounded-xl border border-border bg-surface p-4 shadow-xs sm:p-6" data-testid="active-feedback-state">
      <SearchEmptyState
        v-if="selectedState === 'search-empty'"
        query="liệu trình chăm sóc chuyên sâu dành cho làn da nhạy cảm"
      >
        <template #action>
          <BaseButton variant="outline" @click="showLoaded">Xóa tìm kiếm</BaseButton>
        </template>
      </SearchEmptyState>

      <FilterEmptyState v-else-if="selectedState === 'filter-empty'">
        <template #action>
          <BaseButton variant="outline" @click="showLoaded">Xóa bộ lọc</BaseButton>
        </template>
      </FilterEmptyState>

      <PermissionErrorState v-else-if="selectedState === 'permission-error'">
        <template #action>
          <BaseButton variant="outline" @click="showLoaded">Quay lại nội dung mẫu</BaseButton>
        </template>
      </PermissionErrorState>

      <SuccessState
        v-else-if="selectedState === 'success'"
        title="Thao tác đã hoàn tất"
        description="Nội dung đã được cập nhật thành công."
      >
        <template #action>
          <BaseButton variant="outline" @click="showLoaded">Xem nội dung</BaseButton>
        </template>
      </SuccessState>

      <WarningState
        v-else-if="selectedState === 'warning'"
        title="Cần kiểm tra lại"
        description="Một số thông tin cần được xác nhận trước khi tiếp tục."
      >
        <template #action>
          <BaseButton variant="outline" @click="showLoaded">Xem lại</BaseButton>
        </template>
      </WarningState>

      <AsyncContent
        v-else
        :status="asyncState.status.value"
        :error="asyncState.error.value"
        :is-refreshing="asyncState.isRefreshing.value"
        :has-data="hasData"
        empty-title="Chưa có nội dung"
        empty-description="Dữ liệu mới sẽ xuất hiện tại đây."
        @retry="retryNetwork"
      >
        <template #loading>
          <div class="grid gap-5" data-testid="initial-loading">
            <p class="text-body-sm font-semibold text-muted-foreground" role="status" aria-live="polite">
              Đang tải danh sách
            </p>
            <DataListSkeleton :rows="3" />
          </div>
        </template>
        <div class="grid gap-3" data-testid="loaded-content">
          <article
            v-for="item in asyncState.data.value ?? []"
            :key="item"
            class="rounded-lg border border-border bg-surface-subtle p-4"
          >
            <p class="text-body-md font-semibold">{{ item }}</p>
            <p class="mt-1 text-body-sm text-muted-foreground">Dữ liệu trình diễn, không liên kết nghiệp vụ.</p>
          </article>
        </div>
      </AsyncContent>
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <div class="grid content-start gap-4 rounded-xl border border-border bg-surface p-5">
        <div>
          <h3 class="text-heading-4">Async action</h3>
          <p class="mt-1 text-body-sm text-muted-foreground">
            Nút khóa tương tác lặp khi thao tác đang xử lý.
          </p>
        </div>
        <AsyncActionButton
          class="w-fit"
          :pending="actionPending"
          pending-label="Đang lưu"
          data-testid="async-action"
          @click="runAsyncAction"
        >
          Lưu thay đổi mẫu
        </AsyncActionButton>
        <p class="text-body-sm text-muted-foreground" data-testid="async-action-count">
          Số lần xử lý: {{ actionCount }}
        </p>
      </div>

      <div class="grid content-start gap-4 rounded-xl border border-border bg-surface p-5">
        <div>
          <h3 class="text-heading-4">Pagination state</h3>
          <p class="mt-1 text-body-sm text-muted-foreground">Trang hiện tại: {{ currentPage }} / 4</p>
        </div>
        <BasePagination v-model:current-page="currentPage" :total-pages="4" />
      </div>
    </div>

    <div class="grid gap-5">
      <div>
        <h3 class="text-heading-4">Grid skeleton responsive</h3>
        <p class="mt-1 text-body-sm text-muted-foreground">
          Cấu trúc trung tính co từ ba cột xuống một cột mà không tràn ngang.
        </p>
      </div>
      <DataGridSkeleton :items="3" :columns="3" />
    </div>
  </div>
</template>
