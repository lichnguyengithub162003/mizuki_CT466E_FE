<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { UserRound } from '@lucide/vue'

const props = withDefaults(
  defineProps<{
    name?: string
    avatar?: string | null
    size?: 'sm' | 'md'
  }>(),
  {
    name: '',
    avatar: null,
    size: 'sm',
  },
)

const imageFailed = ref(false)

const validAvatarUrl = computed(() => {
  const value = props.avatar?.trim()
  if (!value || imageFailed.value) return undefined

  try {
    const url = new URL(value, 'http://localhost')
    return url.protocol === 'http:' || url.protocol === 'https:' ? value : undefined
  } catch {
    return undefined
  }
})

const initials = computed(() => {
  const words = props.name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ''
  if (words.length === 1) return words[0]?.slice(0, 2).toLocaleUpperCase('vi-VN') ?? ''
  return `${words[0]?.[0] ?? ''}${words.at(-1)?.[0] ?? ''}`.toLocaleUpperCase('vi-VN')
})

watch(() => props.avatar, () => {
  imageFailed.value = false
})
</script>

<template>
  <span
    :class="[
      'grid shrink-0 place-items-center overflow-hidden rounded-full bg-primary-100 font-semibold text-primary-900',
      props.size === 'md' ? 'size-11 text-body-sm' : 'size-8 text-caption',
    ]"
    aria-hidden="true"
    data-testid="account-avatar"
  >
    <img
      v-if="validAvatarUrl"
      :src="validAvatarUrl"
      alt=""
      class="size-full object-cover"
      data-testid="account-avatar-image"
      @error="imageFailed = true"
    />
    <span v-else-if="initials" data-testid="account-initials">{{ initials }}</span>
    <UserRound v-else class="size-5" />
  </span>
</template>
