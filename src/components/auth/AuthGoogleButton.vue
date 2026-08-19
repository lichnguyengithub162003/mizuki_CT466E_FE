<script setup lang="ts">
import AuthSecondaryButton from '@/components/auth/AuthSecondaryButton.vue'

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
  click: []
}>()

const GOOGLE_LOGO_SRC = '/images/auth/google-logo.svg'
</script>

<template>
  <AuthSecondaryButton :loading="loading" @click="emit('click')">
    <template #icon>
      <img
        :src="GOOGLE_LOGO_SRC"
        alt=""
        class="size-5"
        data-testid="google-logo"
      />
    </template>

    {{ loading ? 'Đang chuyển hướng...' : label }}
  </AuthSecondaryButton>
</template>
