<script setup lang="ts">
import { ArrowLeft, UserRound } from "@lucide/vue";
import { RouterLink, useRoute } from "vue-router";

const route = useRoute();
</script>

<template>
  <section class="min-h-full p-1 sm:p-2" aria-labelledby="staff-detail-title">
    <RouterLink
      to="/admin/staff"
      class="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-body-sm font-medium text-muted-foreground transition hover:bg-primary-50 hover:text-primary-900"
    >
      <ArrowLeft class="size-4" aria-hidden="true" /> Quay lại danh sách nhân viên
    </RouterLink>
    <div class="mt-4 rounded-[1.75rem] bg-surface p-6 shadow-sm ring-1 ring-black/[0.04] sm:p-8">
      <span class="grid size-12 place-items-center rounded-2xl bg-primary-50 text-primary-800">
        <UserRound class="size-5" aria-hidden="true" />
      </span>
      <p class="mt-5 text-caption font-medium text-muted-foreground">Mã hồ sơ #{{ route.params.id }}</p>
      <h1 id="staff-detail-title" class="mt-1 text-heading-2">Chi tiết nhân viên</h1>
      <p class="mt-2 max-w-xl text-body-sm text-muted-foreground">
        Không gian chi tiết nhân viên đã sẵn sàng. Nội dung nghiệp vụ sẽ được hoàn thiện trong bước tiếp theo.
      </p>
    </div>
  </section>
</template>
