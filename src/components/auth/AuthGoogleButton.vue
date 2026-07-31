<script setup lang="ts">
import BaseButton from "@/components/common/BaseButton.vue";

withDefaults(
  defineProps<{
    label: string;
    loading?: boolean;
  }>(),
  {
    loading: false,
  },
);

const emit = defineEmits<{
  click: [];
}>();

const GOOGLE_LOGO_SRC = "/images/auth/google-logo.svg";
</script>

<template>
  <BaseButton
    type="button"
    variant="outline"
    class="h-12 w-full rounded-xl border-border bg-white text-foreground shadow-xs"
    :disabled="loading"
    @click="emit('click')"
  >
    <template #icon>
      <img
        :src="GOOGLE_LOGO_SRC"
        alt=""
        class="size-5"
        data-testid="google-logo"
      />
    </template>

    {{ loading ? "Đang chuyển hướng..." : label }}
  </BaseButton>
</template>