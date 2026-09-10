<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import {
  Check,
  ChevronDown,
  Clipboard,
  Columns3,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  UserRound,
  X,
} from "@lucide/vue";
import { useInfiniteQuery, useQuery } from "@tanstack/vue-query";
import AdminOrdersFilterMenu from "@/components/admin/AdminOrdersFilterMenu.vue";
import BasePopover from "@/components/common/BasePopover.vue";
import BaseSkeleton from "@/components/common/BaseSkeleton.vue";
import { getAdminList } from "@/api/adminApi";
import { useAuthStore } from "@/stores/auth";
import {
  isApplicationError,
  type AdminListParams,
  type AdminRecord,
  type AdminStaffListRecord,
  type AdminStaffRole,
  type AdminStaffStatus,
} from "@/types/admin";

interface BranchOption extends AdminRecord {
  code: string;
  name: string;
}

type ColumnKey = "role" | "branch" | "contact" | "status";
interface AvatarRenderState {
  signature: string;
  candidates: string[];
  candidateIndex: number;
}

const router = useRouter();
const auth = useAuthStore();
const isSuperAdmin = computed(() => auth.user?.role === "super_admin");
const canCreate = computed(() => isSuperAdmin.value || auth.user?.role === "branch_manager");
const searchField = ref<HTMLInputElement | null>(null);
const searchInput = ref("");
const keyword = ref("");
const roleFilter = ref<"" | AdminStaffRole>("");
const branchFilter = ref("");
const statusFilter = ref<"" | AdminStaffStatus>("");
const columnsOpen = ref(false);
const copiedId = ref<number | null>(null);
const infiniteSentinel = ref<HTMLElement | null>(null);
const avatarStates = reactive(new Map<number, AvatarRenderState>());
let searchTimer: number | undefined;
let copyTimer: number | undefined;
let infiniteObserver: IntersectionObserver | undefined;

const defaultColumns: ColumnKey[] = ["role", "branch", "contact", "status"];
const columnDefinitions: Array<{ key: ColumnKey; label: string }> = [
  { key: "role", label: "Chức vụ" },
  { key: "branch", label: "Chi nhánh" },
  { key: "contact", label: "Liên hệ" },
  { key: "status", label: "Trạng thái" },
];
const roleOptions = [
  { value: "", label: "Tất cả chức vụ" },
  { value: "super_admin", label: "Quản trị viên hệ thống" },
  { value: "branch_manager", label: "Quản lý chi nhánh" },
  { value: "cashier", label: "Thu ngân" },
  { value: "technician", label: "Kỹ thuật viên" },
];
const statusOptions = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "working", label: "Đang làm việc" },
  { value: "left", label: "Đã nghỉ việc" },
];

function loadColumns(): Set<ColumnKey> {
  try {
    const stored = JSON.parse(localStorage.getItem("admin.staff.visibleColumns") ?? "null");
    if (Array.isArray(stored)) {
      return new Set(stored.filter((value): value is ColumnKey => defaultColumns.includes(value)));
    }
  } catch {
    // Invalid preferences safely fall back to the product defaults.
  }
  return new Set(defaultColumns);
}

const visibleColumns = reactive(loadColumns());

watch(searchInput, (value) => {
  window.clearTimeout(searchTimer);
  if (!value) {
    keyword.value = "";
    return;
  }
  searchTimer = window.setTimeout(() => {
    keyword.value = value.trim();
  }, 300);
});
watch(visibleColumns, () => {
  localStorage.setItem("admin.staff.visibleColumns", JSON.stringify([...visibleColumns]));
});
watch(infiniteSentinel, (element) => {
  infiniteObserver?.disconnect();
  if (!element || typeof IntersectionObserver === "undefined") return;
  infiniteObserver = new IntersectionObserver(
    ([entry]) => {
      if (entry?.isIntersecting && staffQuery.hasNextPage.value && !staffQuery.isFetchingNextPage.value) {
        void staffQuery.fetchNextPage();
      }
    },
    { rootMargin: "420px 0px" },
  );
  infiniteObserver.observe(element);
});

onBeforeUnmount(() => {
  window.clearTimeout(searchTimer);
  window.clearTimeout(copyTimer);
  infiniteObserver?.disconnect();
});

