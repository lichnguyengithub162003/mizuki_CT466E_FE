<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import type { Component } from "vue";
import {
  Banknote,
  CalendarCheck2,
  CalendarDays,
  CalendarRange,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  Maximize2,
  Package,
  PackageOpen,
  RefreshCw,
  RotateCcw,
  ShoppingBag,
  UserRound,
  X,
} from "@lucide/vue";
import { useQuery } from "@tanstack/vue-query";
import { getAdminList, getDashboard } from "@/api/adminApi";
import { useAuthStore } from "@/stores/auth";
import type { AdminRecord } from "@/types/admin";

interface DashboardSummary {
  revenue: number;
  orders: number;
  pending_orders: number;
  appointments: number;
  pending_refunds: number;
  customers: number;
}

interface RevenuePoint {
  date: string;
  revenue: number;
  orders: number;
}

interface DashboardPayload {
  summary: DashboardSummary;
  revenue_series: RevenuePoint[];
  payment_methods: Array<{ method: string; count: number; amount: number }>;
  top_products: Array<{
    product_id: number | null;
    product_name: string;
    quantity: number;
    revenue: number;
    image_url: string | null;
  }>;
}

interface AppointmentRecord extends AdminRecord {
  appointment_number: string;
  status: string;
  status_label: string;
  customer: { id: number | null; name: string | null; phone?: string | null };
  branch: { id: number; name: string; code?: string };
  service: { id: number; name: string; duration_minutes: number };
  technician: { id: number; name: string } | null;
  starts_at: string;
  ends_at: string;
}

interface BranchRecord extends AdminRecord {
  name: string;
  code?: string;
  is_active?: boolean;
}

interface StatCard {
  label: string;
  value: string;
  detail: string;
  icon: Component;
  tone: string;
  iconTone: string;
  series: number[];
}

type StatisticsPeriod = "all" | "last7" | "lastMonth" | "day" | "range";

const HOUR_HEIGHT = 64;
const START_HOUR = 9;
const END_HOUR = 23;
const auth = useAuthStore();
const weekAnchor = ref(startOfWeek(new Date()));
const selectedBranchId = ref<number | undefined>();
const selectedClinicBranchId = ref<number | undefined>();
const branchMenuOpen = ref<"dashboard" | "clinic" | null>(null);
const statisticsPeriod = ref<StatisticsPeriod>("all");
const statisticsMenuOpen = ref(false);
const statisticsDate = ref("");
const statisticsRangeFrom = ref("");
const statisticsRangeTo = ref("");
const calendarFocused = ref(false);
const calendarClosing = ref(false);
let calendarCloseTimer: number | undefined;

function startOfWeek(value: Date): Date {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  const weekday = date.getDay() || 7;
  date.setDate(date.getDate() - weekday + 1);
  return date;
}

function addDays(value: Date, count: number): Date {
  const date = new Date(value);
  date.setDate(date.getDate() + count);
  return date;
}

function dateKey(value: Date): string {
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 10);
}

const weekDays = computed(() =>
  Array.from({ length: 7 }, (_, index) => addDays(weekAnchor.value, index)),
);
const weekFrom = computed(() => dateKey(weekDays.value[0]!));
const queryBranchId = computed(() =>
  auth.role === "super_admin" ? selectedBranchId.value : undefined,
);
const clinicQueryBranchId = computed(() =>
  auth.role === "super_admin" ? selectedClinicBranchId.value : undefined,
);
const appointmentScopeKey = computed(
  () => `${clinicQueryBranchId.value ?? "all"}:${weekFrom.value}`,
);
const appointmentWeekCache = new Map<string, AppointmentRecord[]>();
const appointmentWeekRequests = new Map<string, Promise<AppointmentRecord[]>>();
let latestAppointmentRequest = 0;

const statisticsOptions: Array<{ value: StatisticsPeriod; label: string }> = [
  { value: "all", label: "Toàn bộ thời gian" },
  { value: "last7", label: "7 ngày gần đây" },
  { value: "lastMonth", label: "1 tháng gần đây" },
  { value: "day", label: "Chọn ngày" },
  { value: "range", label: "Chọn khoảng thời gian" },
];

const selectedStatisticsLabel = computed(
  () =>
    statisticsOptions.find((option) => option.value === statisticsPeriod.value)
      ?.label ?? statisticsOptions[0]!.label,
);
const statisticsParams = computed(() => {
  const params: { branch_id?: number; date_from?: string; date_to?: string } = {
    branch_id: queryBranchId.value,
  };
  const today = new Date();
  if (statisticsPeriod.value === "last7") {
    params.date_from = dateKey(addDays(today, -6));
    params.date_to = dateKey(today);
  } else if (statisticsPeriod.value === "lastMonth") {
    const from = new Date(today);
    from.setMonth(from.getMonth() - 1);
    params.date_from = dateKey(from);
    params.date_to = dateKey(today);
  } else if (statisticsPeriod.value === "day" && statisticsDate.value) {
    params.date_from = statisticsDate.value;
    params.date_to = statisticsDate.value;
  } else if (
    statisticsPeriod.value === "range" &&
    statisticsRangeFrom.value &&
    statisticsRangeTo.value
  ) {
    params.date_from = statisticsRangeFrom.value;
    params.date_to = statisticsRangeTo.value;
  }
  return params;
});

const dashboardQuery = useQuery({
  queryKey: computed(() => ["admin", "dashboard", statisticsParams.value]),
  queryFn: () => getDashboard<DashboardPayload>(statisticsParams.value),
  retry: 1,
});

const branchQuery = useQuery({
  queryKey: ["admin", "dashboard", "branches"],
  queryFn: () => getAdminList<BranchRecord>("branches", { per_page: 100 }),
  staleTime: 5 * 60 * 1000,
  retry: 1,
});

async function fetchAppointmentWeek(): Promise<AppointmentRecord[]> {
  const scopeKey = appointmentScopeKey.value;
  const cached = appointmentWeekCache.get(scopeKey);
  if (cached) return cached;
  const pending = appointmentWeekRequests.get(scopeKey);
  if (pending) return pending;

  const requestSequence = ++latestAppointmentRequest;
  const branchId = clinicQueryBranchId.value;
  const days = weekDays.value.map((day) => new Date(day));
  const request = Promise.all(
    days.map((day) =>
      getAdminList<AppointmentRecord>("appointments", {
        appointment_date: dateKey(day),
        branch_id: branchId,
        per_page: 100,
      }),
    ),
  )
    .then((pages) => {
      const unique = new Map<number, AppointmentRecord>();
      for (const page of pages)
        for (const appointment of page.items)
          unique.set(appointment.id, appointment);
      const result = [...unique.values()].sort(
        (left, right) =>
          Date.parse(left.starts_at) - Date.parse(right.starts_at),
      );
      appointmentWeekCache.set(scopeKey, result);
      return result;
    })
    .finally(() => {
      if (appointmentWeekRequests.get(scopeKey) === request)
        appointmentWeekRequests.delete(scopeKey);
    });
  appointmentWeekRequests.set(scopeKey, request);

  const result = await request;
  if (
    requestSequence !== latestAppointmentRequest &&
    scopeKey !== appointmentScopeKey.value
  )
    return result;
  return result;
}

