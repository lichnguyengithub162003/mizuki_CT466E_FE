<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import { useQuery } from "@tanstack/vue-query";
import BaseButton from "@/components/common/BaseButton.vue";
import BaseSkeleton from "@/components/common/BaseSkeleton.vue";
import AdminDomainTable from "@/components/admin/AdminDomainTable.vue";
import AdminEmptyState from "@/components/admin/AdminEmptyState.vue";
import AdminErrorState from "@/components/admin/AdminErrorState.vue";
import AdminFilterBar from "@/components/admin/AdminFilterBar.vue";
import AdminPagination from "@/components/admin/AdminPagination.vue";
import AdminSearchInput from "@/components/admin/AdminSearchInput.vue";
import { getAdminList } from "@/api/adminApi";
import { useAdminList } from "@/queries/admin";
import type { AdminListParams, AdminModule, AdminRecord } from "@/types/admin";
import { isApplicationError } from "@/types/admin";
import { useAuthStore } from "@/stores/auth";

const props = defineProps<{
  module: AdminModule;
  title: string;
  description?: string;
  detailBase?: string;
  createPath?: string;
  statusType?: "order" | "payment" | "refund" | "appointment" | "shipment";
  statusOptions?: { value: string; label: string }[];
  shippingOnly?: boolean;
}>();
const auth = useAuthStore();
const search = ref("");
const moduleRef = computed(() => props.module);
const filters = reactive<AdminListParams>({
  keyword: "",
  status: "",
  shipment_status: "",
  sort: "newest",
  shipping_only: props.shippingOnly ? 1 : undefined,
  page: 1,
  per_page: 15,
});
const statusFilter = computed({
  get: () => (props.shippingOnly ? filters.shipment_status : filters.status),
  set: (value: string) => {
    if (props.shippingOnly) filters.shipment_status = value;
    else filters.status = value;
  },
});
let timer: number | undefined;
watch(search, (value) => {
  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    filters.keyword = value;
    filters.page = 1;
  }, 300);
});
watch(moduleRef, () => {
  search.value = "";
  Object.assign(filters, {
    keyword: "",
    status: "",
    sort: "newest",
    page: 1,
    per_page: 15,
  });
  filters.shipping_only = props.shippingOnly ? 1 : undefined;
  filters.shipment_status = "";
  delete filters.branch_id;
  delete filters.category_id;
  delete filters.brand_id;
  delete filters.technician_id;
  delete filters.appointment_date;
  delete filters.is_active;
});

const query = useAdminList<AdminRecord>(moduleRef, filters);
const rows = computed(() => {
  return query.data.value?.items ?? [];
});
const pagination = computed(
  () =>
    query.data.value?.pagination ?? {
      current_page: 1,
      last_page: 1,
      total: 0,
      per_page: 15,
    },
);
const errorKind = computed(() =>
  isApplicationError(query.error.value) ? query.error.value.kind : "unknown",
);
const needsBranches = computed(
  () =>
    auth.role === "super_admin" &&
    [
      "orders",
      "refunds",
      "shipping",
      "appointments",
      "inventory",
      "staff",
    ].includes(props.module),
);
const branchLookup = useQuery({
  queryKey: ["admin", "lookups", "branches"],
  queryFn: () => getAdminList<AdminRecord>("branches", { per_page: 100 }),
  enabled: needsBranches,
});
const categoryLookup = useQuery({
  queryKey: ["admin", "lookups", "categories"],
  queryFn: () => getAdminList<AdminRecord>("categories", { per_page: 100 }),
  enabled: computed(() => props.module === "products"),
});
const brandLookup = useQuery({
  queryKey: ["admin", "lookups", "brands"],
  queryFn: () => getAdminList<AdminRecord>("brands", { per_page: 100 }),
  enabled: computed(() => props.module === "products"),
});
const technicianLookup = useQuery({
  queryKey: ["admin", "lookups", "technicians"],
  queryFn: () => getAdminList<AdminRecord>("staff", { per_page: 100 }),
  enabled: computed(() => props.module === "appointments"),
});
const branches = computed(() => branchLookup.data.value?.items ?? []);
const categories = computed(() => categoryLookup.data.value?.items ?? []);
const brands = computed(() => brandLookup.data.value?.items ?? []);
const technicians = computed(() =>
  (technicianLookup.data.value?.items ?? []).filter(
    (item) => item.role === "technician",
  ),
);
const filterClass =
  "h-11 min-w-40 rounded-xl bg-surface-subtle pl-3 pr-10 text-body-sm outline-none ring-1 ring-inset ring-border focus:bg-surface focus:ring-2 focus:ring-primary-500";

function resetPage(): void {
  filters.page = 1;
}
function setVisibility(value: string): void {
  statusFilter.value = value;
  resetPage();
}
</script>

