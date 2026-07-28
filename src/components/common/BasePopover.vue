<script setup lang="ts">
import {
  PopoverArrow,
  PopoverContent,
  PopoverPortal,
  PopoverRoot,
  PopoverTrigger,
} from 'reka-ui'
import { cn } from '@/utils/cn'

type PopoverSide = 'top' | 'right' | 'bottom' | 'left'
type PopoverAlign = 'start' | 'center' | 'end'

const props = withDefaults(
  defineProps<{
    side?: PopoverSide
    align?: PopoverAlign
    sideOffset?: number
    class?: string
  }>(),
  {
    side: 'bottom',
    align: 'center',
    sideOffset: 8,
    class: undefined,
  },
)

const open = defineModel<boolean>({ default: false })
</script>

<template>
  <PopoverRoot v-model:open="open">
    <PopoverTrigger as-child><slot name="trigger" /></PopoverTrigger>
    <PopoverPortal>
      <PopoverContent
        :side="props.side"
        :align="props.align"
        :side-offset="props.sideOffset"
        :class="cn('motion-popover z-50 w-72 rounded-lg border border-border bg-surface p-4 text-foreground shadow-md outline-none', props.class)"
      >
        <slot />
        <PopoverArrow class="fill-surface stroke-border" />
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