const appointmentsQuery = useQuery({
  queryKey: computed(() => [
    "admin",
    "dashboard",
    "appointments",
    appointmentScopeKey.value,
  ]),
  queryFn: fetchAppointmentWeek,
  staleTime: Infinity,
  placeholderData: (previousData) => previousData,
  retry: 1,
});

const lowStockQuery = useQuery({
  queryKey: computed(() => [
    "admin",
    "dashboard",
    "low-stock",
    queryBranchId.value,
  ]),
  queryFn: () =>
    getAdminList<AdminRecord>("inventory", {
      low_stock: true,
      branch_id: queryBranchId.value,
      page: 1,
      per_page: 1,
    }),
  retry: 1,
});

const branches = computed(() => branchQuery.data.value?.items ?? []);
const assignedBranch = computed(
  () =>
    branches.value.find((branch) => branch.id === auth.user?.branch_id) ?? null,
);
const dashboardBranchContext = computed(() => {
  if (auth.role === "super_admin") {
    return (
      branches.value.find((branch) => branch.id === selectedBranchId.value)
        ?.name ?? "Tất cả chi nhánh"
    );
  }
  return assignedBranch.value?.name ?? "Chi nhánh được phân quyền";
});
const clinicBranchContext = computed(() => {
  if (auth.role === "super_admin") {
    return (
      branches.value.find(
        (branch) => branch.id === selectedClinicBranchId.value,
      )?.name ?? "Tất cả chi nhánh"
    );
  }
  return assignedBranch.value?.name ?? "Chi nhánh được phân quyền";
});

const appointments = computed(() => appointmentsQuery.data.value ?? []);
const calendarLoading = computed(
  () =>
    appointmentsQuery.isFetching.value &&
    !appointmentWeekCache.has(appointmentScopeKey.value),
);
const summary = computed(() => dashboardQuery.data.value?.summary);
const revenueSeries = computed(
  () => dashboardQuery.data.value?.revenue_series ?? [],
);
const topProducts = computed(
  () => dashboardQuery.data.value?.top_products.slice(0, 5) ?? [],
);
const topProductMaximum = computed(() =>
  Math.max(1, ...topProducts.value.map((product) => product.quantity)),
);
const numberFormat = new Intl.NumberFormat("vi-VN");
const moneyFormat = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

function formatStatisticsDate(value: string): string {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

const revenueDetail = computed(() => {
  if (statisticsPeriod.value === "last7")
    return "Thanh toán thành công trong 7 ngày gần đây";
  if (statisticsPeriod.value === "lastMonth")
    return "Thanh toán thành công trong 1 tháng gần đây";
  if (statisticsPeriod.value === "day") {
    return statisticsDate.value
      ? `Thanh toán thành công ngày ${formatStatisticsDate(statisticsDate.value)}`
      : "Thanh toán thành công trong ngày đã chọn";
  }
  if (statisticsPeriod.value === "range") {
    return statisticsRangeFrom.value && statisticsRangeTo.value
      ? `Thanh toán thành công từ ${formatStatisticsDate(statisticsRangeFrom.value)} đến ${formatStatisticsDate(statisticsRangeTo.value)}`
      : "Thanh toán thành công trong khoảng đã chọn";
  }
  return "Doanh thu từ các thanh toán thành công";
});

const statCards = computed<StatCard[]>(() => [
  {
    label: "Doanh thu",
    value: summary.value ? moneyFormat.format(summary.value.revenue) : "—",
    detail: revenueDetail.value,
    icon: Banknote,
    tone: "bg-[#edf5ef]",
    iconTone: "bg-white/75 text-primary-800",
    series: revenueSeries.value.map((point) => point.revenue),
  },
  {
    label: "Đơn hàng",
    value: summary.value ? numberFormat.format(summary.value.orders) : "—",
    detail: summary.value
      ? `${numberFormat.format(summary.value.pending_orders)} đang chờ xử lý`
      : "Trong tuần đang xem",
    icon: ShoppingBag,
    tone: "bg-[#f7f2e8]",
    iconTone: "bg-white/75 text-[#806536]",
    series: revenueSeries.value.map((point) => point.orders),
  },
  {
    label: "Phiếu nhập chờ duyệt",
    value: "—",
    detail: lowStockQuery.data.value
      ? `${numberFormat.format(lowStockQuery.data.value.pagination.total)} sản phẩm sắp hết hàng`
      : "Chưa có dữ liệu phiếu nhập",
    icon: PackageOpen,
    tone: "bg-[#eef3f2]",
    iconTone: "bg-white/75 text-[#406c64]",
    series: [],
  },
  {
    label: "Hoàn tiền",
    value: summary.value
      ? numberFormat.format(summary.value.pending_refunds)
      : "—",
    detail: "Yêu cầu đang chờ xem xét",
    icon: RotateCcw,
    tone: "bg-[#f8eeee]",
    iconTone: "bg-white/75 text-[#8a5d5d]",
    series: [],
  },
]);

const hours = Array.from(
  { length: END_HOUR - START_HOUR },
  (_, index) => START_HOUR + index,
);
const calendarHeight = `${hours.length * HOUR_HEIGHT}px`;

function eventsForDay(day: Date): AppointmentRecord[] {
  const key = dateKey(day);
  return appointments.value.filter(
    (appointment) => dateKey(new Date(appointment.starts_at)) === key,
  );
}

function appointmentStyle(
  appointment: AppointmentRecord,
): Record<string, string> {
  const start = new Date(appointment.starts_at);
  const end = new Date(appointment.ends_at);
  const startMinutes =
    start.getHours() * 60 + start.getMinutes() - START_HOUR * 60;
  const duration = Math.max(30, (end.getTime() - start.getTime()) / 60_000);
  const top = Math.max(
    0,
    Math.min(
      hours.length * HOUR_HEIGHT - 36,
      (startMinutes * HOUR_HEIGHT) / 60,
    ),
  );
  const height = Math.max(
    44,
    Math.min((duration * HOUR_HEIGHT) / 60, hours.length * HOUR_HEIGHT - top),
  );
  return { top: `${top}px`, height: `${height}px` };
}

function statusTone(status: string): string {
  return (
    (
      {
        pending: "border-amber-300 bg-amber-50/95 text-amber-950",
        confirmed: "border-emerald-300 bg-emerald-50/95 text-emerald-950",
        in_progress: "border-teal-300 bg-teal-50/95 text-teal-950",
        completed: "border-slate-300 bg-slate-50/95 text-slate-800",
        cancelled: "border-rose-200 bg-rose-50/95 text-rose-900",
      } as Record<string, string>
    )[status] ?? "border-primary-200 bg-primary-50/95 text-primary-950"
  );
}

function statusDot(status: string): string {
  return (
    (
      {
        pending: "bg-amber-400",
        confirmed: "bg-emerald-500",
        in_progress: "bg-teal-500",
        completed: "bg-slate-400",
        cancelled: "bg-rose-400",
      } as Record<string, string>
    )[status] ?? "bg-primary-500"
  );
}

const upcomingAppointments = computed(() => {
  const now = Date.now();
  return appointments.value
    .filter((appointment) => Date.parse(appointment.starts_at) >= now)
    .slice(0, 5);
});

const statusBreakdown = computed(() => {
  const statuses = new Map<string, { label: string; count: number }>();
  for (const appointment of appointments.value) {
    const current = statuses.get(appointment.status);
    statuses.set(appointment.status, {
      label: appointment.status_label,
      count: (current?.count ?? 0) + 1,
    });
  }
  return [...statuses.entries()].map(([status, value]) => ({
    status,
    ...value,
  }));
});

const largestStatusCount = computed(() =>
  Math.max(1, ...statusBreakdown.value.map((item) => item.count)),
);

function sparklineCoordinates(
  values: number[],
): Array<{ x: number; y: number }> {
  if (!values.length) return [];
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = maximum - minimum;
  return values.map((value, index) => ({
    x: values.length === 1 ? 48 : 4 + (index * 88) / (values.length - 1),
    y: range === 0 ? 18 : 30 - ((value - minimum) / range) * 24,
  }));
}

function sparklinePoints(values: number[]): string {
  return sparklineCoordinates(values)
    .map((point) => `${point.x},${point.y}`)
    .join(" ");
}

function sparklineLastPoint(values: number[]): { x: number; y: number } {
  return sparklineCoordinates(values).at(-1) ?? { x: 48, y: 18 };
}

function shiftWeek(amount: number): void {
  weekAnchor.value = addDays(weekAnchor.value, amount * 7);
}

function returnToCurrentWeek(): void {
  weekAnchor.value = startOfWeek(new Date());
}

function toggleBranchMenu(scope: "dashboard" | "clinic"): void {
  branchMenuOpen.value = branchMenuOpen.value === scope ? null : scope;
  statisticsMenuOpen.value = false;
}

function selectBranchOption(
  scope: "dashboard" | "clinic",
  branchId?: number,
): void {
  if (scope === "dashboard") selectedBranchId.value = branchId;
  else selectedClinicBranchId.value = branchId;
  branchMenuOpen.value = null;
}

function selectStatisticsPeriod(period: StatisticsPeriod): void {
  statisticsPeriod.value = period;
  statisticsMenuOpen.value = false;
}

function openCalendarFocus(): void {
  window.clearTimeout(calendarCloseTimer);
  calendarClosing.value = false;
  calendarFocused.value = true;
  void nextTick(() =>
    document
      .querySelector<HTMLElement>(
        '[data-testid="clinic-calendar"][data-focus-mode="true"]',
      )
      ?.focus(),
  );
}

function closeCalendarFocus(): void {
  if (!calendarFocused.value || calendarClosing.value) return;
  calendarClosing.value = true;
  calendarCloseTimer = window.setTimeout(() => {
    calendarFocused.value = false;
    calendarClosing.value = false;
  }, 260);
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key !== "Escape") return;
  statisticsMenuOpen.value = false;
  branchMenuOpen.value = null;
  closeCalendarFocus();
}

