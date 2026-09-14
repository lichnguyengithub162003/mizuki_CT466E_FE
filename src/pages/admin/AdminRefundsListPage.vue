<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useRouter } from "vue-router";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CalendarDays,
  Check,
  ChevronDown,
  Clipboard,
  Info,
  Package,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from "@lucide/vue";
import { useQuery } from "@tanstack/vue-query";
import AdminOrdersFilterMenu from "@/components/admin/AdminOrdersFilterMenu.vue";
import AdminRefundStatusIndicator from "@/components/admin/AdminRefundStatusIndicator.vue";
import BasePopover from "@/components/common/BasePopover.vue";
import BaseSkeleton from "@/components/common/BaseSkeleton.vue";
import BaseTooltip from "@/components/common/BaseTooltip.vue";
import { getAdminList } from "@/api/adminApi";
import { useAdminRefundsInfinite } from "@/queries/admin";
import { useAuthStore } from "@/stores/auth";
import type {
  AdminListParams,
  AdminRecord,
  AdminRefundListRecord,
  AdminRefundReturnStatus,
  AdminRefundSettlementStatus,
} from "@/types/admin";
import { isApplicationError } from "@/types/admin";

const router = useRouter();
const auth = useAuthStore();
const searchField = ref<HTMLInputElement | null>(null);
const searchInput = ref("");
const keyword = ref("");
const status = ref("");
const branchId = ref<number | undefined>();
type RefundSortKey =
  | "created_at"
  | "requested_amount"
  | "status"
  | "return_status"
  | "settlement_method"
  | "updated_at";
const settlementMethod = ref<"" | "wallet" | "vnpay" | "momo" | "zalopay">("");
const returnStatus = ref<"" | AdminRefundReturnStatus>("");
const returnInspectionStatus = ref<
  | ""
  | "pending"
  | "accepted_restockable"
  | "accepted_not_restockable"
  | "rejected"
>("");
const returnFilterOpen = ref(false);
type RefundTimeMode =
  | "newest"
  | "oldest"
  | "last_7_days"
  | "last_30_days"
  | "custom";
const timeMode = ref<RefundTimeMode>("newest");
const timeFilterOpen = ref(false);
const dateFrom = ref("");
const dateTo = ref("");
const sortBy = ref<RefundSortKey>("created_at");
const sortDirection = ref<"asc" | "desc">("desc");
type RefundColumnKey =
  | "order"
  | "customer"
  | "amount"
  | "reason"
  | "return"
  | "settlement"
  | "status"
  | "updated";

const visibleColumns = ref<Set<RefundColumnKey>>(
  new Set([
    "order",
    "customer",
    "amount",
    "reason",
    "return",
    "settlement",
    "status",
    "updated",
  ]),
);
const visibleDesktopColumnCount = computed(
  () => 1 + visibleColumns.value.size,
);
function toggleColumn(column: RefundColumnKey): void {
  const next = new Set(visibleColumns.value);

  if (next.has(column)) {
    next.delete(column);
  } else {
    next.add(column);
  }

  visibleColumns.value = next;
}
const columnOptions: Array<{
  key: RefundColumnKey;
  label: string;
}> = [
  { key: "order", label: "Đơn hàng" },
  { key: "customer", label: "Khách hàng" },
  { key: "amount", label: "Số tiền" },
  { key: "reason", label: "Lý do" },
  { key: "return", label: "Trả hàng / Hoàn kho" },
  { key: "settlement", label: "Hoàn tiền vào" },
  { key: "status", label: "Trạng thái" },
  { key: "updated", label: "Cập nhật" },
];
const columnMenuOpen = ref(false);

const copiedKey = ref("");
const mobileSentinel = ref<HTMLElement | null>(null);
let searchTimer: number | undefined;
let copyTimer: number | undefined;
let mobileObserver: IntersectionObserver | undefined;

watch(searchInput, (value) => {
  window.clearTimeout(searchTimer);
  if (!value) {
    keyword.value = "";
    return;
  }
  searchTimer = window.setTimeout(() => {
    keyword.value = value.trim();
  }, 320);
});
watch(mobileSentinel, (element) => {
  mobileObserver?.disconnect();
  if (!element || typeof IntersectionObserver === "undefined") return;
  mobileObserver = new IntersectionObserver(
    ([entry]) => {
      if (
        entry?.isIntersecting &&
        refundsQuery.hasNextPage.value &&
        !refundsQuery.isFetchingNextPage.value
      ) {
        void refundsQuery.fetchNextPage();
      }
    },
    { rootMargin: "480px 0px" },
  );
  mobileObserver.observe(element);
});
onBeforeUnmount(() => {
  window.clearTimeout(searchTimer);
  window.clearTimeout(copyTimer);
  mobileObserver?.disconnect();
});

