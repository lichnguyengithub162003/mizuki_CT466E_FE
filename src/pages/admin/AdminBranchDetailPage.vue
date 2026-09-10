<script setup lang="ts">
import { ArrowLeft, Building2 } from '@lucide/vue'
import { RouterLink, useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <section class="min-w-0" aria-labelledby="branch-detail-title" data-testid="admin-branch-detail">
    <RouterLink to="/admin/branches" class="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-primary-700 hover:text-primary-900"><ArrowLeft class="size-4" />Quay lại danh sách chi nhánh</RouterLink>
    <div class="mt-4 grid min-h-[22rem] place-items-center rounded-[1.25rem] bg-white p-8 text-center shadow-[0_1px_2px_rgba(16,28,19,.025),0_10px_30px_rgba(16,28,19,.04)] ring-1 ring-black/[0.04]">
      <div class="max-w-md"><span class="mx-auto grid size-12 place-items-center rounded-2xl bg-primary-50 text-primary-700"><Building2 class="size-5" /></span><h1 id="branch-detail-title" class="mt-4 text-xl font-semibold tracking-[-0.025em] text-[#1b2921]">Chi tiết chi nhánh</h1><p class="mt-2 text-[0.875rem] leading-6 text-muted-foreground">Giao diện chi tiết sẽ được triển khai trong tác vụ tiếp theo.</p><p class="mt-3 text-[0.6875rem] font-medium uppercase tracking-wider text-text-muted">Mã tham chiếu #{{ route.params.id }}</p></div>
    </div>
  </section>
</template>