function handleDocumentClick(): void {
  branchMenuOpen.value = null;
  statisticsMenuOpen.value = false;
}

watch(calendarFocused, (focused) => {
  document.body.style.overflow = focused ? "hidden" : "";
});

onMounted(() => {
  document.addEventListener("keydown", handleKeydown);
  document.addEventListener("click", handleDocumentClick);
});
onBeforeUnmount(() => {
  document.removeEventListener("keydown", handleKeydown);
  document.removeEventListener("click", handleDocumentClick);
  document.body.style.overflow = "";
  window.clearTimeout(calendarCloseTimer);
});

function isToday(day: Date): boolean {
  return dateKey(day) === dateKey(new Date());
}

function calendarWeekdayLabel(day: Date): string {
  return ["CN", "THỨ 2", "THỨ 3", "THỨ 4", "THỨ 5", "THỨ 6", "THỨ 7"][
    day.getDay()
  ]!;
}

function calendarDateLabel(day: Date): string {
  return `${String(day.getDate()).padStart(2, "0")}/${String(day.getMonth() + 1).padStart(2, "0")}`;
}

function weekLabel(): string {
  const from = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  }).format(weekDays.value[0]);
  const to = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(weekDays.value[6]);
  return `${from} – ${to}`;
}

function longDate(): string {
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

function timeLabel(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function retryDashboard(): void {
  void dashboardQuery.refetch();
  void appointmentsQuery.refetch();
}
</script>

<template>
  <section
    class="dashboard-v2 w-full max-w-full min-w-0 px-1 pb-8 pt-2 sm:px-2 sm:pt-3 lg:px-3"
    aria-labelledby="dashboard-title"
    data-testid="admin-dashboard"
  >
    <header class="dashboard-header rounded-[1.5rem] px-5 py-5 sm:px-7 sm:py-6">
      <div class="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <div
            class="flex items-center gap-2 text-[0.75rem] font-medium text-[#728078]"
          >
            <CalendarDays
              class="size-3.5 text-primary-700"
              aria-hidden="true"
            />
            <span class="capitalize">{{ longDate() }}</span>
          </div>
          <h1
            id="dashboard-title"
            class="mt-3 text-[1.875rem] font-semibold leading-tight tracking-[-0.04em] text-[#17231d]"
          >
            Tổng quan
          </h1>
          <p class="mt-2 max-w-2xl text-[0.875rem] leading-6 text-[#68746d]">
            Chào mừng trở lại. Theo dõi hoạt động kinh doanh và lịch hẹn clinic
            trong tuần.
          </p>
        </div>

        <div
          class="flex flex-wrap items-center gap-2.5"
          aria-label="Bộ lọc tổng quan"
        >
          <div
            v-if="auth.role === 'super_admin'"
            class="branch-picker branch-picker-dashboard"
            data-testid="dashboard-branch-picker"
            @click.stop
          >
            <button
              type="button"
              class="branch-picker-trigger"
              data-testid="dashboard-branch-trigger"
              aria-haspopup="listbox"
              :aria-expanded="branchMenuOpen === 'dashboard'"
              @click="toggleBranchMenu('dashboard')"
            >
              <span class="branch-picker-icon"
                ><MapPin class="size-4" aria-hidden="true"
              /></span>
              <span class="min-w-0 flex-1 truncate text-left">{{
                dashboardBranchContext
              }}</span>
              <ChevronDown
                :class="[
                  'size-3.5 shrink-0 text-[#8a958e] transition-transform duration-200',
                  branchMenuOpen === 'dashboard' && 'rotate-180',
                ]"
                aria-hidden="true"
              />
            </button>
            <Transition name="dashboard-menu">
              <div
                v-if="branchMenuOpen === 'dashboard'"
                class="branch-picker-menu"
                role="listbox"
                aria-label="Chọn chi nhánh thống kê"
                data-testid="dashboard-branch-menu"
              >
                <button
                  type="button"
                  role="option"
                  :aria-selected="selectedBranchId === undefined"
                  :class="[
                    'branch-picker-option',
                    selectedBranchId === undefined && 'is-selected',
                  ]"
                  data-testid="dashboard-branch-option"
                  @click="selectBranchOption('dashboard')"
                >
                  <span class="truncate">Tất cả chi nhánh</span
                  ><Check
                    v-if="selectedBranchId === undefined"
                    class="size-3.5 shrink-0"
                    aria-hidden="true"
                  />
                </button>
                <button
                  v-for="branch in branches"
                  :key="branch.id"
                  type="button"
                  role="option"
                  :aria-selected="selectedBranchId === branch.id"
                  :class="[
                    'branch-picker-option',
                    selectedBranchId === branch.id && 'is-selected',
                  ]"
                  data-testid="dashboard-branch-option"
                  @click="selectBranchOption('dashboard', branch.id)"
                >
                  <span class="truncate">{{ branch.name }}</span
                  ><Check
                    v-if="selectedBranchId === branch.id"
                    class="size-3.5 shrink-0"
                    aria-hidden="true"
                  />
                </button>
              </div>
            </Transition>
          </div>
          <div
            v-else
            class="dashboard-context-control"
            data-testid="dashboard-branch-context"
          >
            <MapPin class="size-4 text-primary-700" aria-hidden="true" />
            <span class="text-[0.8125rem] font-medium text-[#33443a]">{{
              dashboardBranchContext
            }}</span>
          </div>
          <div
            class="relative"
            data-testid="statistics-period-control"
            @click.stop
          >
            <button
              type="button"
              class="dashboard-context-control dashboard-filter-trigger"
              aria-label="Khoảng thời gian thống kê"
              :aria-expanded="statisticsMenuOpen"
              @click="statisticsMenuOpen = !statisticsMenuOpen"
            >
              <CalendarRange
                class="size-4 text-primary-700"
                aria-hidden="true"
              />
              <span class="text-[0.8125rem] font-medium text-[#33443a]">{{
                selectedStatisticsLabel
              }}</span>
              <ChevronDown
                :class="[
                  'size-3.5 text-[#89958e] transition-transform duration-200',
                  statisticsMenuOpen && 'rotate-180',
                ]"
                aria-hidden="true"
              />
            </button>
            <Transition name="dashboard-menu">
              <div
                v-if="statisticsMenuOpen"
                class="dashboard-filter-menu"
                role="menu"
                data-testid="statistics-period-menu"
              >
                <button
                  v-for="option in statisticsOptions"
                  :key="option.value"
                  type="button"
                  role="menuitemradio"
                  :aria-checked="statisticsPeriod === option.value"
                  :class="[
                    'dashboard-filter-option',
                    statisticsPeriod === option.value && 'is-selected',
                  ]"
                  @click="selectStatisticsPeriod(option.value)"
                >
                  <span>{{ option.label }}</span>
                  <span
                    v-if="statisticsPeriod === option.value"
                    class="size-1.5 rounded-full bg-primary-700"
                    aria-hidden="true"
                  ></span>
                </button>
              </div>
            </Transition>
          </div>
        </div>
      </div>
      <div
        v-if="statisticsPeriod === 'day' || statisticsPeriod === 'range'"
        class="mt-4 flex flex-wrap justify-end gap-2.5 border-t border-primary-900/6 pt-4"
        data-testid="statistics-custom-dates"
      >
        <label v-if="statisticsPeriod === 'day'" class="dashboard-date-field">
          <span>Ngày thống kê</span>
          <input
            v-model="statisticsDate"
            type="date"
            aria-label="Ngày thống kê"
          />
        </label>
        <template v-else>
          <label class="dashboard-date-field">
            <span>Từ ngày</span>
            <input
              v-model="statisticsRangeFrom"
              type="date"
              aria-label="Thống kê từ ngày"
            />
          </label>
          <label class="dashboard-date-field">
            <span>Đến ngày</span>
            <input
              v-model="statisticsRangeTo"
              type="date"
              aria-label="Thống kê đến ngày"
              :min="statisticsRangeFrom"
            />
          </label>
        </template>
      </div>
    </header>

    <div
      v-if="dashboardQuery.isError.value"
      class="mt-4 flex items-center justify-between gap-4 rounded-2xl bg-rose-50/80 px-4 py-3 text-[0.8125rem] text-rose-800 ring-1 ring-inset ring-rose-100"
      role="alert"
    >
      <span>Không thể tải số liệu tổng quan.</span>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        @click="retryDashboard"
      >
        <RefreshCw class="size-3.5" aria-hidden="true" /> Thử lại
      </button>
    </div>

    <section
      class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      aria-label="Chỉ số vận hành"
      data-testid="dashboard-stats"
    >
      <article
        v-for="card in statCards"
        :key="card.label"
        :class="['dashboard-card min-h-42 p-5', card.tone]"
        data-testid="dashboard-stat-card"
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-[0.75rem] font-medium text-[#68766e]">
              {{ card.label }}
            </p>
            <div
              v-if="dashboardQuery.isPending.value"
              class="mt-3 h-8 w-24 animate-pulse rounded-lg bg-white/70"
              aria-label="Đang tải số liệu"
            ></div>
            <p
              v-else
              class="mt-2 text-[1.625rem] font-semibold tracking-[-0.035em] text-[#1c2a22]"
            >
              {{ card.value }}
            </p>
          </div>
          <span
            :class="[
              'grid size-10 shrink-0 place-items-center rounded-[0.875rem] shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
              card.iconTone,
            ]"
          >
            <component :is="card.icon" class="size-4.5" aria-hidden="true" />
          </span>
        </div>
        <div class="mt-5 flex h-8 items-end justify-between gap-4">
          <p class="max-w-40 text-[0.6875rem] leading-4 text-[#758179]">
            {{ card.detail }}
          </p>
          <svg
            v-if="card.series.length"
            class="stat-sparkline"
            viewBox="0 0 96 36"
            role="img"
            :aria-label="`Chuỗi dữ liệu thực theo ngày của ${card.label}`"
            data-testid="stat-sparkline"
          >
            <line
              x1="4"
              y1="31"
              x2="92"
              y2="31"
              class="stat-sparkline-baseline"
            />
            <polyline
              :points="sparklinePoints(card.series)"
              class="stat-sparkline-line"
            />
            <circle
              :cx="sparklineLastPoint(card.series).x"
              :cy="sparklineLastPoint(card.series).y"
              r="2.75"
              class="stat-sparkline-point"
            />
          </svg>
          <div
            v-else
            class="stat-current-indicator"
            role="img"
            :aria-label="`${card.label}: chỉ có giá trị hiện tại, chưa có chuỗi lịch sử`"
            data-testid="stat-current-indicator"
          >
            <span class="stat-current-line"></span>
            <span class="stat-current-dot"></span>
            <span class="text-[0.59375rem] font-medium text-[#718078]"
              >Hiện tại</span
            >
          </div>
        </div>
      </article>
    </section>

    <div
      v-if="calendarFocused"
      :class="['calendar-focus-backdrop', calendarClosing && 'is-closing']"
      data-testid="calendar-focus-backdrop"
      aria-hidden="true"
      @click="closeCalendarFocus"
    ></div>

    <div
      class="mt-4 grid min-w-0 max-w-full items-stretch gap-4 xl:grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)]"
    >
      <section
        :class="[
          'dashboard-card relative flex min-h-0 min-w-0 flex-col bg-white',
          !calendarFocused && 'h-0 min-h-full overflow-hidden',
          calendarFocused && 'calendar-focus-surface',
          calendarClosing && 'is-closing',
        ]"
        aria-labelledby="clinic-calendar-title"
        data-testid="clinic-calendar"
        :data-focus-mode="calendarFocused ? 'true' : 'false'"
        :tabindex="calendarFocused ? -1 : undefined"
      >
        <div
          class="flex flex-col gap-3 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between"
        >
          <div class="flex min-w-0 flex-wrap items-center gap-3">
            <div class="flex shrink-0 items-center gap-2">
              <span
                class="grid size-9 place-items-center rounded-xl bg-primary-50 text-primary-800"
              >
                <CalendarCheck2 class="size-4.5" aria-hidden="true" />
              </span>

              <div class="min-w-0">
                <h2
                  id="clinic-calendar-title"
                  class="whitespace-nowrap text-[1rem] font-semibold tracking-[-0.015em] text-[#1d2a23]"
                >
                  Lịch hẹn clinic
                </h2>

                <p
                  v-if="auth.role !== 'super_admin'"
                  class="mt-0.5 whitespace-nowrap text-[0.6875rem] text-[#7a867f]"
                  data-testid="clinic-branch-context"
                >
                  {{ clinicBranchContext }}
                </p>
              </div>
            </div>

            <div
              v-if="auth.role === 'super_admin'"
              class="branch-picker branch-picker-clinic"
              data-testid="clinic-branch-picker"
              @click.stop
            >
              <button
                type="button"
                class="branch-picker-trigger"
                data-testid="clinic-branch-trigger"
                aria-haspopup="listbox"
                :aria-expanded="branchMenuOpen === 'clinic'"
                @click="toggleBranchMenu('clinic')"
              >
                <MapPin
                  class="size-3.5 shrink-0 text-primary-700"
                  aria-hidden="true"
                />
                <span class="min-w-0 flex-1 truncate text-left">{{
                  clinicBranchContext
                }}</span>
                <ChevronDown
                  :class="[
                    'size-3 shrink-0 text-[#8a958e] transition-transform duration-200',
                    branchMenuOpen === 'clinic' && 'rotate-180',
                  ]"
                  aria-hidden="true"
                />
              </button>

              <Transition name="dashboard-menu">
                <div
                  v-if="branchMenuOpen === 'clinic'"
                  class="branch-picker-menu"
                  role="listbox"
                  aria-label="Chọn chi nhánh clinic"
                  data-testid="clinic-branch-menu"
                >
                  <button
                    type="button"
                    role="option"
                    :aria-selected="selectedClinicBranchId === undefined"
                    :class="[
                      'branch-picker-option',
                      selectedClinicBranchId === undefined && 'is-selected',
                    ]"
                    data-testid="clinic-branch-option"
                    @click="selectBranchOption('clinic')"
                  >
                    <span class="truncate">Tất cả chi nhánh</span>
                    <Check
                      v-if="selectedClinicBranchId === undefined"
                      class="size-3.5 shrink-0"
                      aria-hidden="true"
                    />
                  </button>

                  <button
                    v-for="branch in branches"
                    :key="branch.id"
                    type="button"
                    role="option"
                    :aria-selected="selectedClinicBranchId === branch.id"
                    :class="[
                      'branch-picker-option',
                      selectedClinicBranchId === branch.id && 'is-selected',
                    ]"
                    data-testid="clinic-branch-option"
                    @click="selectBranchOption('clinic', branch.id)"
                  >
                    <span class="truncate">{{ branch.name }}</span>
                    <Check
                      v-if="selectedClinicBranchId === branch.id"
                      class="size-3.5 shrink-0"
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </Transition>
            </div>
          </div>

          <div
            class="flex min-w-0 flex-wrap items-center gap-1.5 lg:justify-end"
          >
            <span
              class="mr-1 whitespace-nowrap text-[0.6875rem] font-medium text-[#758179]"
              data-testid="calendar-week-range"
            >
              {{ weekLabel() }}
            </span>

            <button
              type="button"
              class="dashboard-icon-button"
              aria-label="Tuần trước"
              @click="shiftWeek(-1)"
            >
              <ChevronLeft class="size-4" />
            </button>

            <button
              type="button"
              class="dashboard-today-button"
              @click="returnToCurrentWeek"
            >
              Hôm nay
            </button>

            <button
              type="button"
              class="dashboard-icon-button"
              aria-label="Tuần sau"
              @click="shiftWeek(1)"
            >
              <ChevronRight class="size-4" />
            </button>

            <button
              v-if="!calendarFocused"
              type="button"
              class="dashboard-icon-button ml-1"
              aria-label="Mở rộng lịch hẹn clinic"
              data-testid="calendar-expand"
              @click="openCalendarFocus"
            >
              <Maximize2 class="size-4" />
            </button>

            <button
              v-else
              type="button"
              class="dashboard-icon-button ml-1 bg-[#f3f6f3]"
              aria-label="Đóng chế độ tập trung"
              data-testid="calendar-focus-close"
              @click="closeCalendarFocus"
            >
              <X class="size-4" />
            </button>
          </div>
        </div>

        <div
          class="min-h-0 flex-1 overflow-auto rounded-b-[1.375rem] border-t border-[#e9eeea]"
          data-testid="calendar-scroll-region"
        >
          <div class="overflow-x-auto overscroll-x-contain">
            <div class="min-w-2xl xl:min-w-0">
              <div
                class="grid grid-cols-[3.75rem_repeat(7,minmax(0,1fr))] bg-[#fbfcfa]"
              >
                <div class="border-r border-[#e9eeea]"></div>
                <div
                  v-for="day in weekDays"
                  :key="dateKey(day)"
                  class="border-r border-[#e9eeea] px-1.5 py-2.5 text-center last:border-r-0"
                >
                  <div
                    :class="[
                      'mx-auto grid min-h-11 place-items-center rounded-xl px-1.5 py-1',
                      isToday(day)
                        ? 'bg-primary-800 text-white shadow-sm'
                        : 'text-[#56645c]',
                    ]"
                    data-testid="calendar-day-label"
                  >
                    <p
                      class="text-[0.5625rem] font-semibold uppercase tracking-[0.055em] opacity-75"
                      data-testid="calendar-weekday"
                    >
                      {{ calendarWeekdayLabel(day) }}
                    </p>
                    <p
                      class="whitespace-nowrap text-[0.75rem] font-semibold tabular-nums"
                      data-testid="calendar-date"
                    >
                      {{ calendarDateLabel(day) }}
                    </p>
                  </div>
                </div>
              </div>

              <div
                class="relative grid grid-cols-[3.75rem_repeat(7,minmax(0,1fr))]"
                :style="{ height: calendarHeight }"
              >
                <div class="relative border-r border-[#e9eeea] bg-[#fbfcfa]">
                  <span
                    v-for="hour in hours"
                    :key="hour"
                    class="absolute right-2 -translate-y-1/2 text-[0.625rem] text-[#8a958f]"
                    :style="{ top: `${(hour - START_HOUR) * HOUR_HEIGHT}px` }"
                    >{{ String(hour).padStart(2, "0") }}h</span
                  >
                </div>
                <div
                  v-for="day in weekDays"
                  :key="dateKey(day)"
                  class="calendar-day-column relative border-r border-[#e9eeea] last:border-r-0"
                >
                  <article
                    v-for="appointment in eventsForDay(day)"
                    :key="appointment.id"
                    :class="[
                      'absolute inset-x-1 z-2 overflow-hidden rounded-lg border-l-[3px] px-2 py-1.5 shadow-[0_2px_7px_rgba(20,46,34,0.06)]',
                      statusTone(appointment.status),
                    ]"
                    :style="appointmentStyle(appointment)"
                    :aria-label="`${timeLabel(appointment.starts_at)}, ${appointment.customer.name ?? appointment.appointment_number}, ${appointment.service.name}, ${appointment.status_label}`"
                    data-testid="calendar-event"
                  >
                    <p class="truncate text-[0.625rem] font-semibold">
                      {{ timeLabel(appointment.starts_at) }} ·
                      {{
                        appointment.customer.name ||
                        appointment.appointment_number
                      }}
                    </p>
                    <p class="mt-0.5 truncate text-[0.625rem] opacity-75">
                      {{ appointment.service.name }}
                    </p>
                    <p
                      v-if="appointment.technician"
                      class="mt-0.5 truncate text-[0.5625rem] opacity-65"
                    >
                      {{ appointment.technician.name }}
                    </p>
                    <p
                      v-if="
                        auth.role === 'super_admin' &&
                        selectedClinicBranchId === undefined
                      "
                      class="mt-0.5 truncate text-[0.5625rem] opacity-65"
                    >
                      {{ appointment.branch.name }}
                    </p>
                  </article>
                </div>

                <div
                  v-if="calendarLoading"
                  class="pointer-events-none absolute inset-0 left-15 z-3 grid grid-cols-7 gap-px bg-white/72 px-1 py-3 backdrop-blur-[1px]"
                  data-testid="calendar-loading"
                >
                  <div v-for="index in 7" :key="index" class="space-y-4 px-1">
                    <div
                      class="h-14 animate-pulse rounded-lg bg-primary-50/80"
                    ></div>
                    <div
                      class="mt-16 h-20 animate-pulse rounded-lg bg-[#f2f4f1]"
                    ></div>
                  </div>
                </div>
                <div
                  v-else-if="!appointments.length"
                  class="pointer-events-none absolute left-15 right-0 top-24 z-3 flex justify-center px-6"
                  data-testid="calendar-empty"
                >
                  <p
                    class="rounded-full bg-white/90 px-4 py-2 text-[0.75rem] text-[#748078] shadow-[0_4px_16px_rgba(25,52,40,0.06)] ring-1 ring-[#e3e9e4]"
                  >
                    Chưa có lịch hẹn trong khoảng thời gian này.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <aside class="grid min-w-0 content-start gap-4">
        <div
          class="grid min-w-0 gap-3"
          data-testid="appointment-insights-group"
        >
          <section
            class="dashboard-card min-w-0 bg-white p-4"
            aria-labelledby="upcoming-title"
            data-testid="upcoming-appointments"
          >
            <div class="flex items-center justify-between gap-3">
              <div>
                <p
                  class="text-[0.6875rem] font-medium uppercase tracking-[0.09em] text-primary-700"
                >
                  Tiếp theo
                </p>
                <h2
                  id="upcoming-title"
                  class="mt-1 text-[1rem] font-semibold text-[#1d2a23]"
                >
                  Lịch hẹn sắp tới
                </h2>
              </div>
              <Clock3 class="size-4.5 text-[#7b8880]" aria-hidden="true" />
            </div>
            <div
              v-if="calendarLoading"
              class="mt-4 grid gap-2"
              aria-label="Đang tải lịch hẹn"
            >
              <div
                v-for="index in 4"
                :key="index"
                class="h-16 animate-pulse rounded-xl bg-[#f3f6f3]"
              ></div>
            </div>
            <div
              v-else-if="upcomingAppointments.length"
              class="mt-4 divide-y divide-[#edf0ed]"
            >
              <article
                v-for="appointment in upcomingAppointments"
                :key="appointment.id"
                class="flex gap-2 py-2.5 first:pt-1 last:pb-0"
              >
                <div
                  class="w-11 shrink-0 pt-0.5 text-[0.6875rem] font-semibold text-primary-800"
                >
                  {{ timeLabel(appointment.starts_at) }}
                </div>
                <div class="min-w-0 flex-1">
                  <p
                    class="truncate text-[0.75rem] font-semibold text-[#2b3931]"
                  >
                    {{
                      appointment.customer.name ||
                      appointment.appointment_number
                    }}
                  </p>
                  <p class="mt-0.5 truncate text-[0.6875rem] text-[#77837c]">
                    {{ appointment.service.name }}
                  </p>
                  <p
                    class="mt-1 inline-flex items-center gap-1.5 text-[0.625rem] text-[#7b8780]"
                  >
                    <span
                      :class="[
                        'size-1.5 rounded-full',
                        statusDot(appointment.status),
                      ]"
                    ></span
                    >{{ appointment.status_label }}
                  </p>
                </div>
              </article>
            </div>
            <p
              v-else
              class="mt-4 rounded-xl bg-[#f7f9f7] px-3 py-4 text-center text-[0.75rem] text-[#7a867f]"
            >
              Không có lịch hẹn sắp tới trong tuần.
            </p>
          </section>

          <section
            class="dashboard-card min-w-0 bg-white p-4"
            aria-labelledby="status-breakdown-title"
            data-testid="appointment-status-breakdown"
          >
            <div class="flex items-center gap-2">
              <span
                class="grid size-8 place-items-center rounded-xl bg-[#eef4ef] text-primary-800"
                ><UserRound class="size-4" aria-hidden="true"
              /></span>
              <h2
                id="status-breakdown-title"
                class="text-[0.875rem] font-semibold text-[#26342c]"
              >
                Trạng thái lịch hẹn
              </h2>
            </div>
            <div v-if="statusBreakdown.length" class="mt-4 grid gap-3">
              <div v-for="item in statusBreakdown" :key="item.status">
                <div
                  class="flex items-center justify-between gap-3 text-[0.6875rem]"
                >
                  <span class="truncate text-[#66736b]">{{ item.label }}</span>
                  <span class="font-semibold text-[#34423a]">{{
                    item.count
                  }}</span>
                </div>
                <div
                  class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#edf1ed]"
                >
                  <div
                    :class="['h-full rounded-full', statusDot(item.status)]"
                    :style="{
                      width: `${(item.count / largestStatusCount) * 100}%`,
                    }"
                  ></div>
                </div>
              </div>
            </div>
            <p
              v-else
              class="mt-4 rounded-xl bg-[#f7f9f7] px-3 py-4 text-center text-[0.75rem] text-[#7a867f]"
            >
              Chưa có trạng thái lịch hẹn trong tuần.
            </p>
          </section>
        </div>

        <section
          class="dashboard-card min-w-0 bg-white p-4"
          aria-labelledby="top-products-title"
          data-testid="top-products"
        >
          <div class="flex items-center justify-between gap-3">
            <div>
              <p
                class="text-[0.6875rem] font-medium uppercase tracking-[0.09em] text-primary-700"
              >
                Hiệu suất bán hàng
              </p>
              <h2
                id="top-products-title"
                class="mt-1 text-[1rem] font-semibold text-[#1d2a23]"
              >
                Top 5 sản phẩm bán chạy
              </h2>
            </div>
            <Package class="size-4.5 text-[#7b8880]" aria-hidden="true" />
          </div>
          <div
            v-if="dashboardQuery.isPending.value"
            class="mt-4 grid gap-2"
            aria-label="Đang tải sản phẩm bán chạy"
          >
            <div
              v-for="index in 3"
              :key="index"
              class="h-14 animate-pulse rounded-xl bg-[#f3f6f3]"
            ></div>
          </div>
          <ol
            v-else-if="topProducts.length"
            class="mt-3 divide-y divide-[#edf0ed]"
          >
            <li
              v-for="(product, index) in topProducts"
              :key="product.product_id ?? `${product.product_name}-${index}`"
              :class="['flex items-center gap-2.5 py-2.5', ,]"
              data-testid="top-product-row"
            >
              <span
                class="w-5 shrink-0 text-[0.625rem] font-semibold tabular-nums text-[#8a958f]"
                >{{ String(index + 1).padStart(2, "0") }}</span
              >
              <img
                v-if="product.image_url"
                :src="product.image_url"
                :alt="product.product_name"
                class="size-9 shrink-0 object-cover"
              />
              <span
                v-else
                class="grid size-9 shrink-0 place-items-center rounded-lg bg-[#edf3ee] text-primary-700"
                ><Package class="size-4" aria-hidden="true"
              /></span>
              <div class="min-w-0 flex-1">
                <p
                  class="truncate text-[0.6875rem] font-semibold text-[#344139]"
                >
                  {{ product.product_name }}
                </p>
                <div class="mt-1 flex items-center gap-2">
                  <span class="whitespace-nowrap text-[0.625rem] text-[#7c8781]"
                    >{{ numberFormat.format(product.quantity) }} đã bán</span
                  >
                  <span
                    class="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-[#e8eee9]"
                    ><span
                      class="block h-full rounded-full bg-primary-600/65"
                      :style="{
                        width: `${(product.quantity / topProductMaximum) * 100}%`,
                      }"
                    ></span
                  ></span>
                </div>
              </div>
            </li>
          </ol>
          <p
            v-else
            class="mt-4 rounded-xl bg-[#f7f9f7] px-3 py-5 text-center text-[0.75rem] text-[#7a867f]"
            data-testid="top-products-empty"
          >
            Chưa có dữ liệu sản phẩm bán chạy trong kỳ này.
          </p>
        </section>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.dashboard-v2 {
  color: #1d2a23;
}

