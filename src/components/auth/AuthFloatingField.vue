<script setup lang="ts">
import { computed, ref, toRef } from "vue";
import { Eye, EyeOff } from "@lucide/vue";
import { useField } from "vee-validate";
import { createFormFieldId } from "@/utils/forms";

type AuthInputType = "text" | "email" | "tel" | "password";
type AuthInputMode = "text" | "tel" | "email";

const props = withDefaults(
  defineProps<{
    name: string;
    label: string;
    type?: AuthInputType;
    autocomplete?: string;
    inputmode?: AuthInputMode;
    disabled?: boolean;
    required?: boolean;
  }>(),
  {
    type: "text",
    autocomplete: undefined,
    inputmode: undefined,
    disabled: false,
    required: false,
  },
);

const passwordVisible = ref(false);

const { value, errorMessage, handleBlur, handleChange } = useField<string>(
  toRef(props, "name"),
);

const inputId = computed(() => createFormFieldId(props.name));
const errorId = computed(() => `${inputId.value}-error`);

const resolvedType = computed<AuthInputType>(() => {
  if (props.type !== "password") return props.type;
  return passwordVisible.value ? "text" : "password";
});
</script>

<template>
  <div
    class="auth-floating-field grid gap-1"
    :data-invalid="errorMessage ? true : undefined"
  >
    <div class="relative">
      <input
        :id="inputId"
        :name="props.name"
        :value="value ?? ''"
        :type="resolvedType"
        :autocomplete="props.autocomplete"
        :inputmode="props.inputmode"
        :disabled="props.disabled"
        :required="props.required"
        :aria-invalid="Boolean(errorMessage)"
        :aria-describedby="errorMessage ? errorId : undefined"
        class="auth-floating-input h-13.5 w-full rounded-xl border border-input bg-surface px-4 py-3.5 text-[0.9375rem] leading-5 text-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out placeholder:text-transparent focus:border-primary-600 disabled:cursor-not-allowed disabled:bg-primary-50/50 disabled:opacity-70"
        :class="props.type === 'password' && 'pr-13'"
        placeholder=" "
        @input="handleChange"
        @blur="handleBlur"
      />
      <label
        :for="inputId"
        class="auth-floating-label pointer-events-none absolute left-3.5 top-1/2 z-10 origin-left -translate-y-1/2 text-[0.9375rem] font-normal leading-5 text-text-secondary transition-[top,transform,color,font-size] duration-150 ease-out lg:text-[0.875rem]"
      >
        {{ props.label }}
        <span v-if="props.required" class="text-destructive" aria-hidden="true"
          >*</span
        >
      </label>
      <button
        v-if="props.type === 'password'"
        type="button"
        class="absolute right-1.5 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-lg text-text-secondary transition-colors hover:bg-primary-50 hover:text-primary-900 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50"
        :disabled="props.disabled"
        :aria-label="passwordVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
        @click="passwordVisible = !passwordVisible"
      >
        <EyeOff v-if="passwordVisible" class="size-4.5" aria-hidden="true" />
        <Eye v-else class="size-4.5" aria-hidden="true" />
      </button>
    </div>
    <p
      v-if="errorMessage"
      :id="errorId"
      class="px-1 text-xs font-medium leading-4 text-destructive"
      role="alert"
    >
      <span class="sr-only">Lỗi: </span>{{ errorMessage }}
    </p>
  </div>
</template>

<style scoped>
.auth-floating-input:is(
    :focus,
    :not(:placeholder-shown),
    :autofill,
    :-webkit-autofill
  )
  + .auth-floating-label {
  top: 0;
  left: 1rem;
  transform: translateY(-50%);
  margin-left: -0.375rem;
  padding-block: 0.0125rem;
  padding-inline: 0.375rem;
  background-color: var(--surface, #ffffff);
  color: var(--text-secondary);
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 0;
  letter-spacing: 0.01em;
}

.auth-floating-input:focus + .auth-floating-label {
  color: var(--primary-700, #1f5c46);
}

.auth-floating-input:is(:autofill, :-webkit-autofill) {
  -webkit-text-fill-color: var(--foreground);
  -webkit-box-shadow: 0 0 0 1000px var(--surface) inset;
  box-shadow: 0 0 0 1000px var(--surface) inset;
  transition: background-color 9999s ease-in-out 0s;
}
</style>
