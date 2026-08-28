<script setup lang="ts">
withDefaults(defineProps<{ detail?: boolean }>(), { detail: false })
</script>

<template>
  <div class="grid gap-4" :data-order-skeleton="detail ? 'detail' : 'card'" aria-hidden="true">
    <article class="overflow-hidden rounded-3xl bg-surface shadow-sm ring-1 ring-primary-100/70">
      <div class="grid gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:p-5">
      <div>
        <div class="rounded-xl border border-border">
          <div class="h-10 animate-pulse border-b border-border bg-surface-subtle motion-reduce:animate-none" />
          <div v-for="index in detail ? 3 : 2" :key="index" class="grid grid-cols-[4.5rem_minmax(0,1fr)_5rem] gap-3 border-b border-border p-3 last:border-0">
            <span class="aspect-square animate-pulse rounded-xl bg-surface-subtle motion-reduce:animate-none" />
            <span class="space-y-2"><i class="block h-4 w-4/5 animate-pulse rounded bg-surface-subtle motion-reduce:animate-none" /><i class="block h-3 w-16 animate-pulse rounded bg-surface-subtle motion-reduce:animate-none" /></span>
            <span class="space-y-2"><i class="block h-3 w-full animate-pulse rounded bg-surface-subtle motion-reduce:animate-none" /><i class="block h-4 w-full animate-pulse rounded bg-surface-subtle motion-reduce:animate-none" /></span>
          </div>
        </div>
      </div>
      <div class="grid content-start gap-4 rounded-2xl bg-surface-subtle p-4"><span class="h-7 w-28 animate-pulse rounded-pill bg-white motion-reduce:animate-none" /><span class="h-12 w-full animate-pulse rounded-xl bg-white motion-reduce:animate-none" /><span class="h-10 w-full animate-pulse rounded-xl bg-white motion-reduce:animate-none" /></div>
      </div>
    </article>
    <div v-if="detail" class="grid gap-4 lg:grid-cols-2"><span class="h-40 animate-pulse rounded-2xl bg-surface-subtle motion-reduce:animate-none" /><span class="h-40 animate-pulse rounded-2xl bg-surface-subtle motion-reduce:animate-none" /></div>
  </div>
</template>
