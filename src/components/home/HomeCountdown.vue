<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    initialSeconds?: number
  }>(),
  {
    initialSeconds: 5 * 60 * 60 + 24 * 60 + 16,
  },
)

const secondsRemaining = ref(Math.max(0, props.initialSeconds))

const parts = computed(() => {
  const hours = Math.floor(secondsRemaining.value / 3600)
  const minutes = Math.floor((secondsRemaining.value % 3600) / 60)
  const seconds = secondsRemaining.value % 60
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0'))
})

const formattedTime = computed(() => parts.value.join(':'))

const intervalId = window.setInterval(() => {
  if (secondsRemaining.value > 0) {
    secondsRemaining.value -= 1
  }
}, 1000)

onBeforeUnmount(() => {
  window.clearInterval(intervalId)
})
</script>

<template>
  <div
    class="inline-flex items-center gap-1.5"
    role="timer"
    :aria-label="`Flash Sale còn ${formattedTime}`"
  >
    <template v-for="(part, index) in parts" :key="index">
      <span
        class="grid min-w-9 place-items-center rounded-lg bg-[#d94c40] px-2 py-1.5 text-body-sm font-semibold tabular-nums text-white shadow-xs"
        data-countdown-part
      >
        {{ part }}
      </span>
      <span v-if="index < parts.length - 1" class="font-semibold text-[#b83a32]" aria-hidden="true">:</span>
    </template>
  </div>
</template>
