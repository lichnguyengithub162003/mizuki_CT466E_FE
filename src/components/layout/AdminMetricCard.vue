<script setup lang="ts">
import { ArrowDownRight, ArrowUpRight } from '@lucide/vue'
import { computed } from 'vue'
import { cn } from '@/utils/cn'

type MetricAccent = 'sage' | 'periwinkle' | 'apricot'
type MetricTrend = 'up' | 'down'

const props = withDefaults(
  defineProps<{
    label: string
    value: string
    note: string
    delta: string
    trend?: MetricTrend
    accent?: MetricAccent
    path: string
    class?: string
  }>(),
  {
    trend: 'up',
    accent: 'sage',
    class: undefined,
  },
)

const accentClasses: Record<MetricAccent, string> = {
  sage: 'bg-admin-sage-soft text-primary-900',
  periwinkle: 'bg-admin-periwinkle/45 text-primary-950',
  apricot: 'bg-admin-apricot/45 text-primary-950',
}

const strokeClasses: Record<MetricAccent, string> = {
  sage: 'stroke-primary-600',
  periwinkle: 'stroke-[#777da7]',
  apricot: 'stroke-[#b86f52]',
}

const trendLabel = computed(() => `${props.trend === 'up' ? 'Tăng' : 'Giảm'} ${props.delta}`)
</script>

<template>
  <article
    :class="cn(
      'admin-premium-card relative min-w-0 overflow-hidden rounded-2xl border border-border/80 bg-surface p-5 shadow-xs sm:p-6',
      props.class,
    )"
  >
    <div
      :class="cn('absolute -right-8 -top-10 size-28 rounded-full opacity-65 blur-2xl', accentClasses[props.accent])"
      aria-hidden="true"
    />
    <div class="relative">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-body-sm font-medium text-muted-foreground">{{ props.label }}</p>
          <p class="mt-3 text-[2.25rem] font-semibold leading-none tracking-[-0.045em] text-primary-950">
            {{ props.value }}
          </p>
        </div>
        <span
          :class="cn(
            'inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-caption font-semibold',
            accentClasses[props.accent],
          )"
          :aria-label="trendLabel"
        >
          <ArrowUpRight v-if="props.trend === 'up'" class="size-3.5" aria-hidden="true" />
          <ArrowDownRight v-else class="size-3.5" aria-hidden="true" />
          {{ props.delta }}
        </span>
      </div>
      <svg
        class="mt-5 h-12 w-full overflow-visible"
        viewBox="0 0 220 48"
        fill="none"
        role="img"
        :aria-label="`Xu hướng minh họa cho ${props.label}`"
        preserveAspectRatio="none"
      >
        <path
          :d="props.path"
          :class="cn('fill-none stroke-[2.5]', strokeClasses[props.accent])"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path d="M0 46H220" class="stroke-border/70" stroke-width="1" stroke-dasharray="3 5" />
      </svg>
      <p class="mt-3 text-caption uppercase tracking-[0.11em] text-muted-foreground">{{ props.note }}</p>
    </div>
  </article>
</template>
