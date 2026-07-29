<script setup lang="ts">
import {
  Building2,
  Clock3,
  Droplets,
  Flower2,
  Gift,
  Heart,
  Palette,
  Scissors,
  Sparkles,
  Sun,
  Tags,
  WandSparkles,
} from '@lucide/vue'
import type { Component } from 'vue'
import type { HomeIconName } from '@/types/home'

const props = defineProps<{
  name: HomeIconName
}>()

const icons: Record<HomeIconName, Component> = {
  sparkles: Sparkles,
  droplets: Droplets,
  palette: Palette,
  scissors: Scissors,
  flower: Flower2,
  sun: Sun,
  gift: Gift,
  tags: Tags,
  building: Building2,
  history: Clock3,
  new: WandSparkles,
  heart: Heart,
}
</script>

<template>
  <component :is="icons[props.name]" aria-hidden="true" />
</template>
