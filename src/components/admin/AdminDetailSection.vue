<script setup lang="ts">defineProps<{ title: string; description?: string }>()</script>
<template><section class="rounded-2xl border border-border bg-surface p-4 sm:p-6"><header class="mb-4"><h2 class="text-heading-4">{{ title }}</h2><p v-if="description" class="mt-1 text-body-sm text-muted-foreground">{{ description }}</p></header><slot /></section></template>