.dashboard-header {
  background:
    radial-gradient(
      circle at 92% 10%,
      rgb(217 234 220 / 0.55),
      transparent 27%
    ),
    linear-gradient(135deg, rgb(255 255 255 / 0.92), rgb(247 250 246 / 0.94));
  box-shadow:
    0 0 0 1px rgb(25 64 46 / 0.055),
    0 1px 2px rgb(15 23 42 / 0.025),
    0 12px 32px rgb(23 52 39 / 0.045);
}

.dashboard-card {
  border-radius: 1.375rem;
  box-shadow:
    0 0 0 1px rgb(25 64 46 / 0.055),
    0 1px 2px rgb(15 23 42 / 0.025),
    0 9px 26px rgb(23 52 39 / 0.04);
}

.dashboard-context-control {
  display: inline-flex;
  min-height: 2.5rem;
  align-items: center;
  gap: 0.5rem;
  border-radius: 0.875rem;
  padding-inline: 0.75rem;
  background: rgb(255 255 255 / 0.78);
  box-shadow:
    0 0 0 1px rgb(25 64 46 / 0.08),
    0 2px 8px rgb(20 48 35 / 0.035);
}

.branch-picker {
  position: relative;
  min-width: 0;
}

.branch-picker:focus-within {
  z-index: 35;
}

