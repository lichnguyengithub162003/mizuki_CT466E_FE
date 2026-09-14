<script setup lang="ts">
import { computed } from 'vue'
import { statusStyle, genericStatusConfig, orderStatusConfig, paymentStatusConfig, refundStatusConfig, appointmentStatusConfig, shipmentStatusConfig } from '@/constants/adminStatus'
const props = defineProps<{ status?: string | null; type?: 'order' | 'payment' | 'refund' | 'appointment' | 'shipment'; label?: string }>()
const configs = { order: orderStatusConfig, payment: paymentStatusConfig, refund: refundStatusConfig, appointment: appointmentStatusConfig, shipment: shipmentStatusConfig }
const style = computed(() => statusStyle(props.status, props.type ? configs[props.type] : genericStatusConfig))
</script>
<template><span :class="['inline-flex rounded-full border px-2.5 py-1 text-caption font-semibold', style.className]">{{ label || style.label }}</span></template>
