<script setup lang="ts">
import { RouterLink } from 'vue-router'
defineProps<{ title: string; description?: string; breadcrumbs?: { label: string; to?: string }[]; compact?: boolean }>()
</script>
<template>
  <header :class="[compact ? 'mb-4' : 'mb-6', 'grid gap-3 sm:flex sm:items-end sm:justify-between']">
    <div class="min-w-0">
      <nav v-if="breadcrumbs?.length" aria-label="Breadcrumb" class="mb-2 flex flex-wrap gap-2 text-caption text-muted-foreground">
        <template v-for="(item, index) in breadcrumbs" :key="item.label">
          <span v-if="index" aria-hidden="true">/</span>
          <RouterLink v-if="item.to" :to="item.to" class="hover:text-foreground">{{ item.label }}</RouterLink>
          <span v-else aria-current="page">{{ item.label }}</span>
        </template>
      </nav>
      <h1 :class="compact ? 'text-heading-4' : 'text-heading-1'">{{ title }}</h1>
      <p v-if="description" class="mt-2 max-w-3xl text-body-md text-muted-foreground">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="flex flex-wrap gap-2"><slot name="actions" /></div>
  </header>
</template>
