<script setup lang="ts">
import { computed } from 'vue'
import { CircleAlert } from '@lucide/vue'
import type { FormFieldErrors } from '@/types/forms'
import { createFormFieldId, focusFirstInvalidField, normalizeFieldPath } from '@/utils/forms'

const props = withDefaults(
  defineProps<{
    errors: FormFieldErrors
    formError?: string
    title?: string
    labels?: Readonly<Record<string, string>>
  }>(),
  {
    formError: undefined,
    title: 'Vui lòng kiểm tra lại thông tin',
    labels: () => ({}),
  },
)

const fieldErrors = computed(() =>
  Object.entries(props.errors)
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([name, message]) => {
      const normalizedName = normalizeFieldPath(name)
      return {
        name: normalizedName,
        label: props.labels[normalizedName] ?? normalizedName,
        message,
        targetId: createFormFieldId(normalizedName),
      }
    }),
)
const visible = computed(() => fieldErrors.value.length > 0 || Boolean(props.formError))
</script>

<template>
  <section
    v-if="visible"
    class="rounded-lg border border-destructive/25 bg-destructive/10 p-4 text-destructive"
    role="alert"
    aria-live="assertive"
    tabindex="-1"
  >
    <div class="flex items-start gap-3">
      <CircleAlert class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div class="min-w-0">
        <h3 class="text-body-md font-semibold">{{ props.title }}</h3>
        <ul class="mt-2 list-disc space-y-1 pl-5 text-body-sm text-foreground">
          <li v-for="error in fieldErrors" :key="error.name">
            <a
              :href="`#${error.targetId}`"
              class="rounded-xs underline decoration-destructive/50 underline-offset-2 hover:text-destructive focus-visible:outline-ring"
              @click.prevent="focusFirstInvalidField([error.name])"
            >
              {{ error.label }}: {{ error.message }}
            </a>
          </li>
          <li v-if="props.formError">{{ props.formError }}</li>
        </ul>
      </div>
    </div>
  </section>
</template>

