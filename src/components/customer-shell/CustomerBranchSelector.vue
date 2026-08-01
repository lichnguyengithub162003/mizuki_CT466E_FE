<script setup lang="ts">
import { ChevronDown, MapPin } from '@lucide/vue'
import { computed, ref } from 'vue'
import type { CustomerBranch } from '@/types/customer-shell'
import { cn } from '@/utils/cn'
import { pinia } from '@/stores/pinia'
import { useBranchPreferenceStore } from '@/stores/branchPreference'
import CustomerBranchDialog from './CustomerBranchDialog.vue'

const props = withDefaults(
  defineProps<{
    selectedBranch: CustomerBranch
    compact?: boolean
    class?: string
  }>(),
  {
    compact: false,
    class: undefined,
  },
)

const emit = defineEmits<{
  select: [branch: CustomerBranch]
}>()

const dialogOpen = ref(false)
const branchStore = useBranchPreferenceStore(pinia)
const branches = computed<CustomerBranch[]>(() =>
  branchStore.branches.map((branch) => ({
    id: branch.id,
    name: branch.name,
    address: branch.address,
    note: branch.phone ?? branch.email ?? '',
  }) as unknown as CustomerBranch),
)

function selectBranch(branch: CustomerBranch): void {
  branchStore.selectBranch(Number(branch.id))
  emit('select', branch)
}

function openDialog(): void {
  dialogOpen.value = true
  if (branchStore.status === 'idle') {
    void branchStore.load()
  }
}
</script>

<template>
  <button
    type="button"
    :aria-expanded="dialogOpen"
    aria-haspopup="dialog"
    :aria-label="`Chọn chi nhánh. Hiện tại: ${props.selectedBranch.name}`"
    :class="cn(
      'motion-interactive inline-flex min-h-11 min-w-0 items-center gap-2 rounded-2xl border border-primary-200 bg-admin-sage-soft text-left text-primary-900 shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
      props.compact ? 'max-w-36 px-2.5' : 'px-4',
      props.class,
    )"
    @click="openDialog"
  >
    <MapPin class="size-4.5 shrink-0 text-primary-700" aria-hidden="true" />
    <span class="min-w-0 flex-1">
      <span v-if="!props.compact" class="block text-[0.6875rem] uppercase tracking-[0.12em] text-primary-700">
        Chi nhánh
      </span>
      <span class="block truncate text-body-sm font-semibold">{{ props.selectedBranch.name }}</span>
    </span>
    <ChevronDown class="size-4 shrink-0" aria-hidden="true" />
  </button>

  <CustomerBranchDialog
    v-model="dialogOpen"
    :selected-branch="props.selectedBranch"
    :branches="branches"
    :loading="branchStore.status === 'loading'"
    :error="branchStore.error"
    @retry="branchStore.load()"
    @select="selectBranch"
  />
</template>