const branchOptionsQuery = useQuery({
  queryKey: ["admin", "staff", "branch-options"],
  queryFn: () => getAdminList<BranchOption>("branches", { is_active: 1, per_page: 100 }),
  enabled: isSuperAdmin,
  staleTime: 5 * 60 * 1000,
});
const branchOptions = computed(() => [
  { value: "", label: "Tất cả chi nhánh" },
  ...(branchOptionsQuery.data.value?.items ?? []).map((branch) => ({
    value: String(branch.id),
    label: branch.name,
  })),
]);
const params = computed<AdminListParams>(() => ({
  keyword: keyword.value || undefined,
  role: roleFilter.value || undefined,
  status: statusFilter.value || undefined,
  branch_id: isSuperAdmin.value && branchFilter.value ? Number(branchFilter.value) : undefined,
  per_page: 30,
}));
const staffQuery = useInfiniteQuery({
  queryKey: computed(() => ["admin", "staff", "list", params.value]),
  queryFn: ({ pageParam }) => getAdminList<AdminStaffListRecord>("staff", { ...params.value, page: pageParam }),
  initialPageParam: 1,
  getNextPageParam: (lastPage) =>
    lastPage.pagination.current_page < lastPage.pagination.last_page
      ? lastPage.pagination.current_page + 1
      : undefined,
  retry: 1,
});
watch(
  () => staffQuery.data.value,
  () => avatarStates.clear(),
);
const rows = computed(() => {
  const unique = new Map<number, AdminStaffListRecord>();
  for (const page of staffQuery.data.value?.pages ?? []) {
    for (const staff of page.items) unique.set(staff.id, staff);
  }
  return [...unique.values()];
});
const total = computed(() => staffQuery.data.value?.pages[0]?.pagination.total ?? rows.value.length);
const hasFilters = computed(() => Boolean(keyword.value || roleFilter.value || statusFilter.value || (isSuperAdmin.value && branchFilter.value)));
const errorKind = computed(() =>
  isApplicationError(staffQuery.error.value) ? staffQuery.error.value.kind : "unknown",
);

function columnVisible(key: ColumnKey): boolean {
  return visibleColumns.has(key);
}
function toggleColumn(key: ColumnKey): void {
  visibleColumns.has(key) ? visibleColumns.delete(key) : visibleColumns.add(key);
}
function resetColumns(): void {
  visibleColumns.clear();
  defaultColumns.forEach((column) => visibleColumns.add(column));
}
function clearSearch(): void {
  searchInput.value = "";
  keyword.value = "";
  searchField.value?.focus();
}
function clearFilters(): void {
  clearSearch();
  roleFilter.value = "";
  branchFilter.value = "";
  statusFilter.value = "";
}
function openStaff(id: number): void {
  void router.push(`/admin/staff/${id}`);
}
function handleRowKeydown(event: KeyboardEvent, id: number): void {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    openStaff(id);
  }
}
async function copyCode(staff: AdminStaffListRecord, event: Event): Promise<void> {
  event.stopPropagation();
  try {
    await navigator.clipboard.writeText(staff.code);
    copiedId.value = staff.id;
    window.clearTimeout(copyTimer);
    copyTimer = window.setTimeout(() => {
      copiedId.value = null;
    }, 1700);
  } catch {
    // Clipboard denial leaves the control unchanged.
  }
}
function avatarCandidates(staff: AdminStaffListRecord): string[] {
  return [staff.avatar_rendition_url, staff.avatar]
    .map((value) => value?.trim() ?? "")
    .filter((value, index, values) => Boolean(value) && values.indexOf(value) === index);
}
function avatarState(staff: AdminStaffListRecord): AvatarRenderState {
  const candidates = avatarCandidates(staff);
  const signature = candidates.join("\u0000");
  const existing = avatarStates.get(staff.id);
  if (existing?.signature === signature) return existing;

  const state: AvatarRenderState = {
    signature,
    candidates,
    candidateIndex: 0,
  };
  avatarStates.set(staff.id, state);
  return state;
}
function avatarUrl(staff: AdminStaffListRecord): string | null {
  const state = avatarState(staff);
  return state.candidates[state.candidateIndex] ?? null;
}
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(-2).map((part) => part[0]?.toUpperCase()).join("") || "NV";
}
function imageEventSource(event: Event): string {
  return (event.currentTarget as HTMLImageElement).getAttribute("src") ?? "";
}
function handleAvatarError(staff: AdminStaffListRecord, event: Event): void {
  const state = avatarState(staff);
  if (imageEventSource(event) !== state.candidates[state.candidateIndex]) return;

  state.candidateIndex += 1;
}
</script>

