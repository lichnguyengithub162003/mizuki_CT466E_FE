<script setup lang="ts">
import {
  TooltipArrow,
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
} from 'reka-ui'
import { cn } from '@/utils/cn'

type TooltipSide = 'top' | 'right' | 'bottom' | 'left'
type TooltipAlign = 'start' | 'center' | 'end'

const props = withDefaults(
  defineProps<{
    content: string
    side?: TooltipSide
    align?: TooltipAlign
    delayDuration?: number
    class?: string
  }>(),
  {
    side: 'top',
    align: 'center',
    delayDuration: 250,
    class: undefined,
  },
)
</script>

<template>
  <TooltipProvider :delay-duration="props.delayDuration">
    <TooltipRoot>
      <TooltipTrigger as-child><slot /></TooltipTrigger>
      <TooltipPortal>
        <TooltipContent
          :side="props.side"
          :align="props.align"
          :side-offset="8"
          :class="cn('motion-tooltip z-50 max-w-64 rounded-md bg-primary-950 px-3 py-2 text-caption text-primary-foreground shadow-md', props.class)"
        >
          {{ props.content }}
          <TooltipArrow class="fill-primary-950" />
        </TooltipContent>
      </TooltipPortal>
    </TooltipRoot>
  </TooltipProvider>
</template>
