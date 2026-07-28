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

type DrawerSide = 'left' | 'right'

const props = withDefaults(
  defineProps<{
    title: string
    description?: string
    side?: DrawerSide
    closeLabel?: string
    class?: string
  }>(),
  {
    description: undefined,
    side: 'right',
    closeLabel: 'Đóng ngăn bên',
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
        :class="
          cn(
            'fixed inset-y-0 z-50 grid w-[min(90vw,26rem)] grid-rows-[auto_1fr_auto] gap-5 overflow-hidden border-border bg-surface p-6 shadow-lg outline-none',
            props.side === 'left' ? 'motion-drawer-left' : 'motion-drawer-right',
            props.side === 'left' ? 'left-0 border-r' : 'right-0 border-l',
            props.class,
          )
        "
      >
        <header class="grid gap-2 pr-8">
          <DialogTitle class="text-heading-3">{{ props.title }}</DialogTitle>
          <DialogDescription v-if="props.description" class="text-body-sm text-muted-foreground">
            {{ props.description }}
          </DialogDescription>
        </header>
        <div class="min-h-0 overflow-y-auto"><slot /></div>
        <footer v-if="$slots.footer" class="border-t border-border pt-4"><slot name="footer" /></footer>
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
