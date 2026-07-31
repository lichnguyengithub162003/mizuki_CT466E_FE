<script setup lang="ts">
import { computed, ref, toRef } from 'vue'
import { Eye, EyeOff, LockKeyhole } from '@lucide/vue'
import { useField } from 'vee-validate'
import { createFormFieldId } from '@/utils/forms'

const props = defineProps<{
  name: string
  label: string
  placeholder?: string
  autocomplete?: string
  disabled?: boolean
}>()

const visible = ref(false)
const { value, errorMessage, handleBlur, handleChange } = useField<string>(toRef(props, 'name'))
const inputId = computed(() => createFormFieldId(props.name))
const errorId = computed(() => `${inputId.value}-error`)
</script>

<template>
  <div class="grid gap-2">
    <label :for="inputId" class="text-body-sm font-semibold">{{ props.label }}</label>
    <div class="relative">
      <LockKeyhole class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" aria-hidden="true" />
      <input
        :id="inputId"
        :name="props.name"
        :value="value ?? ''"
        :type="visible ? 'text' : 'password'"
        :placeholder="props.placeholder"
        :autocomplete="props.autocomplete"
        :disabled="props.disabled"
        required
        :aria-invalid="Boolean(errorMessage)"
        :aria-describedby="errorMessage ? errorId : undefined"
        class="h-11 w-full rounded-xl border border-input bg-surface pl-10 pr-12 text-body-md shadow-xs outline-none placeholder:text-text-muted focus:border-primary-600 focus:ring-2 focus:ring-ring/20 aria-invalid:border-destructive sm:h-12"
        @input="handleChange"
        @blur="handleBlur"
      />
      <button
        type="button"
        class="absolute right-1 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-lg text-text-secondary hover:bg-primary-50 focus-visible:outline-ring"
        :aria-label="visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
        @click="visible = !visible"
      >
        <EyeOff v-if="visible" class="size-4" aria-hidden="true" />
        <Eye v-else class="size-4" aria-hidden="true" />
      </button>
    </div>
    <p v-if="errorMessage" :id="errorId" class="text-caption text-destructive" role="alert">
      {{ errorMessage }}
    </p>
  </div>
</template>
