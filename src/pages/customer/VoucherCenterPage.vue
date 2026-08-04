<script setup lang="ts">
import { TicketPercent } from '@lucide/vue'
import CustomerLayout from '@/layouts/CustomerLayout.vue'
</script>
<template><CustomerLayout><section class="mx-auto grid min-h-[48svh] w-full max-w-3xl place-items-center px-4 py-12 text-center sm:px-6"><div class="max-w-lg rounded-3xl border border-primary-100 bg-white p-8 shadow-xs"><span class="mx-auto grid size-14 place-items-center rounded-2xl bg-primary-50 text-primary-800"><TicketPercent class="size-7" /></span><h1 class="mt-5 text-heading-2 text-primary-950">Voucher Mizuki</h1><p class="mt-3 text-body-md leading-relaxed text-text-secondary">Voucher sẽ hiển thị ở đây khi hệ thống cung cấp dữ liệu ưu đãi. Hiện chưa có API voucher khả dụng cho ứng dụng khách.</p></div></section></CustomerLayout></template>
