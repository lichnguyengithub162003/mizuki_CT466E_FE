<script setup lang="ts">
import { X } from '@lucide/vue'
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from 'reka-ui'
import { cn } from '@/utils/cn'

const props = withDefaults(
  defineProps<{
    title: string
    description?: string
    closeLabel?: string
    class?: string
  }>(),
  {
    description: undefined,
    closeLabel: 'Đóng hộp thoại',
    class: undefined,
  },
)

const open = defineModel<boolean>({ default: false })
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogTrigger v-if="$slots.trigger" as-child><slot name="trigger" /></DialogTrigger>
    <DialogPortal>
      <DialogOverlay class="motion-overlay fixed inset-0 z-50 bg-overlay" />
      <DialogContent
        :class="cn('motion-dialog fixed left-1/2 top-1/2 z-50 grid max-h-[85svh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-5 overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-lg outline-none sm:p-8', props.class)"
      >
        <div class="grid gap-2 pr-8">
          <DialogTitle class="text-heading-3">{{ props.title }}</DialogTitle>
          <DialogDescription v-if="props.description" class="text-body-sm text-muted-foreground">
            {{ props.description }}
          </DialogDescription>
        </div>
        <div><slot /></div>
        <footer v-if="$slots.footer" class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <slot name="footer" />
        </footer>
        <DialogClose
          class="absolute right-4 top-4 rounded-xs p-2 text-muted-foreground hover:bg-surface-subtle hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          :aria-label="props.closeLabel"
        >
          <X class="size-5" aria-hidden="true" />
        </DialogClose>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
