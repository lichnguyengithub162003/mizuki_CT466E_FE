import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { getBranches, type Branch } from '@/api/branchApi'

export const BRANCH_PREFERENCE_KEY = 'mizuki:selected-branch-id'

type BranchLoadStatus = 'idle' | 'loading' | 'success' | 'error'

function readSavedBranchId(): number | null {
  const rawValue = window.localStorage.getItem(BRANCH_PREFERENCE_KEY)
  if (rawValue === null) return null

  const parsedValue = Number(rawValue)
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null
}

export const useBranchPreferenceStore = defineStore('branch-preference', () => {
  const branches = ref<Branch[]>([])
  const selectedBranchId = ref<number | null>(null)
  const status = ref<BranchLoadStatus>('idle')
  const error = ref<string | null>(null)

  const selectedBranch = computed(
    () => branches.value.find((branch) => branch.id === selectedBranchId.value) ?? null,
  )

  function restore(): void {
    selectedBranchId.value = readSavedBranchId()
  }

  function selectBranch(branchId: number): void {
    const branch = branches.value.find(
      (candidate) => candidate.id === branchId && candidate.is_active,
    )
    if (!branch) return

    selectedBranchId.value = branch.id
    window.localStorage.setItem(BRANCH_PREFERENCE_KEY, String(branch.id))
  }

  function reconcile(): void {
    const activeBranches = branches.value.filter((branch) => branch.is_active)
    branches.value = activeBranches

    const restoredBranch = activeBranches.find(
      (branch) => branch.id === selectedBranchId.value,
    )
    if (restoredBranch) {
      window.localStorage.setItem(BRANCH_PREFERENCE_KEY, String(restoredBranch.id))
      return
    }

    const fallbackBranch = activeBranches[0]
    selectedBranchId.value = fallbackBranch?.id ?? null
    if (fallbackBranch) {
      window.localStorage.setItem(BRANCH_PREFERENCE_KEY, String(fallbackBranch.id))
    } else {
      window.localStorage.removeItem(BRANCH_PREFERENCE_KEY)
    }
  }

  async function load(): Promise<void> {
    status.value = 'loading'
    error.value = null

    try {
      branches.value = await getBranches()
      reconcile()
      status.value = 'success'
    } catch {
      branches.value = []
      status.value = 'error'
      error.value = 'Không thể tải danh sách chi nhánh. Vui lòng thử lại.'
    }
  }

  return {
    branches,
    selectedBranchId,
    selectedBranch,
    status,
    error,
    restore,
    selectBranch,
    reconcile,
    load,
  }
})
