<script setup lang="ts">
import { Check, MapPin, Search } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import BaseDialog from '@/components/common/BaseDialog.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import type { CustomerBranch } from '@/types/customer-shell'
import { cn } from '@/utils/cn'

const props = defineProps<{
  selectedBranch: CustomerBranch
  branches: CustomerBranch[]
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  select: [branch: CustomerBranch]
  retry: []
}>()

const open = defineModel<boolean>({ default: false })
const searchQuery = ref('')
const filteredBranches = computed(() => {
  const normalizedQuery = searchQuery.value.trim().toLocaleLowerCase('vi')
  if (!normalizedQuery) return props.branches

  return props.branches.filter((branch) =>
    `${branch.name} ${branch.address}`.toLocaleLowerCase('vi').includes(normalizedQuery),
  )
})

watch(open, (isOpen) => {
  if (!isOpen) searchQuery.value = ''
})

function selectBranch(branch: CustomerBranch): void {
  emit('select', branch)
  open.value = false
}
</script>

<template>
  <BaseDialog
    v-model="open"
    title="Chọn chi nhánh Mizuki"
    description="Chọn chi nhánh để xem trải nghiệm mua sắm phù hợp."
    close-label="Đóng chọn chi nhánh"
    class="max-w-xl rounded-3xl border-white/80 bg-background/96 p-5 shadow-lg sm:p-7"
  >
    <div class="grid gap-5">
      <BaseInput
        v-model="searchQuery"
        type="search"
        label="Tìm chi nhánh"
        placeholder="Nhập tên hoặc khu vực chi nhánh"
        autocomplete="off"
      >
        <template #prefix><Search class="size-4" /></template>
      </BaseInput>

      <div class="grid gap-2" role="list" aria-label="Danh sách chi nhánh Mizuki">
        <p
          v-if="props.loading"
          class="rounded-2xl border border-dashed border-border bg-surface-subtle px-4 py-8 text-center text-body-sm text-muted-foreground"
        >
          Đang tải danh sách chi nhánh…
        </p>

        <div
          v-else-if="props.error"
          class="rounded-2xl border border-dashed border-border bg-surface-subtle px-4 py-6 text-center"
          role="alert"
        >
          <p class="text-body-sm text-muted-foreground">{{ props.error }}</p>
          <button
            type="button"
            class="motion-interactive mt-3 rounded-xl bg-primary-700 px-4 py-2 text-body-sm font-semibold text-white hover:bg-primary-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            @click="emit('retry')"
          >
            Thử lại
          </button>
        </div>

        <button
          v-for="branch in props.loading || props.error ? [] : filteredBranches"
          :key="branch.id"
          type="button"
          role="listitem"
          :aria-pressed="props.selectedBranch.id === branch.id"
          :class="cn(
            'motion-interactive flex min-h-20 w-full items-start gap-3 rounded-2xl border p-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
            props.selectedBranch.id === branch.id
              ? 'border-primary-300 bg-admin-sage-soft shadow-xs'
              : 'border-border bg-surface hover:border-primary-200 hover:bg-primary-50/60',
          )"
          @click="selectBranch(branch)"
        >
          <span class="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-primary-100 text-primary-700">
            <MapPin class="size-4.5" aria-hidden="true" />
          </span>
          <span class="min-w-0 flex-1">
            <span class="flex items-center justify-between gap-3">
              <span class="text-body-md font-semibold text-foreground">{{ branch.name }}</span>
              <span
                v-if="props.selectedBranch.id === branch.id"
                class="inline-flex shrink-0 items-center gap-1 text-caption font-semibold text-primary-800"
              >
                <Check class="size-4" aria-hidden="true" />
                Đang chọn
              </span>
            </span>
            <span class="mt-1 block text-body-sm text-muted-foreground">{{ branch.address }}</span>
            <span class="mt-1 block text-caption text-text-muted">{{ branch.note }}</span>
          </span>
        </button>

        <p
          v-if="!props.loading && !props.error && filteredBranches.length === 0"
          class="rounded-2xl border border-dashed border-border bg-surface-subtle px-4 py-8 text-center text-body-sm text-muted-foreground"
        >
          Không tìm thấy chi nhánh phù hợp.
        </p>
      </div>
    </div>
  </BaseDialog>
</template>
