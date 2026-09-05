<script setup lang="ts">
import BasePagination from '@/components/common/BasePagination.vue'
defineProps<{ currentPage: number; totalPages: number; total?: number; disabled?: boolean }>()
defineEmits<{ 'update:currentPage': [number] }>()
</script>
<template><footer class="mt-5 flex flex-col items-center justify-between gap-3 border-t border-border pt-4 sm:flex-row"><p class="text-body-sm text-muted-foreground">{{ total ?? 0 }} kết quả</p><BasePagination :current-page="currentPage" :total-pages="totalPages" :disabled="disabled" @update:current-page="$emit('update:currentPage', $event)" /></footer></template>
