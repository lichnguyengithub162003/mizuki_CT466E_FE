<script setup lang="ts">
import { TicketPercent } from '@lucide/vue'
</script>

<template>
  <button
    type="button"
    class="motion-interactive fixed bottom-[6.25rem] right-3 z-20 inline-flex min-h-11 items-center gap-2 rounded-pill border border-primary-200 bg-surface/95 px-4 py-2.5 text-body-sm font-medium text-primary-900 shadow-md backdrop-blur-md hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:bottom-6 md:right-6"
    aria-label="Nhận voucher Mizuki"
  >
    <span class="grid size-7 place-items-center rounded-full bg-[#c5d4ca] text-primary-950">
      <TicketPercent class="size-4" aria-hidden="true" />
    </span>
    Nhận voucher
  </button>
</template>