const params = computed<AdminListParams>(() => ({
  keyword: keyword.value || undefined,
  status: status.value || undefined,
  branch_id: auth.role === "super_admin" ? branchId.value : undefined,
  settlement_method: settlementMethod.value || undefined,
  return_status: returnStatus.value || undefined,
  return_inspection_status: returnInspectionStatus.value || undefined,
  date_from: dateFrom.value || undefined,
  date_to: dateTo.value || undefined,
  sort_by: sortBy.value,
  sort_direction: sortDirection.value,
  per_page: 40,
}));
const refundsQuery = useAdminRefundsInfinite<AdminRefundListRecord>(params);
const branchQuery = useQuery({
  queryKey: ["admin", "refunds", "branch-options"],
  queryFn: () => getAdminList<AdminRecord>("branches", { per_page: 100 }),
  enabled: computed(() => auth.role === "super_admin"),
  staleTime: 5 * 60 * 1000,
});
const rows = computed(() => {
  const unique = new Map<number, AdminRefundListRecord>();
  for (const page of refundsQuery.data.value?.pages ?? []) {
    for (const refund of page.items) unique.set(refund.id, refund);
  }
  return [...unique.values()];
});
const hasFilters = computed(() =>
  Boolean(
    keyword.value ||
    status.value ||
    branchId.value ||
    settlementMethod.value ||
    returnStatus.value ||
    timeMode.value !== "newest" ||
    dateFrom.value ||
    dateTo.value,
  ),
);
const initialErrorKind = computed(() =>
  isApplicationError(refundsQuery.error.value)
    ? refundsQuery.error.value.kind
    : "unknown",
);
const statusOptions = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "requested", label: "Chờ duyệt" },
  { value: "approved", label: "Đã duyệt" },
  { value: "rejected", label: "Đã từ chối" },
  { value: "refunded", label: "Đã hoàn tiền" },
];
const branchOptions = computed(() => [
  { value: "", label: "Tất cả chi nhánh" },
  ...(branchQuery.data.value?.items ?? []).map((branch) => ({
    value: String(branch.id),
    label: branch.name,
  })),
]);
const settlementOptions = [
  { value: "", label: "Tất cả nguồn hoàn tiền" },
  { value: "wallet", label: "Ví Mizuki" },
  { value: "vnpay", label: "VNPAY" },
  { value: "momo", label: "MoMo" },
  { value: "zalopay", label: "ZaloPay" },
];
const returnStatusOptions: Array<{
  value: "" | AdminRefundReturnStatus | "inspection_rejected";
  label: string;
  description: string;
}> = [
  {
    value: "",
    label: "Tất cả trạng thái trả hàng",
    description: "Hiển thị mọi trạng thái trả hàng và hoàn kho.",
  },
  {
    value: "not_required",
    label: "Không cần trả hàng",
    description: "Refund không yêu cầu khách gửi sản phẩm vật lý về Mizuki.",
  },
  {
    value: "awaiting_return",
    label: "Chờ khách trả hàng",
    description: "Refund đã yêu cầu khách gửi hàng về Mizuki.",
  },
  {
    value: "in_transit",
    label: "Đang trả hàng",
    description: "Hàng đang trên đường quay về Mizuki.",
  },
  {
    value: "received",
    label: "Đã nhận · Chờ kiểm tra",
    description:
      "Mizuki đã nhận hàng hoàn nhưng chưa kiểm tra hoặc xác nhận kết quả.",
  },
  {
    value: "restocked",
    label: "Đã nhập kho",
    description: "Hàng đạt điều kiện và đã được cộng lại tồn kho.",
  },
  {
    value: "not_restockable",
    label: "Không thể nhập kho",
    description:
      "Mizuki đồng ý hoàn tiền nhưng hàng không đủ điều kiện bán lại nên không cộng tồn kho.",
  },
  {
    value: "inspection_rejected",
    label: "Không đạt điều kiện hoàn",
    description:
      "Hàng đã được Mizuki nhận và kiểm tra nhưng không đáp ứng điều kiện hoàn tiền.",
  },
];
const selectedReturnStatusLabel = computed(
  () =>
    returnStatusOptions.find((option) => option.value === returnStatus.value)
      ?.label ?? returnStatusOptions[0]!.label,
);
const timeOptions: Array<{ value: RefundTimeMode; label: string }> = [
  { value: "newest", label: "Mới nhất" },
  { value: "oldest", label: "Cũ nhất" },
  { value: "last_7_days", label: "7 ngày gần đây" },
  { value: "last_30_days", label: "30 ngày gần đây" },
  { value: "custom", label: "Khoảng thời gian tùy chỉnh" },
];
const timeFilterLabel = computed(() => {
  if (timeMode.value === "custom" && (dateFrom.value || dateTo.value))
    return `${dateFrom.value || "…"} – ${dateTo.value || "…"}`;
  return (
    timeOptions.find((option) => option.value === timeMode.value)?.label ??
    "Mới nhất"
  );
});

