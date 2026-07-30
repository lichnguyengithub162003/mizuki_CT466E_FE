<script setup lang="ts">
import { TicketPercent } from '@lucide/vue'
</script>

<template>
  <button
    type="button"
    class="motion-interactive fixed bottom-[6.25rem] right-3 z-20 inline-flex size-12 items-center justify-center rounded-full border border-primary-200 bg-surface/95 text-body-sm font-medium text-primary-900 shadow-md backdrop-blur-md hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:bottom-6 md:right-6 md:h-auto md:w-auto md:gap-2 md:rounded-pill md:px-4 md:py-2.5"
    aria-label="Nhận voucher Mizuki"
  >
    <span class="grid size-7 place-items-center rounded-full bg-[#c5d4ca] text-primary-950">
      <TicketPercent class="size-4" aria-hidden="true" />
    </span>
    <span class="hidden md:inline">Nhận voucher</span>
  </button>
</template>
