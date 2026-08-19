<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
}>()
</script>

<template>
  <header class="mb-6 mt-7 sm:mt-8 lg:mb-5 lg:mt-5">
    <h1 class="max-w-[23rem] text-[2rem] font-bold leading-[2.35rem] tracking-[-0.035em] text-foreground sm:text-[2.125rem] sm:leading-[2.5rem]">
      {{ title }}
    </h1>
    <p v-if="subtitle" class="mt-1.5 max-w-[21rem] text-body-md text-text-secondary">
      {{ subtitle }}
    </p>
  </header>
</template>