function setBranch(value: string): void {
  branchId.value = value ? Number(value) : undefined;
}
function setReturnStatus(
  value: "" | AdminRefundReturnStatus | "inspection_rejected",
): void {
  if (value === "inspection_rejected") {
    setRejectedInspectionFilter();
    return;
  }

  returnStatus.value = value;
  returnInspectionStatus.value = "";
  returnFilterOpen.value = false;
}
function setRejectedInspectionFilter(): void {
  returnStatus.value = "";
  returnInspectionStatus.value = "rejected";
  returnFilterOpen.value = false;
}
function localDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function setRollingRange(days: number): void {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  dateFrom.value = localDateValue(start);
  dateTo.value = localDateValue(end);
}
function setTimeMode(value: RefundTimeMode): void {
  timeMode.value = value;
  sortBy.value = "created_at";
  sortDirection.value = value === "oldest" ? "asc" : "desc";
  if (value === "last_7_days") setRollingRange(7);
  else if (value === "last_30_days") setRollingRange(30);
  else if (value !== "custom") {
    dateFrom.value = "";
    dateTo.value = "";
  }
  if (value !== "custom") timeFilterOpen.value = false;
}
function resetTimeFilter(): void {
  setTimeMode("newest");
  timeFilterOpen.value = false;
}
function clearSearch(): void {
  searchInput.value = "";
  keyword.value = "";
  searchField.value?.focus();
}
function toggleSort(key: RefundSortKey): void {
  const nextDirection =
    sortBy.value !== key
      ? "asc"
      : sortDirection.value === "asc"
        ? "desc"
        : "asc";
  sortBy.value = key;
  sortDirection.value = nextDirection;
  if (key === "created_at") {
    timeMode.value = nextDirection === "asc" ? "oldest" : "newest";
    dateFrom.value = "";
    dateTo.value = "";
  }
}
function ariaSort(key: RefundSortKey): "ascending" | "descending" | "none" {
  return sortBy.value === key
    ? sortDirection.value === "asc"
      ? "ascending"
      : "descending"
    : "none";
}
function openRefund(id: number): void {
  void router.push(`/admin/refunds/${id}`);
}
async function copyValue(
  value: string,
  key: string,
  event: Event,
): Promise<void> {
  event.stopPropagation();
  await navigator.clipboard.writeText(value);
  copiedKey.value = key;
  window.clearTimeout(copyTimer);
  copyTimer = window.setTimeout(() => {
    copiedKey.value = "";
  }, 1600);
}
function onTableScroll(event: Event): void {
  const target = event.currentTarget as HTMLElement;
  if (
    target.scrollHeight - target.scrollTop - target.clientHeight < 320 &&
    refundsQuery.hasNextPage.value &&
    !refundsQuery.isFetchingNextPage.value
  ) {
    void refundsQuery.fetchNextPage();
  }
}
const money = (value?: number | null) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
const dateTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString("vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "—";
const approvedDiffers = (refund: AdminRefundListRecord) =>
  refund.approved_amount != null &&
  Number(refund.approved_amount) !== Number(refund.requested_amount);
const reasonLabel = (refund: AdminRefundListRecord): string =>
  refund.reason_type_label?.trim() || "Khác";
const reasonDetail = (refund: AdminRefundListRecord): string => {
  const reason = refund.reason?.trim();
  if (
    !reason ||
    reason.toLocaleLowerCase("vi-VN") ===
      reasonLabel(refund).toLocaleLowerCase("vi-VN")
  )
    return "";
  return reason;
};
const settlementSourceLabel = (refund: AdminRefundListRecord): string => {
  const settlement = refund.settlement;
  if (settlement?.method_label) return settlement.method_label;
  if (settlement?.destination_label) return settlement.destination_label;
  const rawSource = settlement?.method || settlement?.destination;
  return (
    (
      {
        wallet: "Ví Mizuki",
        cash: "Ví Mizuki",
        vietqr: "Ví Mizuki",
        vnpay: "VNPAY",
        momo: "MoMo",
        zalopay: "ZaloPay",
      } as Record<string, string>
    )[rawSource?.toLowerCase() ?? ""] ?? "Chưa xác định"
  );
};
const settlementStatusLabel = (refund: AdminRefundListRecord): string =>
  refund.settlement?.status_label ||
  (
    {
      pending: "Chờ hoàn tiền",
      processing: "Đang hoàn tiền",
      succeeded: "Đã hoàn tiền",
      failed: "Hoàn tiền thất bại",
    } satisfies Record<AdminRefundSettlementStatus, string>
  )[refund.settlement?.status as AdminRefundSettlementStatus] ||
  "Chưa có trạng thái";
const settlementStatusTone = (refund: AdminRefundListRecord): string =>
  (
    ({
      pending: "bg-amber-400",
      processing: "bg-sky-500",
      succeeded: "bg-emerald-500",
      failed: "bg-rose-500",
    }) as Record<AdminRefundSettlementStatus, string>
  )[refund.settlement?.status as AdminRefundSettlementStatus] ?? "bg-slate-400";
const updatedTime = (refund: AdminRefundListRecord) =>
  refund.refunded_at ||
  refund.reviewed_at ||
  refund.updated_at ||
  refund.created_at;
const returnLabel = (refund: AdminRefundListRecord): string => {
  if (refund.return?.inspection_status === "rejected")
    return "Không đạt điều kiện hoàn";
  return (
    {
      not_required: "Không cần trả hàng",
      awaiting_return: "Chờ khách trả hàng",
      in_transit: "Đang trả hàng",
      received: "Đã nhận · Chờ kiểm tra",
      restocked: "Đã nhập kho",
      not_restockable: "Không thể nhập kho",
    } satisfies Record<AdminRefundReturnStatus, string>
  )[refund.return?.status ?? "not_required"];
};
const returnTone = (refund: AdminRefundListRecord): string =>
  refund.return?.inspection_status === "rejected"
    ? "bg-rose-600"
    : ((
        {
          not_required: "bg-slate-400",
          awaiting_return: "bg-amber-500",
          in_transit: "bg-sky-500",
          received: "bg-orange-500",
          restocked: "bg-emerald-600",
          not_restockable: "bg-slate-500",
        } as Record<string, string>
      )[refund.return?.status ?? "not_required"] ?? "bg-slate-400");
const returnTextTone = (refund: AdminRefundListRecord): string => {
  if (refund.return?.inspection_status === "rejected")
    return "font-medium text-rose-700";
  if (refund.return?.status === "received")
    return "font-medium text-orange-700";
  return "text-muted-foreground";
};
</script>

<template>
  <section
    class="refunds-v2 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
    aria-label="Danh sách hoàn tiền"
  >
    <div
      data-testid="refunds-toolbar-shell"
      class="refunds-rounded-shell relative mb-3 shrink-0 p-2 shadow-[0_1px_2px_rgba(16,28,19,.04),0_8px_24px_rgba(16,28,19,.045)] ring-1 ring-black/[0.035]"
    >
      <span
        v-if="
          refundsQuery.isFetching.value &&
          !refundsQuery.isFetchingNextPage.value
        "
        data-testid="refunds-background-progress"
        class="absolute inset-x-3 top-0 h-px overflow-hidden rounded-full bg-primary-100"
        aria-label="Đang cập nhật danh sách"
        ><span
          class="block h-full w-1/3 animate-[refunds-progress_1s_ease-in-out_infinite] bg-primary-600"
      /></span>
      <div class="flex flex-wrap items-center gap-2">
        <label class="relative min-w-48 flex-[1_1_16rem]">
          <span class="sr-only">Tìm kiếm yêu cầu hoàn tiền</span>
          <Search
            class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted"
            aria-hidden="true"
          />
          <input
            ref="searchField"
            v-model="searchInput"
            type="search"
            placeholder="Mã hoàn, mã đơn, tên hoặc email khách hàng"
            class="refunds-search h-10 w-full rounded-xl bg-surface-subtle pl-9 pr-9 text-[0.8125rem] outline-none ring-1 ring-inset ring-transparent transition focus:bg-surface focus:ring-primary-500"
          />
          <button
            v-if="searchInput"
            type="button"
            aria-label="Xóa tìm kiếm"
            class="absolute right-1.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-primary-50 hover:text-primary-800"
            @click="clearSearch"
          >
            <X class="size-3.5" />
          </button>
        </label>
        <div class="min-w-0">
          <AdminOrdersFilterMenu
            v-model="status"
            label="Lọc trạng thái hoàn tiền"
            :options="statusOptions"
          />
        </div>
        <div v-if="auth.role === 'super_admin'" class="min-w-0">
          <AdminOrdersFilterMenu
            :model-value="branchId ? String(branchId) : ''"
            label="Lọc theo chi nhánh"
            :options="branchOptions"
            @update:model-value="setBranch"
          />
        </div>
        <div class="min-w-0">
          <BasePopover
            v-model="returnFilterOpen"
            align="start"
            :side-offset="6"
            class="w-80 p-1.5"
          >
            <template #trigger>
              <button
                type="button"
                class="return-filter-trigger"
                aria-label="Lọc trạng thái trả hàng"
                :aria-expanded="returnFilterOpen"
              >
                <span class="truncate">{{ selectedReturnStatusLabel }}</span
                ><ChevronDown class="size-3.5 shrink-0" aria-hidden="true" />
              </button>
            </template>
            <div role="radiogroup" aria-label="Trạng thái trả hàng">
              <div
                v-for="option in returnStatusOptions"
                :key="option.value || 'all'"
                class="return-filter-option"
                :data-selected="returnStatus === option.value"
              >
                <button
                  type="button"
                  role="radio"
                  :aria-checked="returnStatus === option.value"
                  class="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2 text-left"
                  @click="
                    option.value === 'inspection_rejected'
                      ? setRejectedInspectionFilter()
                      : setReturnStatus(option.value)
                  "
                >
                  <span class="min-w-0 flex-1 truncate">{{ option.label }}</span
                  ><Check
                    v-if="returnStatus === option.value"
                    class="size-3.5 shrink-0 text-primary-700"
                    aria-hidden="true"
                  />
                </button>
                <BaseTooltip
                  :content="option.description"
                  side="right"
                  align="center"
                  class="max-w-72 text-left leading-5"
                >
                  <button
                    type="button"
                    class="return-filter-info"
                    :aria-label="`Giải thích: ${option.label}`"
                    @click.stop
                  >
                    <Info class="size-3.5" aria-hidden="true" />
                  </button>
                </BaseTooltip>
              </div>
            </div>
          </BasePopover>
        </div>
        <div class="min-w-0">
          <AdminOrdersFilterMenu
            v-model="settlementMethod"
            label="Lọc nguồn hoàn tiền"
            :options="settlementOptions"
          />
        </div>

        <div class="min-w-0">
          <BasePopover
            v-model="timeFilterOpen"
            align="end"
            :side-offset="6"
            class="w-72 p-2"
          >
            <template #trigger>
              <button
                type="button"
                aria-label="Lọc và sắp xếp thời gian"
                :aria-expanded="timeFilterOpen"
                class="time-filter-trigger"
              >
                <CalendarDays class="size-4 shrink-0" aria-hidden="true" /><span
                  class="min-w-0 flex-1 truncate text-left"
                  >{{ timeFilterLabel }}</span
                ><ChevronDown
                  class="size-3.5 shrink-0 text-muted-foreground transition-transform duration-150"
                  :class="timeFilterOpen && 'rotate-180'"
                  aria-hidden="true"
                />
              </button>
            </template>
            <div
              role="radiogroup"
              aria-label="Thời gian yêu cầu hoàn tiền"
              class="grid gap-0.5"
            >
              <button
                v-for="option in timeOptions"
                :key="option.value"
                type="button"
                role="radio"
                :aria-checked="timeMode === option.value"
                class="time-filter-option"
                :data-selected="timeMode === option.value"
                @click="setTimeMode(option.value)"
              >
                <span>{{ option.label }}</span
                ><Check
                  v-if="timeMode === option.value"
                  class="size-3.5 text-primary-700"
                  aria-hidden="true"
                />
              </button>
            </div>
            <div
              v-if="timeMode === 'custom'"
              class="mt-2 grid gap-2 border-t border-border/60 pt-2"
            >
              <label class="grid gap-1 text-[0.6875rem] text-muted-foreground"
                >Từ ngày<input
                  v-model="dateFrom"
                  type="date"
                  aria-label="Từ ngày hoàn tiền"
                  class="h-9 rounded-lg bg-surface-subtle px-2.5 text-[0.8125rem] text-foreground outline-none ring-1 ring-inset ring-border focus:ring-primary-500"
              /></label>
              <label class="grid gap-1 text-[0.6875rem] text-muted-foreground"
                >Đến ngày<input
                  v-model="dateTo"
                  :min="dateFrom"
                  type="date"
                  aria-label="Đến ngày hoàn tiền"
                  class="h-9 rounded-lg bg-surface-subtle px-2.5 text-[0.8125rem] text-foreground outline-none ring-1 ring-inset ring-border focus:ring-primary-500"
              /></label>
            </div>
            <button
              v-if="timeMode !== 'newest' || dateFrom || dateTo"
              type="button"
              class="mt-2 w-full rounded-lg px-2.5 py-2 text-left text-[0.75rem] font-medium text-primary-700 transition-colors hover:bg-primary-50"
              @click="resetTimeFilter"
            >
              Đặt lại thời gian
            </button>
          </BasePopover>
        </div>
        <div class="min-w-0">
          <BasePopover
            v-model="columnMenuOpen"
            align="end"
            :side-offset="6"
            class="w-64 p-2"
          >
            <template #trigger>
              <button
                type="button"
                class="column-filter-trigger"
                aria-label="Chọn cột hiển thị"
                :aria-expanded="columnMenuOpen"
              >
                <SlidersHorizontal class="size-4 shrink-0" aria-hidden="true" />
                <span class="min-w-0 flex-1 truncate text-left">Cột hiển thị</span>
                <ChevronDown class="size-3.5 shrink-0" aria-hidden="true" />
              </button>
            </template>

            <div class="grid gap-0.5" aria-label="Các cột hiển thị">
              <label
                v-for="option in columnOptions"
                :key="option.key"
                data-testid="refund-column-option"
                class="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-[0.8125rem] transition-colors hover:bg-surface-subtle"
              >
                <input
                  type="checkbox"
                  :checked="visibleColumns.has(option.key)"
                  class="size-3.5 accent-primary-700"
                  @change="toggleColumn(option.key)"
                />
                <span>{{ option.label }}</span>
              </label>
            </div>
            <div class="mt-1 border-t border-border/70 px-2 pt-2 text-[0.6875rem] text-muted-foreground">
              Cột Yêu cầu hoàn luôn hiển thị
            </div>
          </BasePopover>
        </div>
      </div>
    </div>

    <div
      v-if="refundsQuery.isPending.value && !rows.length"
      data-testid="refunds-initial-loading"
      class="refunds-rounded-shell min-h-0 flex-1 shadow-xs"
    >
      <div class="h-10 bg-surface-subtle" />
      <div class="grid gap-px bg-border/50">
        <div
          v-for="index in 8"
          :key="index"
          class="flex h-18 items-center gap-4 bg-surface px-5"
        >
          <BaseSkeleton class="size-10 rounded-lg" /><BaseSkeleton
            class="h-3 w-28"
          /><BaseSkeleton class="h-3 flex-1" /><BaseSkeleton class="h-3 w-24" />
        </div>
      </div>
    </div>
    <div
      v-else-if="refundsQuery.isError.value && !rows.length"
      role="alert"
      class="refunds-rounded-shell min-h-0 flex-1 px-6 py-12 text-center shadow-xs"
    >
      <p class="font-medium">
        {{
          initialErrorKind === "forbidden"
            ? "Bạn không có quyền xem danh sách này"
            : "Không thể tải danh sách hoàn tiền"
        }}
      </p>
      <button
        type="button"
        class="mt-3 inline-flex items-center gap-2 text-[0.8125rem] font-medium text-primary-700"
        @click="refundsQuery.refetch()"
      >
        <RefreshCw class="size-4" />Thử lại
      </button>
    </div>
    <div
      v-else-if="!rows.length"
      data-testid="refunds-empty"
      class="refunds-rounded-shell min-h-0 flex-1 px-6 py-14 text-center shadow-xs"
    >
      <div
        class="mx-auto grid size-11 place-items-center rounded-xl bg-primary-50 text-primary-700"
      >
        <SlidersHorizontal class="size-5" />
      </div>
      <h2 class="mt-3 text-[0.9375rem] font-medium">
        {{
          hasFilters
            ? "Không tìm thấy yêu cầu hoàn tiền phù hợp"
            : "Chưa có yêu cầu hoàn tiền"
        }}
      </h2>
      <p class="mt-1 text-[0.8125rem] text-muted-foreground">
        {{
          hasFilters
            ? "Thử điều chỉnh từ khóa hoặc bộ lọc."
            : "Yêu cầu mới sẽ xuất hiện tại đây."
        }}
      </p>
    </div>

    <template v-else>
      <div
        data-testid="refunds-table-shell"
        class="refunds-rounded-shell hidden min-h-0 flex-1 shadow-[0_1px_2px_rgba(16,28,19,.04),0_12px_30px_rgba(16,28,19,.04)] ring-1 ring-black/[0.035] md:flex"
      >
        <div
          data-testid="refunds-scroll-region"
          class="min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain"
          @scroll.passive="onTableScroll"
        >
          <table
            class="w-max min-w-full table-fixed border-separate border-spacing-0 text-left text-[0.8125rem]"
          >
            <colgroup>
              <col class="w-[18rem]" />
              <col v-if="visibleColumns.has('order')" class="w-52" />
              <col v-if="visibleColumns.has('customer')" class="w-56" />
              <col v-if="visibleColumns.has('amount')" class="w-44" />
              <col v-if="visibleColumns.has('reason')" class="w-60" />
              <col v-if="visibleColumns.has('return')" class="w-44" />
              <col v-if="visibleColumns.has('settlement')" class="w-52" />
              <col v-if="visibleColumns.has('status')" class="w-40" />
              <col v-if="visibleColumns.has('updated')" class="w-40" />
            </colgroup>
            <thead
              class="sticky top-0 z-20 bg-white/95 text-xs leading-4 text-muted-foreground backdrop-blur-md"
            >
              <tr>
                <th
                  :aria-sort="ariaSort('created_at')"
                  data-column="refund"
                  class="sticky left-0 z-30 border-b border-border/60 bg-white/95 px-5 py-3 font-medium shadow-[6px_0_12px_-13px_rgba(16,28,19,.38)]"
                >
                  <button
                    type="button"
                    class="sort-button"
                    @click="toggleSort('created_at')"
                  >
                    Yêu cầu hoàn
                    <component
                      :is="
                        sortBy === 'created_at'
                          ? sortDirection === 'asc'
                            ? ArrowUp
                            : ArrowDown
                          : ArrowUpDown
                      "
                      class="sort-icon"
                    />
                  </button>
                </th>
                <th
                  v-if="visibleColumns.has('order')"
                  data-column="order"
                  class="border-b border-border/70 px-4 py-3 font-medium"
                >
                  Đơn hàng
                </th>
                <th v-if="visibleColumns.has('customer')" data-column="customer" class="border-b border-border/70 px-4 py-3 font-medium">
                  Khách hàng
                </th>
                <th
                  v-if="visibleColumns.has('amount')"
                  data-column="amount"
                  :aria-sort="ariaSort('requested_amount')"
                  class="border-b border-border/70 px-4 py-3 font-medium"
                >
                  <button
                    type="button"
                    class="sort-button"
                    @click="toggleSort('requested_amount')"
                  >
                    Số tiền
                    <component
                      :is="
                        sortBy === 'requested_amount'
                          ? sortDirection === 'asc'
                            ? ArrowUp
                            : ArrowDown
                          : ArrowUpDown
                      "
                      class="sort-icon"
                    />
                  </button>
                </th>
                <th v-if="visibleColumns.has('reason')" data-column="reason" class="border-b border-border/70 px-4 py-3 font-medium">
                  Lý do
                </th>
                <th
                  v-if="visibleColumns.has('return')"
                  data-column="return"
                  :aria-sort="ariaSort('return_status')"
                  class="border-b border-border/70 px-4 py-3 font-medium"
                >
                  <button
                    type="button"
                    class="sort-button"
                    @click="toggleSort('return_status')"
                  >
                    Trả hàng / Hoàn kho
                    <component
                      :is="
                        sortBy === 'return_status'
                          ? sortDirection === 'asc'
                            ? ArrowUp
                            : ArrowDown
                          : ArrowUpDown
                      "
                      class="sort-icon"
                    />
                  </button>
                </th>
                <th
                  v-if="visibleColumns.has('settlement')"
                  data-column="settlement"
                  :aria-sort="ariaSort('settlement_method')"
                  class="border-b border-border/70 px-4 py-3 font-medium"
                >
                  <button
                    type="button"
                    class="sort-button"
                    @click="toggleSort('settlement_method')"
                  >
                    Hoàn tiền vào
                    <component
                      :is="
                        sortBy === 'settlement_method'
                          ? sortDirection === 'asc'
                            ? ArrowUp
                            : ArrowDown
                          : ArrowUpDown
                      "
                      class="sort-icon"
                    />
                  </button>
                </th>
                <th
                  v-if="visibleColumns.has('status')"
                  data-column="status"
                  :aria-sort="ariaSort('status')"
                  class="border-b border-border/70 px-4 py-3 font-medium"
                >
                  <button
                    type="button"
                    class="sort-button"
                    @click="toggleSort('status')"
                  >
                    Trạng thái
                    <component
                      :is="
                        sortBy === 'status'
                          ? sortDirection === 'asc'
                            ? ArrowUp
                            : ArrowDown
                          : ArrowUpDown
                      "
                      class="sort-icon"
                    />
                  </button>
                </th>
                <th
                  v-if="visibleColumns.has('updated')"
                  data-column="updated"
                  :aria-sort="ariaSort('updated_at')"
                  class="border-b border-border/70 px-4 py-3 font-medium"
                >
                  <button
                    type="button"
                    class="sort-button"
                    @click="toggleSort('updated_at')"
                  >
                    Cập nhật
                    <component
                      :is="
                        sortBy === 'updated_at'
                          ? sortDirection === 'asc'
                            ? ArrowUp
                            : ArrowDown
                          : ArrowUpDown
                      "
                      class="sort-icon"
                    />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="refund in rows"
                :key="refund.id"
                tabindex="0"
                class="group h-18 cursor-pointer outline-none transition-colors duration-150 hover:bg-[#f8fbf9] focus-visible:bg-primary-50/70"
                @click="openRefund(refund.id)"
                @keydown.enter="openRefund(refund.id)"
              >
                <td
                  data-column="refund"
                  class="sticky left-0 z-10 border-b border-border/50 bg-surface px-5 py-2.5 shadow-[6px_0_12px_-13px_rgba(16,28,19,.38)] transition-colors duration-150 group-hover:bg-[#f8fbf9] group-focus-visible:bg-primary-50/70"
                >
                  <div class="flex items-center gap-3.5">
                    <span
                      class="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-primary-50 text-primary-700"
                      ><img
                        v-if="refund.image_url"
                        :src="refund.image_url"
                        alt=""
                        loading="lazy"
                        decoding="async"
                        class="size-full object-cover" /><RotateCcw
                        v-else
                        class="size-4"
                    /></span>
                    <div class="min-w-0">
                      <div class="flex items-center gap-1">
                        <span
                          class="truncate font-medium tracking-[-0.01em] text-primary-950"
                          :title="refund.refund_number"
                          >{{ refund.refund_number }}</span
                        ><button
                          type="button"
                          :aria-label="
                            copiedKey === `refund-${refund.id}`
                              ? 'Đã sao chép mã hoàn tiền'
                              : 'Sao chép mã hoàn tiền'
                          "
                          class="copy-button"
                          @click="
                            copyValue(
                              refund.refund_number,
                              `refund-${refund.id}`,
                              $event,
                            )
                          "
                        >
                          <Check
                            v-if="copiedKey === `refund-${refund.id}`"
                            class="size-3.5 text-success"
                          /><Clipboard v-else class="size-3.5" />
                        </button>
                      </div>
                      <p
                        class="mt-0.5 whitespace-nowrap text-[0.6875rem] text-muted-foreground"
                      >
                        {{ dateTime(refund.created_at) }}
                      </p>
                    </div>
                  </div>
                </td>
                <td
                  v-if="visibleColumns.has('order')"
                  data-column="order"
                  class="border-b border-border/55 px-4 py-2.5"
                >
                  <div class="flex min-w-0 items-center gap-1">
                    <span
                      class="max-w-38 truncate font-medium"
                      :title="refund.order.order_number"
                      >{{ refund.order.order_number }}</span
                    ><button
                      type="button"
                      :aria-label="
                        copiedKey === `order-${refund.id}`
                          ? 'Đã sao chép mã đơn'
                          : 'Sao chép mã đơn'
                      "
                      class="copy-button"
                      @click="
                        copyValue(
                          refund.order.order_number,
                          `order-${refund.id}`,
                          $event,
                        )
                      "
                    >
                      <Check
                        v-if="copiedKey === `order-${refund.id}`"
                        class="size-3.5 text-success"
                      /><Clipboard v-else class="size-3.5" />
                    </button>
                  </div>
                </td>
                <td v-if="visibleColumns.has('customer')" data-column="customer" class="border-b border-border/55 px-4 py-2.5">
                  <p
                    class="max-w-44 truncate"
                    :title="refund.customer.name || ''"
                  >
                    {{ refund.customer.name || "Khách hàng" }}
                  </p>
                  <p
                    class="mt-0.5 max-w-44 truncate text-[0.6875rem] text-muted-foreground"
                    :title="
                      refund.customer.phone || refund.customer.email || ''
                    "
                  >
                    {{
                      refund.customer.phone ||
                      refund.customer.email ||
                      "Không có liên hệ"
                    }}
                  </p>
                </td>
                <td v-if="visibleColumns.has('amount')" data-column="amount" class="border-b border-border/55 px-4 py-2.5 tabular-nums">
                  <p class="font-medium text-primary-950">
                    {{ money(refund.requested_amount) }}
                  </p>
                  <p
                    v-if="approvedDiffers(refund)"
                    class="mt-0.5 whitespace-nowrap text-[0.6875rem] text-muted-foreground"
                  >
                    Đã duyệt {{ money(refund.approved_amount) }}
                  </p>
                </td>
                <td v-if="visibleColumns.has('reason')" data-column="reason" class="border-b border-border/55 px-4 py-2.5">
                  <div data-testid="reason-presentation" data-layout="desktop">
                    <p
                      class="max-w-48 truncate whitespace-nowrap font-medium"
                      :title="reasonLabel(refund)"
                    >
                      {{ reasonLabel(refund) }}
                    </p>
                    <p
                      v-if="reasonDetail(refund)"
                      data-testid="reason-detail"
                      class="mt-0.5 line-clamp-1 max-w-48 text-[0.6875rem] text-muted-foreground"
                      :title="reasonDetail(refund)"
                    >
                      {{ reasonDetail(refund) }}
                    </p>
                  </div>
                </td>
                <td v-if="visibleColumns.has('return')" data-column="return" class="border-b border-border/55 px-4 py-2.5">
                  <span
                    class="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.75rem]"
                    :class="returnTextTone(refund)"
                    ><span
                      :class="[
                        'size-1.5 shrink-0 rounded-full',
                        returnTone(refund),
                      ]"
                      aria-hidden="true"
                    />{{ returnLabel(refund) }}</span
                  >
                </td>
                <td v-if="visibleColumns.has('settlement')" data-column="settlement" class="border-b border-border/55 px-4 py-2.5">
                  <div
                    data-testid="settlement-presentation"
                    data-layout="desktop"
                    class="whitespace-nowrap"
                  >
                    <p class="font-medium text-primary-950">
                      {{ settlementSourceLabel(refund) }}
                    </p>
                    <p
                      class="mt-0.5 inline-flex items-center gap-1.5 text-[0.6875rem] text-muted-foreground"
                    >
                      <span
                        data-testid="settlement-status-dot"
                        :data-status="refund.settlement?.status || 'unknown'"
                        :class="[
                          'size-1.5 shrink-0 rounded-full',
                          settlementStatusTone(refund),
                        ]"
                        aria-hidden="true"
                      />{{ settlementStatusLabel(refund) }}
                    </p>
                  </div>
                </td>
                <td v-if="visibleColumns.has('status')" data-column="status" class="border-b border-border/55 px-4 py-2.5">
                  <AdminRefundStatusIndicator
                    :status="refund.status"
                    :label="refund.status_label"
                  />
                </td>
                <td
                  v-if="visibleColumns.has('updated')"
                  data-column="updated"
                  class="border-b border-border/55 px-4 py-2.5 whitespace-nowrap tabular-nums text-muted-foreground"
                >
                  {{ dateTime(updatedTime(refund)) }}
                </td>
              </tr>
              <tr v-if="refundsQuery.isFetchingNextPage.value">
                <td :colspan="visibleDesktopColumnCount" class="h-14 px-4">
                  <div
                    class="flex items-center justify-center gap-2 text-[0.75rem] text-muted-foreground"
                  >
                    <RefreshCw class="size-3.5 animate-spin" />Đang tải thêm yêu
                    cầu…
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <div
            v-if="refundsQuery.isFetchNextPageError.value"
            class="flex h-14 items-center justify-center gap-3 border-t border-border/60 text-[0.75rem] text-muted-foreground"
          >
            <span>Không thể tải thêm.</span
            ><button
              type="button"
              class="font-medium text-primary-700"
              @click="refundsQuery.fetchNextPage()"
            >
              Thử lại
            </button>
          </div>
          <div
            v-else-if="!refundsQuery.hasNextPage.value"
            class="flex h-12 items-center justify-center text-[0.6875rem] text-text-muted"
          >
            Đã hiển thị tất cả {{ rows.length.toLocaleString("vi-VN") }} yêu cầu
          </div>
        </div>
      </div>

      <div
        data-testid="refunds-mobile-list"
        class="min-h-0 flex-1 overflow-y-auto overscroll-contain md:hidden"
      >
        <div class="grid gap-2">
          <article
            v-for="refund in rows"
            :key="refund.id"
            tabindex="0"
            class="refunds-rounded-shell p-4 shadow-xs ring-1 ring-black/[0.035] transition-colors active:bg-primary-50/60"
            @click="openRefund(refund.id)"
            @keydown.enter="openRefund(refund.id)"
          >
            <div class="flex items-start gap-3">
              <span
                class="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-primary-50 text-primary-700"
                ><img
                  v-if="refund.image_url"
                  :src="refund.image_url"
                  alt=""
                  loading="lazy"
                  decoding="async"
                  class="size-full object-cover" /><Package
                  v-else
                  class="size-4"
              /></span>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1">
                  <h2 class="truncate text-[0.875rem] font-medium">
                    {{ refund.refund_number }}
                  </h2>
                  <button
                    type="button"
                    aria-label="Sao chép mã hoàn tiền"
                    class="copy-button"
                    @click="
                      copyValue(
                        refund.refund_number,
                        `mobile-refund-${refund.id}`,
                        $event,
                      )
                    "
                  >
                    <Check
                      v-if="copiedKey === `mobile-refund-${refund.id}`"
                      class="size-3.5 text-success"
                    /><Clipboard v-else class="size-3.5" />
                  </button>
                </div>
                <div
                  class="mt-0.5 flex min-w-0 items-center gap-1 text-[0.75rem] text-muted-foreground"
                >
                  <span class="truncate">{{ refund.order.order_number }}</span
                  ><button
                    type="button"
                    aria-label="Sao chép mã đơn"
                    class="copy-button"
                    @click="
                      copyValue(
                        refund.order.order_number,
                        `mobile-order-${refund.id}`,
                        $event,
                      )
                    "
                  >
                    <Check
                      v-if="copiedKey === `mobile-order-${refund.id}`"
                      class="size-3.5 text-success"
                    /><Clipboard v-else class="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
            <div
              class="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border/60 pt-3 text-[0.75rem]"
            >
              <div>
                <p class="text-[0.6875rem] text-text-muted">Số tiền</p>
                <p class="mt-0.5 font-medium">
                  {{ money(refund.requested_amount) }}
                </p>
              </div>
              <div>
                <p class="text-[0.6875rem] text-text-muted">Khách hàng</p>
                <p class="mt-0.5 truncate">
                  {{ refund.customer.name || "Khách hàng" }}
                </p>
              </div>
              <div>
                <p class="text-[0.6875rem] text-text-muted">Hoàn tiền vào</p>
                <div
                  data-testid="settlement-presentation"
                  data-layout="mobile"
                  class="mt-0.5 whitespace-nowrap"
                >
                  <p class="font-medium text-primary-950">
                    {{ settlementSourceLabel(refund) }}
                  </p>
                  <p
                    class="mt-0.5 inline-flex items-center gap-1.5 text-[0.6875rem] text-muted-foreground"
                  >
                    <span
                      data-testid="settlement-status-dot"
                      :data-status="refund.settlement?.status || 'unknown'"
                      :class="[
                        'size-1.5 shrink-0 rounded-full',
                        settlementStatusTone(refund),
                      ]"
                      aria-hidden="true"
                    />{{ settlementStatusLabel(refund) }}
                  </p>
                </div>
              </div>
              <div>
                <p class="text-[0.6875rem] text-text-muted">
                  Trả hàng / Hoàn kho
                </p>
                <p
                  class="mt-0.5 inline-flex items-center gap-1.5 whitespace-nowrap"
                  :class="returnTextTone(refund)"
                >
                  <span
                    :class="[
                      'size-1.5 shrink-0 rounded-full',
                      returnTone(refund),
                    ]"
                  />{{ returnLabel(refund) }}
                </p>
              </div>
              <div class="col-span-2">
                <p class="text-[0.6875rem] text-text-muted">Lý do</p>
                <div
                  data-testid="reason-presentation"
                  data-layout="mobile"
                  class="mt-0.5"
                >
                  <p
                    class="truncate whitespace-nowrap font-medium"
                    :title="reasonLabel(refund)"
                  >
                    {{ reasonLabel(refund) }}
                  </p>
                  <p
                    v-if="reasonDetail(refund)"
                    data-testid="reason-detail"
                    class="mt-0.5 line-clamp-1 text-[0.6875rem] text-muted-foreground"
                    :title="reasonDetail(refund)"
                  >
                    {{ reasonDetail(refund) }}
                  </p>
                </div>
              </div>
              <div>
                <p class="text-[0.6875rem] text-text-muted">Trạng thái</p>
                <AdminRefundStatusIndicator
                  class="mt-0.5"
                  :status="refund.status"
                  :label="refund.status_label"
                />
              </div>
              <div>
                <p class="text-[0.6875rem] text-text-muted">Cập nhật</p>
                <p class="mt-0.5 tabular-nums">
                  {{ dateTime(updatedTime(refund)) }}
                </p>
              </div>
            </div>
          </article>
          <div
            v-if="refundsQuery.hasNextPage.value"
            ref="mobileSentinel"
            class="flex min-h-11 items-center justify-center text-[0.75rem] text-muted-foreground"
            aria-live="polite"
          >
            <RefreshCw
              v-if="refundsQuery.isFetchingNextPage.value"
              class="mr-2 size-3.5 animate-spin"
            />{{
              refundsQuery.isFetchingNextPage.value
                ? "Đang tải thêm…"
                : "Cuộn để tải thêm yêu cầu"
            }}
          </div>
          <p v-else class="py-3 text-center text-[0.6875rem] text-text-muted">
            Đã hiển thị tất cả yêu cầu hoàn tiền
          </p>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