.branch-picker-dashboard {
  width: min(13.75rem, calc(100vw - 2.5rem));
}

.branch-picker-clinic {
  width: 9.75rem;
  flex: 0 0 auto;
}

.branch-picker-trigger {
  display: flex;
  width: 100%;
  min-height: 2.5rem;
  min-width: 0;
  align-items: center;
  gap: 0.5rem;
  border-radius: 0.875rem;
  padding: 0.375rem 0.75rem 0.375rem 0.5rem;
  color: #33443a;
  background: rgb(255 255 255 / 0.82);
  box-shadow:
    0 0 0 1px rgb(25 64 46 / 0.085),
    0 3px 10px rgb(20 48 35 / 0.04);
  font-size: 0.8125rem;
  font-weight: 550;
  transition:
    background-color 180ms ease,
    box-shadow 180ms ease,
    transform 180ms ease;
}

.branch-picker-clinic .branch-picker-trigger {
  min-height: 2rem;
  border-radius: 0.75rem;
  padding: 0.25rem 0.625rem;
  font-size: 0.71875rem;
}

.branch-picker-trigger:hover {
  background: rgb(255 255 255 / 0.97);
  box-shadow:
    0 0 0 1px rgb(25 64 46 / 0.13),
    0 6px 18px rgb(20 48 35 / 0.065);
}

