<script setup lang="ts">
import { computed } from 'vue'
import { Building2, CalendarDays, Image, Package, RotateCcw, Star } from '@lucide/vue'

const props = withDefaults(defineProps<{
  src?: string | null
  alt?: string
  label?: string | null
  kind?: 'product' | 'service' | 'refund' | 'review' | 'branch' | 'avatar' | 'category' | 'brand'
  size?: 'sm' | 'md' | 'lg'
}>(), { alt: '', label: '', kind: 'product', size: 'md' })

const initials = computed(() => (props.label || '?').trim().split(/\s+/).slice(-2).map(part => part[0]).join('').toUpperCase())
const icon = computed(() => ({
  product: Package,
  service: CalendarDays,
  refund: RotateCcw,
  review: Star,
  branch: Building2,
  avatar: null,
  category: Image,
  brand: null,
})[props.kind])
const classes = computed(() => ({ sm: 'size-10 rounded-lg', md: 'size-12 rounded-xl', lg: 'size-16 rounded-2xl' })[props.size])
</script>

<template>
  <span :class="['grid shrink-0 place-items-center overflow-hidden bg-primary-50 text-primary-700', classes]" aria-hidden="true">
    <img v-if="src" :src="src" :alt="alt" class="size-full object-cover">
    <span v-else-if="kind === 'avatar' || kind === 'brand'" class="text-caption font-semibold">{{ initials }}</span>
    <component :is="icon" v-else class="size-5" />
  </span>
</template>