.refunds-rounded-shell {
  overflow: hidden;
  border-radius: 1rem;
  background: var(--surface);
  isolation: isolate;
}
.refunds-search::-webkit-search-cancel-button {
  appearance: none;
  display: none;
}
:deep(.orders-menu-trigger) {
  min-width: 8.25rem;
  max-width: 11.5rem;
}
.return-filter-trigger {
  display: inline-flex;
  height: 2.5rem;
  max-width: 12rem;
  min-width: 10rem;
  align-items: center;
  justify-content: space-between;
  gap: 0.625rem;
  border-radius: 0.75rem;
  padding: 0 0.75rem;
  background: var(--surface-subtle);
  color: var(--text);
  font-size: 0.8125rem;
  transition:
    color 150ms,
    background-color 150ms,
    box-shadow 150ms;
}
.return-filter-trigger:hover {
  background: var(--primary-50);
  color: var(--primary-900);
}
.return-filter-trigger:focus-visible {
  outline: 2px solid var(--primary-500);
  outline-offset: 1px;
}
.return-filter-option {
  display: flex;
  align-items: center;
  border-radius: 0.625rem;
  color: var(--text);
  font-size: 0.8125rem;
  transition:
    background-color 150ms,
    color 150ms;
}
.return-filter-option:hover,
.return-filter-option[data-selected="true"] {
  background: var(--primary-50);
  color: var(--primary-900);
}
.return-filter-info {
  display: grid;
  width: 2rem;
  height: 2rem;
  flex: none;
  place-items: center;
  border-radius: 0.5rem;
  color: var(--text-muted);
  transition:
    color 150ms,
    background-color 150ms;
}
.return-filter-info:hover,
.return-filter-info:focus-visible {
  background: var(--surface);
  color: var(--primary-700);
  outline: none;
}
.time-filter-trigger {
  display: flex;
  height: 2.5rem;
  width: max-content;
  min-width: 7.5rem;
  max-width: 11.75rem;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid rgba(16, 28, 19, 0.055);
  border-radius: 0.75rem;
  background: var(--surface-subtle);
  padding: 0 0.625rem 0 0.75rem;
  color: var(--foreground);
  font-size: 0.8125rem;
  box-shadow: 0 1px 2px rgba(16, 28, 19, 0.025);
  outline: none;
  transition:
    background-color 150ms,
    border-color 150ms,
    box-shadow 150ms;
}
.time-filter-trigger:hover {
  border-color: rgba(39, 93, 70, 0.14);
  background: var(--surface);
}
.time-filter-trigger:focus-visible {
  border-color: var(--primary-500);
  box-shadow: 0 0 0 3px rgba(39, 93, 70, 0.1);
}
.column-filter-trigger {
  display: flex;
  height: 2.5rem;
  width: max-content;
  min-width: 8.75rem;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid rgba(16, 28, 19, 0.055);
  border-radius: 0.75rem;
  background: var(--surface-subtle);
  padding: 0 0.625rem 0 0.75rem;
  color: var(--foreground);
  font-size: 0.8125rem;
  box-shadow: 0 1px 2px rgba(16, 28, 19, 0.025);
  outline: none;
  transition: background-color 150ms, border-color 150ms, box-shadow 150ms;
}
.column-filter-trigger:hover {
  border-color: rgba(39, 93, 70, 0.14);
  background: var(--surface);
}
.column-filter-trigger:focus-visible {
  border-color: var(--primary-500);
  box-shadow: 0 0 0 3px rgba(39, 93, 70, 0.1);
}
.time-filter-option {
  display: flex;
  min-height: 2.25rem;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  border-radius: 0.625rem;
  padding: 0.5rem 0.625rem;
  text-align: left;
  color: var(--text);
  font-size: 0.8125rem;
  transition:
    background-color 150ms,
    color 150ms;
}
.time-filter-option:hover,
.time-filter-option[data-selected="true"] {
  background: var(--primary-50);
  color: var(--primary-900);
}
.copy-button {
  display: grid;
  width: 1.75rem;
  height: 1.75rem;
  flex: none;
  place-items: center;
  border-radius: 0.375rem;
  color: var(--text-muted);
  transition:
    color 150ms,
    background-color 150ms;
}
.copy-button:hover {
  color: var(--primary-800);
  background: var(--primary-100);
}
.copy-button:focus-visible {
  outline: 2px solid var(--primary-500);
  outline-offset: 1px;
}
.sort-button {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  white-space: nowrap;
  transition: color 150ms;
}
.sort-button:hover {
  color: var(--primary-800);
}
.sort-icon {
  width: 0.875rem;
  height: 0.875rem;
  flex: none;
}
@keyframes refunds-progress {
  0% {
    transform: translateX(-100%);
  }
  50% {
    transform: translateX(150%);
  }
  100% {
    transform: translateX(400%);
  }
}
@media (prefers-reduced-motion: reduce) {
  .refunds-v2 *,
  .refunds-v2 *::before,
  .refunds-v2 *::after {
    transition-duration: 1ms !important;
    animation-duration: 1ms !important;
  }
}
</style>
