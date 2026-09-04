<script setup lang="ts">import BaseDrawer from '@/components/common/BaseDrawer.vue'; defineProps<{ title: string; description?: string }>(); const open=defineModel<boolean>({default:false})</script>
<template><BaseDrawer v-model="open" :title="title" :description="description || 'Nội dung quản trị Mizuki.'" side="right"><slot/></BaseDrawer></template>
