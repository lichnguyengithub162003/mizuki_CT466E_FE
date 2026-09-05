<script setup lang="ts">
import { Search, X } from '@lucide/vue'
const model = defineModel<string>({ default: '' })
defineProps<{ placeholder?: string }>()
</script>
<template>
  <label class="relative block min-w-0 flex-1">
    <span class="sr-only">Tìm kiếm</span><Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    <input v-model="model" type="search" :placeholder="placeholder || 'Tìm kiếm…'" class="min-h-11 w-full rounded-xl border border-border bg-surface py-2 pl-10 pr-10 text-body-md" />
    <button v-if="model" type="button" aria-label="Xóa tìm kiếm" class="absolute right-2 top-1/2 -translate-y-1/2 p-2" @click="model = ''"><X class="size-4" /></button>
  </label>
</template>
