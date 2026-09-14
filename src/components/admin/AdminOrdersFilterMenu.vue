<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check, ChevronDown } from '@lucide/vue'
import BasePopover from '@/components/common/BasePopover.vue'

const props = defineProps<{
  modelValue: string
  options: ReadonlyArray<{ value: string; label: string }>
  label: string
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const open = ref(false)
const selectedLabel = computed(() => props.options.find(option => option.value === props.modelValue)?.label ?? props.options[0]?.label ?? '')

function select(value: string): void {
  emit('update:modelValue', value)
  open.value = false
}
</script>

<template>
  <BasePopover v-model="open" align="start" :side-offset="6" class="w-56 p-1.5">
    <template #trigger>
      <button
        type="button"
        :aria-label="props.label"
        :aria-expanded="open"
        class="orders-menu-trigger"
      >
        <span class="min-w-0 flex-1 truncate text-left">{{ selectedLabel }}</span>
        <span class="grid size-5 shrink-0 place-items-center text-muted-foreground" aria-hidden="true">
          <ChevronDown class="size-3.5 transition-transform duration-150" :class="open && 'rotate-180'" />
        </span>
      </button>
    </template>

    <div role="radiogroup" :aria-label="props.label" class="grid gap-0.5">
      <button
        v-for="option in props.options"
        :key="option.value || '__all'"
        type="button"
        role="radio"
        :aria-checked="option.value === props.modelValue"
        class="flex min-h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-[0.8125rem] outline-none transition-colors duration-150 hover:bg-primary-50 focus-visible:bg-primary-50 focus-visible:ring-2 focus-visible:ring-primary-500/25"
        :class="option.value === props.modelValue && 'bg-primary-50/70 text-primary-900'"
        @click="select(option.value)"
      >
        <span class="min-w-0 flex-1 truncate">{{ option.label }}</span>
        <Check v-if="option.value === props.modelValue" class="size-3.5 shrink-0 text-primary-700" aria-hidden="true" />
      </button>
    </div>
  </BasePopover>
</template>

<style scoped>
.orders-menu-trigger {
  display: flex;
  height: 2.5rem;
  min-width: 9.5rem;
  max-width: 13.75rem;
  align-items: center;
  gap: .625rem;
  border: 1px solid rgba(16, 28, 19, .055);
  border-radius: .75rem;
  background: var(--surface-subtle);
  padding: 0 .625rem 0 .75rem;
  color: var(--foreground);
  font-size: .8125rem;
  box-shadow: 0 1px 2px rgba(16, 28, 19, .025);
  outline: none;
  transition: background-color 150ms, border-color 150ms, box-shadow 150ms;
}
.orders-menu-trigger:hover { border-color: rgba(39, 93, 70, .14); background: var(--surface); }
.orders-menu-trigger:focus-visible { border-color: var(--primary-500); box-shadow: 0 0 0 3px rgba(39, 93, 70, .1); }
</style>
