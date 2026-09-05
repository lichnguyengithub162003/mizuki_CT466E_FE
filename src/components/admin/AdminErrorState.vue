<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
defineProps<{ error?: unknown; notFound?: boolean; forbidden?: boolean }>()
defineEmits<{ retry: [] }>()
</script>
<template><div role="alert" class="rounded-2xl border border-red-200 bg-red-50 p-8 text-center"><h2 class="text-heading-4">{{ notFound ? 'Không tìm thấy dữ liệu' : forbidden ? 'Bạn không có quyền truy cập' : 'Không thể tải dữ liệu' }}</h2><p class="mt-2 text-body-sm text-muted-foreground">{{ notFound ? 'Dữ liệu không tồn tại hoặc không thuộc phạm vi bạn được phép xem.' : forbidden ? 'Vui lòng liên hệ quản trị viên nếu bạn cho rằng đây là nhầm lẫn.' : 'Đã có lỗi xảy ra. Vui lòng thử lại.' }}</p><BaseButton v-if="!notFound && !forbidden" class="mt-4" variant="outline" @click="$emit('retry')">Thử lại</BaseButton></div></template>
