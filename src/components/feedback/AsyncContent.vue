<script setup lang="ts">
import BaseAlert from '@/components/common/BaseAlert.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import type { AsyncError, AsyncStatus } from '@/types/feedback'
import LoadingState from './LoadingState.vue'
import NetworkErrorState from './NetworkErrorState.vue'
import PermissionErrorState from './PermissionErrorState.vue'
import RefreshingIndicator from './RefreshingIndicator.vue'

const props = withDefaults(
  defineProps<{
    status: AsyncStatus
    error?: AsyncError | null
    isRefreshing?: boolean
    hasData?: boolean
    loadingLabel?: string
    emptyTitle?: string
    emptyDescription?: string
    preserveContentOnError?: boolean
  }>(),
  {
    error: null,
    isRefreshing: false,
    hasData: false,
    loadingLabel: 'Đang tải dữ liệu',
    emptyTitle: 'Chưa có dữ liệu',
    emptyDescription: 'Nội dung sẽ xuất hiện tại đây khi có dữ liệu.',
    preserveContentOnError: false,
  },
)

const emit = defineEmits<{ retry: [] }>()

function retry(): void {
  emit('retry')
}
</script>

<template>
  <slot v-if="props.status === 'loading' && !props.hasData" name="loading">
    <LoadingState :label="props.loadingLabel" />
  </slot>

  <slot v-else-if="props.status === 'empty' || (props.status === 'success' && !props.hasData)" name="empty">
    <EmptyState :title="props.emptyTitle" :description="props.emptyDescription" />
  </slot>

  <template v-else-if="props.status === 'error' && (!props.hasData || !props.preserveContentOnError)">
    <slot name="error" :error="props.error" :retry="retry">
      <NetworkErrorState
        v-if="props.error?.kind === 'network'"
        :title="props.error.title"
        :description="props.error.message"
        @retry="retry"
      />
      <PermissionErrorState
        v-else-if="props.error?.kind === 'permission'"
        :title="props.error.title"
        :description="props.error.message"
      />
      <ErrorState
        v-else-if="props.error?.retryable"
        :title="props.error?.title ?? 'Không thể tải dữ liệu'"
        :description="props.error?.message"
        @retry="retry"
      />
      <BaseAlert
        v-else
        variant="error"
        :title="props.error?.title ?? 'Không thể tải dữ liệu'"
        :description="props.error?.message"
      />
    </slot>
  </template>

  <div v-else class="relative min-w-0">
    <BaseAlert
      v-if="props.status === 'error' && props.error"
      class="mb-4"
      variant="warning"
      :title="props.error.title"
      :description="props.error.message"
    />
    <slot />
    <slot v-if="props.isRefreshing" name="refreshing">
      <RefreshingIndicator class="mt-4" />
    </slot>
  </div>
</template>