<template>
  <div class="mb-3 flex min-h-11 flex-wrap items-center justify-between gap-3">
    <h1 class="text-heading-4">{{ title }}</h1>
    <RouterLink v-if="createPath" :to="createPath"
      ><BaseButton>{{
        module === "appointments"
          ? "Tạo lịch walk-in"
          : module === "orders"
            ? "Tạo đơn tại quầy"
            : `Tạo ${title.toLowerCase()}`
      }}</BaseButton></RouterLink
    >
  </div>

  <div
    v-if="module === 'reviews'"
    class="mb-4 flex flex-wrap gap-2"
    role="tablist"
    aria-label="Trạng thái đánh giá"
  >
    <button
      v-for="tab in [{ value: '', label: 'Tất cả' }, ...(statusOptions ?? [])]"
      :key="tab.value"
      role="tab"
      :aria-selected="statusFilter === tab.value"
      :class="[
        'rounded-xl px-4 py-2 text-body-sm font-medium',
        statusFilter === tab.value
          ? 'bg-primary text-white'
          : 'bg-surface text-muted-foreground shadow-xs',
      ]"
      @click="setVisibility(tab.value)"
    >
      {{ tab.label }}
    </button>
  </div>

  <AdminFilterBar>
    <AdminSearchInput
      v-if="module !== 'promotions'"
      v-model="search"
      placeholder="Tìm theo tên, mã hoặc liên hệ…"
    />
    <select
      v-if="statusOptions && module !== 'reviews'"
      v-model="statusFilter"
      aria-label="Lọc trạng thái"
      :class="filterClass"
      @change="resetPage"
    >
      <option value="">Tất cả trạng thái</option>
      <option
        v-for="option in statusOptions"
        :key="option.value"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>
    <select
      v-if="needsBranches"
      v-model="filters.branch_id"
      aria-label="Lọc theo chi nhánh"
      :class="filterClass"
      @change="resetPage"
    >
      <option :value="undefined">Tất cả chi nhánh</option>
      <option v-for="branch in branches" :key="branch.id" :value="branch.id">
        {{ branch.name }}
      </option>
    </select>
    <select
      v-if="module === 'orders' || module === 'refunds'"
      v-model="filters.sort"
      aria-label="Sắp xếp theo thời gian"
      :class="filterClass"
      @change="resetPage"
    >
      <option value="newest">Mới nhất</option>
      <option value="oldest">Cũ nhất</option>
    </select>
    <template v-if="module === 'appointments'">
      <select
        v-model="filters.technician_id"
        aria-label="Lọc theo kỹ thuật viên"
        :class="filterClass"
        @change="resetPage"
      >
        <option :value="undefined">Tất cả kỹ thuật viên</option>
        <option
          v-for="technician in technicians"
          :key="technician.id"
          :value="technician.id"
        >
          {{ technician.name }}
        </option>
      </select>
      <input
        v-model="filters.appointment_date"
        aria-label="Lọc ngày hẹn"
        type="date"
        :class="filterClass"
        @change="resetPage"
      />
    </template>
    <template v-if="module === 'products'">
      <select
        v-model="filters.category_id"
        aria-label="Lọc theo danh mục"
        :class="filterClass"
        @change="resetPage"
      >
        <option :value="undefined">Tất cả danh mục</option>
        <option
          v-for="category in categories"
          :key="category.id"
          :value="category.id"
        >
          {{ category.name }}
        </option>
      </select>
      <select
        v-model="filters.brand_id"
        aria-label="Lọc theo thương hiệu"
        :class="filterClass"
        @change="resetPage"
      >
        <option :value="undefined">Tất cả thương hiệu</option>
        <option v-for="brand in brands" :key="brand.id" :value="brand.id">
          {{ brand.name }}
        </option>
      </select>
    </template>
    <select
      v-if="['products', 'categories', 'brands', 'branches'].includes(module)"
      v-model="filters.is_active"
      aria-label="Lọc trạng thái hoạt động"
      :class="filterClass"
      @change="resetPage"
    >
      <option :value="undefined">Tất cả trạng thái</option>
      <option :value="1">Đang hoạt động</option>
      <option :value="0">Tạm ẩn</option>
    </select>
  </AdminFilterBar>

  <div
    v-if="query.isPending.value"
    class="rounded-2xl bg-surface p-4 shadow-xs"
  >
    <div class="grid gap-3">
      <BaseSkeleton class="h-10 rounded-xl" /><BaseSkeleton
        v-for="index in 6"
        :key="index"
        class="h-16 rounded-xl"
      />
    </div>
  </div>
  <AdminErrorState
    v-else-if="query.isError.value"
    :not-found="errorKind === 'not-found'"
    :forbidden="errorKind === 'forbidden'"
    @retry="query.refetch()"
  />
  <AdminEmptyState
    v-else-if="!rows.length"
    :title="
      shippingOnly
        ? 'Chưa có vận đơn trên trang này'
        : `Chưa có ${title.toLowerCase()}`
    "
    description="Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm."
  />
  <template v-else>
    <AdminDomainTable
      :module="module"
      :rows="rows"
      :detail-base="detailBase"
      :shipping-only="shippingOnly"
    />
    <AdminPagination
      :current-page="pagination.current_page"
      :total-pages="pagination.last_page"
      :total="pagination.total"
      :disabled="query.isFetching.value"
      @update:current-page="filters.page = $event"
    />
  </template>
</template>
