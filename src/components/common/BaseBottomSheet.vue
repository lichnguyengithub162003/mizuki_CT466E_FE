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
    closeLabel: 'Đóng bảng dưới',
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
        :class="cn('motion-sheet fixed inset-x-0 bottom-0 z-50 grid max-h-[88svh] gap-5 overflow-y-auto rounded-t-2xl border border-b-0 border-border bg-surface p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-lg outline-none sm:left-1/2 sm:max-w-2xl sm:-translate-x-1/2', props.class)"
      >
        <div class="mx-auto h-1 w-12 rounded-pill bg-border" aria-hidden="true" />
        <header class="grid gap-2 pr-8">
          <DialogTitle class="text-heading-3">{{ props.title }}</DialogTitle>
          <DialogDescription v-if="props.description" class="text-body-sm text-muted-foreground">
            {{ props.description }}
          </DialogDescription>
        </header>
        <div><slot /></div>
        <footer v-if="$slots.footer" class="border-t border-border pt-4"><slot name="footer" /></footer>
        <DialogClose
          class="absolute right-4 top-5 rounded-xs p-2 text-muted-foreground hover:bg-surface-subtle hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          :aria-label="props.closeLabel"
        >
          <X class="size-5" aria-hidden="true" />
        </DialogClose>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