.branch-picker-trigger:focus-visible {
  outline: 2px solid rgb(52 122 87 / 0.28);
  outline-offset: 2px;
}

.branch-picker-icon {
  display: grid;
  width: 1.875rem;
  height: 1.875rem;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 0.625rem;
  color: #276044;
  background: #eef5ef;
}

.branch-picker-menu {
  position: absolute;
  top: calc(100% + 0.45rem);
  left: 0;
  z-index: 50;
  display: grid;
  width: 100%;
  max-height: 15rem;
  gap: 0.125rem;
  overflow-y: auto;
  border-radius: 0.9375rem;
  padding: 0.375rem;
  background: rgb(255 255 255 / 0.98);
  box-shadow:
    0 0 0 1px rgb(25 64 46 / 0.09),
    0 18px 44px rgb(18 43 31 / 0.14);
  backdrop-filter: blur(20px);
  scrollbar-width: thin;
  scrollbar-color: rgb(60 95 76 / 0.22) transparent;
}

.branch-picker-menu::-webkit-scrollbar {
  width: 4px;
}

.branch-picker-menu::-webkit-scrollbar-track {
  background: transparent;
}

.branch-picker-menu::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgb(60 95 76 / 0.18);
}

.branch-picker-menu::-webkit-scrollbar-thumb:hover {
  background: rgb(60 95 76 / 0.3);
}

