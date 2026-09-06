<script setup lang="ts">
import { computed, ref } from 'vue'
import { CalendarDays, ChevronDown, X } from '@lucide/vue'
import BasePopover from '@/components/common/BasePopover.vue'

const props = defineProps<{ dateFrom: string; dateTo: string }>()
const emit = defineEmits<{ 'update:dateFrom': [value: string]; 'update:dateTo': [value: string] }>()
const open = ref(false)
const active = computed(() => Boolean(props.dateFrom || props.dateTo))
const label = computed(() => active.value ? `${props.dateFrom || '…'} – ${props.dateTo || '…'}` : 'Mọi thời gian')

function clear(): void {
  emit('update:dateFrom', '')
  emit('update:dateTo', '')
}
</script>

<template>
  <BasePopover v-model="open" align="end" :side-offset="6" class="w-72 p-3">
    <template #trigger>
      <button type="button" aria-label="Lọc theo ngày" :aria-expanded="open" class="refund-date-trigger" :class="active && 'text-primary-900'">
        <CalendarDays class="size-4 shrink-0" aria-hidden="true" />
        <span class="min-w-0 flex-1 truncate text-left">{{ label }}</span>
        <ChevronDown class="size-3.5 shrink-0 text-muted-foreground transition-transform duration-150" :class="open && 'rotate-180'" aria-hidden="true" />
      </button>
    </template>
    <div class="grid gap-3">
      <div class="flex items-center justify-between"><p class="text-[0.75rem] font-medium">Khoảng ngày yêu cầu</p><button v-if="active" type="button" class="inline-flex items-center gap-1 text-[0.6875rem] font-medium text-primary-700" @click="clear"><X class="size-3"/>Xóa</button></div>
      <label class="grid gap-1 text-[0.6875rem] text-muted-foreground">Từ ngày<input :value="dateFrom" type="date" aria-label="Từ ngày hoàn tiền" class="h-9 rounded-lg bg-surface-subtle px-2.5 text-[0.8125rem] text-foreground outline-none ring-1 ring-inset ring-border focus:ring-primary-500" @input="emit('update:dateFrom', ($event.target as HTMLInputElement).value)"></label>
      <label class="grid gap-1 text-[0.6875rem] text-muted-foreground">Đến ngày<input :value="dateTo" :min="dateFrom" type="date" aria-label="Đến ngày hoàn tiền" class="h-9 rounded-lg bg-surface-subtle px-2.5 text-[0.8125rem] text-foreground outline-none ring-1 ring-inset ring-border focus:ring-primary-500" @input="emit('update:dateTo', ($event.target as HTMLInputElement).value)"></label>
    </div>
  </BasePopover>
</template>

<style scoped>
.refund-date-trigger { display:flex; height:2.5rem; width:11.25rem; align-items:center; gap:.5rem; border:1px solid rgba(16,28,19,.055); border-radius:.75rem; background:var(--surface-subtle); padding:0 .625rem 0 .75rem; color:var(--foreground); font-size:.8125rem; box-shadow:0 1px 2px rgba(16,28,19,.025); outline:none; transition:background-color 150ms,border-color 150ms,box-shadow 150ms; }
.refund-date-trigger:hover { border-color:rgba(39,93,70,.14); background:var(--surface); }
.refund-date-trigger:focus-visible { border-color:var(--primary-500); box-shadow:0 0 0 3px rgba(39,93,70,.1); }
</style>
