<script setup lang="ts">
import { computed, toRef } from 'vue'
import { useField } from 'vee-validate'
import { createFormFieldId } from '@/utils/forms'

const props = defineProps<{ name: string; disabled?: boolean }>()
const { value, errorMessage, handleBlur, setValue } = useField<string>(toRef(props, 'name'))
const inputId = computed(() => createFormFieldId(props.name))
const errorId = computed(() => `${inputId.value}-error`)

function updateCode(event: Event): void {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) return
  const digits = target.value.replace(/\D/g, '').slice(0, 6)
  target.value = digits
  setValue(digits)
}
</script>

<template>
  <div class="grid gap-2">
    <label :for="inputId" class="text-body-sm font-semibold">Mã xác thực</label>
    <input
      :id="inputId"
      :name="props.name"
      :value="value ?? ''"
      type="text"
      inputmode="numeric"
      autocomplete="one-time-code"
      pattern="[0-9]*"
      maxlength="6"
      required
      :disabled="props.disabled"
      :aria-invalid="Boolean(errorMessage)"
      :aria-describedby="errorMessage ? errorId : undefined"
      class="h-14 w-full rounded-xl border border-input bg-surface px-4 text-center text-xl font-semibold tracking-[0.45em] shadow-xs outline-none placeholder:text-text-muted focus:border-primary-600 focus:ring-2 focus:ring-ring/20 aria-invalid:border-destructive"
      aria-label="Mã xác thực gồm 6 chữ số"
      placeholder="000000"
      @input="updateCode"
      @blur="handleBlur"
    />
    <p v-if="errorMessage" :id="errorId" class="text-caption text-destructive" role="alert">
      {{ errorMessage }}
    </p>
  </div>
</template>