.branch-picker-option {
  display: flex;
  width: 100%;
  min-height: 2.25rem;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 0.625rem;
  border-radius: 0.6875rem;
  padding-inline: 0.6875rem;
  color: #5e6d64;
  font-size: 0.71875rem;
  text-align: left;
  transition:
    color 150ms ease,
    background-color 150ms ease;
}

.branch-picker-option:hover,
.branch-picker-option.is-selected {
  color: #245e43;
  background: #eff6f0;
}

.branch-picker-option:focus-visible {
  outline: 2px solid rgb(52 122 87 / 0.28);
  outline-offset: -2px;
}

.stat-sparkline {
  width: 5.5rem;
  height: 2.125rem;
  flex: 0 0 auto;
  overflow: visible;
}

.stat-sparkline-baseline {
  stroke: rgb(50 91 69 / 0.12);
  stroke-width: 1;
}

.stat-sparkline-line {
  fill: none;
  stroke: rgb(47 111 78 / 0.7);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.stat-sparkline-point {
  fill: #f7fbf7;
  stroke: rgb(42 103 72 / 0.8);
  stroke-width: 1.5;
}

.stat-current-indicator {
  display: flex;
  width: 5.25rem;
  height: 2rem;
  flex: 0 0 auto;
  align-items: center;
  justify-content: flex-end;
  gap: 0.35rem;
}

.stat-current-line {
  width: 1.5rem;
  height: 1px;
  border-radius: 999px;
  background: rgb(55 92 72 / 0.2);
}

.stat-current-dot {
  width: 0.4375rem;
  height: 0.4375rem;
  flex: 0 0 auto;
  border: 2px solid rgb(255 255 255 / 0.82);
  border-radius: 999px;
  background: rgb(51 111 78 / 0.65);
  box-shadow: 0 0 0 1px rgb(42 91 65 / 0.16);
}

.dashboard-filter-trigger {
  cursor: pointer;
  transition:
    background-color 180ms ease,
    box-shadow 180ms ease,
    transform 180ms ease;
}

.dashboard-filter-trigger:hover {
  background: rgb(255 255 255 / 0.94);
  box-shadow:
    0 0 0 1px rgb(25 64 46 / 0.12),
    0 5px 14px rgb(20 48 35 / 0.055);
}

.dashboard-filter-trigger:focus-visible {
  outline: 2px solid rgb(52 122 87 / 0.28);
  outline-offset: 2px;
}

.dashboard-filter-menu {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  z-index: 20;
  display: grid;
  width: 14rem;
  gap: 0.125rem;
  padding: 0.375rem;
  border-radius: 1rem;
  background: rgb(255 255 255 / 0.97);
  box-shadow:
    0 0 0 1px rgb(25 64 46 / 0.08),
    0 16px 40px rgb(18 43 31 / 0.12);
  backdrop-filter: blur(18px);
}

.dashboard-filter-option {
  display: flex;
  min-height: 2.375rem;
  align-items: center;
  justify-content: space-between;
  border-radius: 0.75rem;
  padding-inline: 0.75rem;
  color: #5f6d65;
  font-size: 0.75rem;
  text-align: left;
  transition:
    background-color 150ms ease,
    color 150ms ease;
}

.dashboard-filter-option:hover,
.dashboard-filter-option.is-selected {
  color: #245e43;
  background: #f0f6f1;
}

.dashboard-filter-option:focus-visible {
  outline: 2px solid rgb(52 122 87 / 0.3);
  outline-offset: -2px;
}

.dashboard-date-field {
  display: grid;
  gap: 0.3rem;
  color: #718078;
  font-size: 0.625rem;
  font-weight: 600;
}

.dashboard-date-field input {
  min-height: 2.375rem;
  border: 0;
  border-radius: 0.75rem;
  padding-inline: 0.75rem;
  color: #33443a;
  background: rgb(255 255 255 / 0.86);
  box-shadow:
    0 0 0 1px rgb(25 64 46 / 0.1),
    0 2px 8px rgb(20 48 35 / 0.035);
  font-size: 0.75rem;
  outline: none;
}

.dashboard-date-field input:focus-visible {
  box-shadow:
    0 0 0 2px rgb(52 122 87 / 0.28),
    0 0 0 5px rgb(52 122 87 / 0.06);
}

.dashboard-menu-enter-active,
.dashboard-menu-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
  transform-origin: top right;
}

