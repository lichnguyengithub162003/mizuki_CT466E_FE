<script setup lang="ts">
import { onBeforeUnmount, provide, ref } from 'vue'
import { CircleAlert, CircleCheck, CircleX, Info, X } from '@lucide/vue'
import { cn } from '@/utils/cn'
import {
  toastKey,
  type ToastController,
  type ToastInput,
  type ToastItem,
  type ToastVariant,
} from './toast'

const props = withDefaults(
  defineProps<{
    regionLabel?: string
  }>(),
  {
    regionLabel: 'Thông báo',
  },
)

defineSlots<{
  default(props: ToastController): unknown
}>()

const items = ref<ToastItem[]>([])
const timers = new Map<string, ReturnType<typeof setTimeout>>()
let nextId = 0

const variantClasses: Record<ToastVariant, string> = {
  default: 'border-border bg-surface text-foreground',
  success: 'border-success/25 bg-surface text-success',
  warning: 'border-warning/30 bg-surface text-warning',
  error: 'border-destructive/25 bg-surface text-destructive',
  info: 'border-info/25 bg-surface text-info',
}

const variantIcons = {
  default: Info,
  success: CircleCheck,
  warning: CircleAlert,
  error: CircleX,
  info: Info,
} as const

function dismiss(id: string): void {
  const timer = timers.get(id)
  if (timer) clearTimeout(timer)
  timers.delete(id)
  items.value = items.value.filter((item) => item.id !== id)
}

function toast(input: ToastInput): string {
  nextId += 1
  const id = `toast-${nextId}`
  const item: ToastItem = {
    id,
    title: input.title,
    description: input.description,
    variant: input.variant ?? 'default',
    duration: input.duration ?? 4500,
  }
  items.value.push(item)
  if (item.duration > 0) {
    timers.set(id, setTimeout(() => dismiss(id), item.duration))
  }
  return id
}

const controller: ToastController = { toast, dismiss }
provide(toastKey, controller)

onBeforeUnmount(() => {
  timers.forEach((timer) => clearTimeout(timer))
  timers.clear()
})
</script>

<template>
  <slot :toast="toast" :dismiss="dismiss" />
  <div
    class="pointer-events-none fixed inset-x-4 top-27 z-80 flex flex-col items-end gap-3 sm:left-auto sm:w-96"
    role="region"
    :aria-label="props.regionLabel"
    aria-live="polite"
  >
    <TransitionGroup name="motion-toast">
      <div
        v-for="item in items"
        :key="item.id"
        :class="cn('pointer-events-auto flex w-full items-start gap-3 rounded-lg border p-4 shadow-lg', variantClasses[item.variant])"
        :role="item.variant === 'error' ? 'alert' : 'status'"
      >
        <component :is="variantIcons[item.variant]" class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <div class="min-w-0 flex-1">
          <p class="text-body-md font-semibold">{{ item.title }}</p>
          <p v-if="item.description" class="mt-1 text-body-sm text-foreground">{{ item.description }}</p>
        </div>
        <button
          type="button"
          class="rounded-xs p-1 text-muted-foreground hover:bg-surface-subtle hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          aria-label="Đóng thông báo"
          @click="dismiss(item.id)"
        >
          <X class="size-4" aria-hidden="true" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