<template>
  <section class="staff-v2 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden" aria-label="Quản lý nhân viên" data-testid="admin-staff-list">
    <div class="staff-toolbar mb-3 shrink-0 p-2.5">
      <div class="flex flex-wrap items-center gap-2">
        <label class="relative min-w-52 flex-[1_1_22rem]">
          <span class="sr-only">Tìm kiếm nhân viên</span>
          <Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            ref="searchField"
            v-model="searchInput"
            type="text"
            placeholder="Tìm theo tên, mã, email hoặc số điện thoại"
            class="staff-search h-10 w-full rounded-xl bg-surface-subtle pl-9 pr-9 text-[0.8125rem] outline-none ring-1 ring-inset ring-transparent transition focus:bg-surface focus:ring-primary-500"
          />
          <button v-if="searchInput" type="button" aria-label="Xóa tìm kiếm" class="absolute right-1.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:bg-primary-50 hover:text-primary-800" @click="clearSearch">
            <X class="size-3.5" aria-hidden="true" />
          </button>
        </label>

        <AdminOrdersFilterMenu v-model="roleFilter" label="Lọc chức vụ" :options="roleOptions" />
        <AdminOrdersFilterMenu v-if="isSuperAdmin" v-model="branchFilter" label="Lọc chi nhánh" :options="branchOptions" />
        <AdminOrdersFilterMenu v-model="statusFilter" label="Lọc trạng thái nhân viên" :options="statusOptions" />

        <BasePopover v-model="columnsOpen" align="end" :side-offset="6" class="w-60 p-2">
          <template #trigger>
            <button type="button" class="staff-column-trigger" aria-label="Điều chỉnh cột" :aria-expanded="columnsOpen" data-testid="columns-trigger">
              <Columns3 class="size-4 shrink-0" aria-hidden="true" />
              <span class="min-w-0 flex-1 truncate text-left">Điều chỉnh cột</span>
              <ChevronDown class="size-3.5 shrink-0 text-muted-foreground transition-transform" :class="columnsOpen && 'rotate-180'" aria-hidden="true" />
            </button>
          </template>
          <div data-testid="columns-menu">
            <p class="px-2 py-1 text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">Cột hiển thị</p>
            <label data-testid="required-staff-column" class="mt-1 flex min-h-9 items-center gap-2.5 rounded-lg px-2.5 text-[0.8125rem] text-muted-foreground">
              <input type="checkbox" checked disabled class="size-4 rounded border-border accent-primary-700" /> Nhân viên
            </label>
            <label v-for="column in columnDefinitions" :key="column.key" class="flex min-h-9 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-[0.8125rem] hover:bg-primary-50">
              <input :data-testid="`column-${column.key}`" type="checkbox" :checked="columnVisible(column.key)" class="size-4 rounded border-border accent-primary-700" @change="toggleColumn(column.key)" />
              {{ column.label }}
            </label>
            <button type="button" data-testid="reset-columns" class="mt-1 flex min-h-9 w-full items-center gap-2 rounded-lg border-t border-border/70 px-2.5 pt-2 text-left text-[0.8125rem] font-medium text-primary-800 hover:bg-primary-50" @click="resetColumns">
              <RotateCcw class="size-3.5" aria-hidden="true" /> Khôi phục mặc định
            </button>
          </div>
        </BasePopover>

        <button v-if="canCreate" type="button" data-testid="create-staff" class="staff-create-button" @click="router.push('/admin/staff/create')">
          <Plus class="size-4" aria-hidden="true" /> Tạo nhân viên
        </button>
      </div>
    </div>

    <div data-testid="staff-table-shell" class="staff-table-shell min-h-0 min-w-0 flex-1 overflow-auto rounded-[1.35rem] bg-surface shadow-sm ring-1 ring-black/[0.035]">
      <div v-if="staffQuery.isPending.value" data-testid="staff-loading" class="space-y-3 p-5" aria-label="Đang tải danh sách nhân viên">
        <BaseSkeleton v-for="index in 7" :key="index" class="h-14 w-full rounded-xl" />
      </div>

      <div v-else-if="staffQuery.isError.value" data-testid="staff-error" class="grid min-h-72 place-items-center p-6 text-center">
        <div>
          <span class="mx-auto grid size-11 place-items-center rounded-2xl bg-rose-50 text-rose-700"><RefreshCw class="size-4" aria-hidden="true" /></span>
          <p class="mt-3 font-semibold">Không thể tải danh sách nhân viên</p>
          <p class="mt-1 text-body-sm text-muted-foreground">{{ errorKind === 'forbidden' ? 'Bạn không có quyền xem dữ liệu này.' : 'Vui lòng thử lại sau ít phút.' }}</p>
          <button type="button" class="mt-4 rounded-xl bg-primary-700 px-4 py-2 text-body-sm font-medium text-white hover:bg-primary-800" @click="staffQuery.refetch()">Thử lại</button>
        </div>
      </div>

      <div v-else-if="rows.length === 0" data-testid="staff-empty" class="grid min-h-72 place-items-center p-6 text-center">
        <div>
          <span class="mx-auto grid size-11 place-items-center rounded-2xl bg-primary-50 text-primary-800"><UserRound class="size-4" aria-hidden="true" /></span>
          <p class="mt-3 font-semibold">{{ hasFilters ? 'Không tìm thấy nhân viên phù hợp' : 'Chưa có nhân viên' }}</p>
          <p v-if="hasFilters" class="mt-1 text-body-sm text-muted-foreground">Thử thay đổi từ khóa hoặc bộ lọc.</p>
          <button v-if="hasFilters" type="button" class="mt-4 rounded-xl bg-primary-700 px-4 py-2 text-body-sm font-medium text-white hover:bg-primary-800" @click="clearFilters">Xóa bộ lọc</button>
        </div>
      </div>

      <table v-else class="w-full min-w-[760px] border-separate border-spacing-0 text-left text-[0.8125rem]">
        <thead class="sticky top-0 z-10 bg-surface/95 text-muted-foreground backdrop-blur">
          <tr>
            <th class="min-w-64 border-b border-border/70 px-4 py-3 font-medium">Nhân viên</th>
            <th v-if="columnVisible('role')" class="min-w-44 border-b border-border/70 px-4 py-3 font-medium">Chức vụ</th>
            <th v-if="columnVisible('branch')" class="min-w-48 border-b border-border/70 px-4 py-3 font-medium">Chi nhánh</th>
            <th v-if="columnVisible('contact')" class="min-w-56 border-b border-border/70 px-4 py-3 font-medium">Liên hệ</th>
            <th v-if="columnVisible('status')" class="w-40 border-b border-border/70 px-4 py-3 font-medium">Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="staff in rows"
            :key="staff.id"
            tabindex="0"
            role="link"
            :aria-label="`Mở nhân viên ${staff.name}`"
            data-testid="staff-row"
            class="group cursor-pointer outline-none transition-colors hover:bg-primary-50/45 focus-visible:bg-primary-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500/35"
            @click="openStaff(staff.id)"
            @keydown="handleRowKeydown($event, staff.id)"
          >
            <td class="border-b border-border/55 px-4 py-3.5">
              <div class="flex items-center gap-3">
                <div class="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-2xl bg-primary-50 text-xs font-semibold text-primary-800 ring-1 ring-primary-900/5">
                  <span v-if="!avatarUrl(staff)" data-testid="staff-avatar-fallback">{{ initials(staff.name) }}</span>
                  <img
                    v-if="avatarUrl(staff)"
                    :src="avatarUrl(staff)!"
                    :alt="`Ảnh đại diện ${staff.name}`"
                    data-testid="staff-avatar"
                    class="absolute inset-0 size-full object-cover"
                    @error="handleAvatarError(staff, $event)"
                  />
                </div>
                <div class="min-w-0">
                  <p class="truncate font-semibold text-foreground">{{ staff.name }}</p>
                  <div class="mt-1 flex items-center gap-1.5 text-caption text-muted-foreground">
                    <span>{{ staff.code }}</span>
                    <button type="button" data-testid="copy-staff-code" :aria-label="`Sao chép mã nhân viên ${staff.code}`" class="grid size-6 place-items-center rounded-lg transition hover:bg-primary-100 hover:text-primary-800" @click="copyCode(staff, $event)" @keydown.stop>
                      <Check v-if="copiedId === staff.id" data-testid="copy-success-icon" class="size-3.5 text-primary-700" aria-hidden="true" />
                      <Clipboard v-else data-testid="copy-icon" class="size-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            </td>
            <td v-if="columnVisible('role')" class="border-b border-border/55 px-4 py-3.5">
              <p class="font-medium text-foreground">{{ staff.role_label }}</p>
              <p v-if="staff.job_title?.trim()" class="mt-0.5 text-caption text-muted-foreground">{{ staff.job_title.trim() }}</p>
            </td>
            <td v-if="columnVisible('branch')" class="border-b border-border/55 px-4 py-3.5">
              <p class="font-medium text-foreground">{{ staff.branch?.name ?? 'Toàn hệ thống' }}</p>
              <p v-if="staff.branch?.code" class="mt-0.5 text-caption text-muted-foreground">{{ staff.branch.code }}</p>
            </td>
            <td v-if="columnVisible('contact')" class="border-b border-border/55 px-4 py-3.5">
              <p class="truncate text-foreground">{{ staff.email || '—' }}</p>
              <p class="mt-0.5 text-caption text-muted-foreground">{{ staff.phone || '—' }}</p>
            </td>
            <td v-if="columnVisible('status')" class="border-b border-border/55 px-4 py-3.5">
              <span data-testid="staff-status" class="inline-flex items-center gap-2 text-caption font-medium" :class="staff.status === 'working' ? 'text-emerald-800' : 'text-rose-700'">
                <span data-testid="staff-status-dot" class="size-1.5 shrink-0 rounded-full" :class="staff.status === 'working' ? 'bg-emerald-500' : 'bg-rose-500'" aria-hidden="true"></span>
                {{ staff.status_label }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="rows.length" ref="infiniteSentinel" data-testid="staff-infinite-sentinel" class="flex min-h-12 items-center justify-center px-4 text-caption text-muted-foreground">
        <span v-if="staffQuery.isFetchingNextPage.value">Đang tải thêm nhân viên…</span>
        <span v-else-if="staffQuery.hasNextPage.value">Cuộn để xem thêm</span>
        <span v-else>Đã hiển thị tất cả {{ total.toLocaleString('vi-VN') }} nhân viên</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.staff-toolbar,
.staff-table-shell { border: 1px solid rgba(16, 28, 19, 0.045); }
.staff-toolbar { border-radius: 1rem; background: color-mix(in srgb, var(--surface) 92%, transparent); box-shadow: 0 6px 24px rgba(16, 28, 19, 0.035); }
.staff-search { border: 1px solid rgba(16, 28, 19, 0.055); box-shadow: 0 1px 2px rgba(16, 28, 19, 0.025); }
.staff-column-trigger { display: flex; height: 2.5rem; min-width: 10rem; align-items: center; gap: .625rem; border: 1px solid rgba(16, 28, 19, .055); border-radius: .75rem; background: var(--surface-subtle); padding: 0 .625rem 0 .75rem; color: var(--foreground); font-size: .8125rem; box-shadow: 0 1px 2px rgba(16, 28, 19, .025); outline: none; }
.staff-column-trigger:hover { border-color: rgba(39, 93, 70, .14); background: var(--surface); }
.staff-column-trigger:focus-visible { border-color: var(--primary-500); box-shadow: 0 0 0 3px rgba(39, 93, 70, .1); }
.staff-create-button { display: inline-flex; height: 2.5rem; align-items: center; gap: .5rem; white-space: nowrap; border-radius: .75rem; background: var(--primary-700); padding: 0 .875rem; color: white; font-size: .8125rem; font-weight: 600; box-shadow: 0 4px 12px rgba(39, 93, 70, .16); transition: background-color 150ms, transform 150ms; }
.staff-create-button:hover { background: var(--primary-800); transform: translateY(-1px); }
@media (max-width: 639px) {
  .staff-toolbar { border-radius: .875rem; padding: .5rem; }
  .staff-column-trigger, .staff-create-button { min-width: 0; flex: 1 1 auto; justify-content: center; }
}
</style>