.dashboard-menu-enter-from,
.dashboard-menu-leave-to {
  opacity: 0;
  transform: translateY(-0.25rem) scale(0.98);
}

.calendar-focus-backdrop {
  position: fixed;
  inset: 0;
  z-index: 45;
  background: rgb(20 34 27 / 0.34);
  backdrop-filter: blur(7px);
  animation: calendar-backdrop-in 280ms ease-out both;
}

.calendar-focus-backdrop.is-closing {
  animation: calendar-backdrop-out 260ms ease-in both;
}

.calendar-focus-surface {
  position: fixed;
  inset: clamp(1.25rem, 3vw, 2rem);
  z-index: 50;
  display: flex;
  max-width: 96rem;
  max-height: calc(100dvh - clamp(2.5rem, 6vw, 4rem));
  margin: auto;
  flex-direction: column;
  box-shadow:
    0 0 0 1px rgb(255 255 255 / 0.65),
    0 32px 90px rgb(11 30 21 / 0.26);
  animation: calendar-focus-in 280ms cubic-bezier(0.2, 0.85, 0.25, 1) both;
}

.calendar-focus-surface.is-closing {
  animation: calendar-focus-out 260ms ease-in both;
}

.calendar-focus-surface [data-testid="calendar-scroll-region"] {
  min-height: 0;
  flex: 1;
  overflow: auto;
}

.calendar-focus-surface [data-testid="calendar-scroll-region"] > div {
  min-height: 100%;
}

.calendar-scroll-region {
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: rgb(60 95 76 / 0.18) transparent;
}

.calendar-scroll-region::-webkit-scrollbar {
  width: 5px;
}

.calendar-scroll-region::-webkit-scrollbar-track {
  background: transparent;
}

.calendar-scroll-region::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgb(60 95 76 / 0.16);
}

.calendar-scroll-region::-webkit-scrollbar-thumb:hover {
  background: rgb(60 95 76 / 0.28);
}

@keyframes calendar-backdrop-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes calendar-backdrop-out {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

@keyframes calendar-focus-in {
  from {
    opacity: 0;
    transform: translateY(0.75rem) scale(0.975);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes calendar-focus-out {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(0.5rem) scale(0.98);
  }
}

.dashboard-icon-button,
.dashboard-today-button {
  display: inline-grid;
  min-height: 2.25rem;
  place-items: center;
  border-radius: 0.75rem;
  color: #536259;
  transition:
    background-color 150ms ease,
    color 150ms ease,
    box-shadow 150ms ease;
}

.dashboard-icon-button {
  width: 2.25rem;
}

.dashboard-today-button {
  padding-inline: 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.dashboard-icon-button:hover,
.dashboard-today-button:hover {
  color: #245e43;
  background: #f0f6f1;
}

.dashboard-icon-button:focus-visible,
.dashboard-today-button:focus-visible {
  outline: 2px solid rgb(52 122 87 / 0.35);
  outline-offset: 2px;
}

.calendar-day-column {
  background-image: repeating-linear-gradient(
    to bottom,
    transparent 0,
    transparent calc(4rem - 1px),
    #edf0ed calc(4rem - 1px),
    #edf0ed 4rem
  );
}

@media (max-width: 639px) {
  .dashboard-header,
  .dashboard-card {
    border-radius: 1.125rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .dashboard-v2 * {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }

  .calendar-focus-backdrop,
  .calendar-focus-surface {
    animation-duration: 0.01ms !important;
  }
}
</style>
