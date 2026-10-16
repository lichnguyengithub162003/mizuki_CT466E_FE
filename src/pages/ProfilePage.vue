<script setup lang="ts">
import { computed } from 'vue'
import ProfileWorkspace from '@/components/profile/ProfileWorkspace.vue'
import AdminLayout from '@/layouts/AdminLayout.vue'
import CustomerLayout from '@/layouts/CustomerLayout.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const isCustomer = computed(() => auth.role === 'customer')
</script>

<template>
  <AdminLayout v-if="auth.isAdmin">
    <ProfileWorkspace />
  </AdminLayout>
  <CustomerLayout v-else-if="isCustomer" :hide-floating-utilities="true">
    <ProfileWorkspace />
  </CustomerLayout>
  <div v-else class="min-h-svh overflow-x-clip bg-[#f5f6f2]">
    <ProfileWorkspace />
  </div>
</template>
