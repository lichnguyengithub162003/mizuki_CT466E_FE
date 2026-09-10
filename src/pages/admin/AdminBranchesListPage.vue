<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import {
  Building2,
  Check,
  ChevronDown,
  Clipboard,
  Columns3,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  X,
} from "@lucide/vue";
import { useInfiniteQuery } from "@tanstack/vue-query";
import BasePopover from "@/components/common/BasePopover.vue";
import BaseSkeleton from "@/components/common/BaseSkeleton.vue";
import AdminOrdersFilterMenu from "@/components/admin/AdminOrdersFilterMenu.vue";
import { getAdminList } from "@/api/adminApi";
import { useAuthStore } from "@/stores/auth";
import {
  isApplicationError,
  type AdminListParams,
  type AdminRecord,
} from "@/types/admin";

interface BranchRecord extends AdminRecord {
  code: string;
  name: string;
  branch_type: "store" | "clinic" | "hybrid" | string;
  branch_type_label?: string | null;
  address?: string | null;

  status: "active" | "suspended" | "inactive";
  status_label: string;
  is_active: boolean;

  updated_at?: string | null;
  product_count?: number | null;
  service_count?: number | null;
  staff_count?: number | null;
  image_url?: string | null;
}

type ColumnKey =
  | "model"
  | "address"
  | "catalog"
  | "staff"
  | "status"
  | "updated";
type StatusFilter = "" | "active" | "suspended" | "inactive";
type ModelFilter = "" | "store" | "hybrid";

const router = useRouter();
const auth = useAuthStore();
const searchField = ref<HTMLInputElement | null>(null);
const searchInput = ref("");
const keyword = ref("");
const statusFilter = ref<StatusFilter>("");
const modelFilter = ref<ModelFilter>("");
const columnsOpen = ref(false);
const copiedId = ref<number | null>(null);
const infiniteSentinel = ref<HTMLElement | null>(null);
const imageFailedIds = reactive(new Set<number>());
let searchTimer: number | undefined;
let copyTimer: number | undefined;
let infiniteObserver: IntersectionObserver | undefined;

const defaultColumns: ColumnKey[] = [
  "model",
  "address",
  "catalog",
  "staff",
  "status",
  "updated",
];
const columnDefinitions: Array<{ key: ColumnKey; label: string }> = [
  { key: "model", label: "Mô hình" },
  { key: "address", label: "Địa chỉ" },
  { key: "catalog", label: "Danh mục hỗ trợ" },
  { key: "staff", label: "Nhân sự" },
  { key: "status", label: "Trạng thái" },
  { key: "updated", label: "Cập nhật" },
];

function loadColumns(): Set<ColumnKey> {
  try {
    const stored = JSON.parse(
      localStorage.getItem("admin.branches.visibleColumns") ?? "null",
    );
    if (Array.isArray(stored))
      return new Set(
        stored.filter((value): value is ColumnKey =>
          defaultColumns.includes(value),
        ),
      );
  } catch {
    /* invalid preferences fall back safely */
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
watch(visibleColumns, () =>
  localStorage.setItem(
    "admin.branches.visibleColumns",
    JSON.stringify([...visibleColumns]),
  ),
);
watch(infiniteSentinel, (element) => {
  infiniteObserver?.disconnect();
  if (!element || typeof IntersectionObserver === "undefined") return;
  infiniteObserver = new IntersectionObserver(
    ([entry]) => {
      if (
        entry?.isIntersecting &&
        branchesQuery.hasNextPage.value &&
        !branchesQuery.isFetchingNextPage.value
      ) {
        void branchesQuery.fetchNextPage();
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

const params = computed<AdminListParams>(() => ({
  status: statusFilter.value || undefined,
  per_page: 100,
}));

const branchesQuery = useInfiniteQuery({
  queryKey: computed(() => ["admin", "branches", "list", params.value]),
  queryFn: ({ pageParam }) =>
    getAdminList<BranchRecord>("branches", {
      ...params.value,
      page: pageParam,
    }),
  initialPageParam: 1,
  getNextPageParam: (lastPage) =>
    lastPage.pagination.current_page < lastPage.pagination.last_page
      ? lastPage.pagination.current_page + 1
      : undefined,
  retry: 1,
});

const loadedBranches = computed(() => {
  const unique = new Map<number, BranchRecord>();
  for (const page of branchesQuery.data.value?.pages ?? []) {
    for (const branch of page.items) unique.set(branch.id, branch);
  }
  return [...unique.values()];
});
function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("đ", "d")
    .replaceAll("Đ", "D")
    .toLocaleLowerCase("vi-VN");
}
const rows = computed(() => {
  const needle = normalizeSearch(keyword.value);
  return loadedBranches.value.filter((branch) => {
    if (modelFilter.value && branch.branch_type !== modelFilter.value)
      return false;
    if (!needle) return true;
    return [branch.name, branch.code, branch.address ?? ""].some((value) =>
      normalizeSearch(value).includes(needle),
    );
  });
});
const hasFilters = computed(() =>
  Boolean(keyword.value || statusFilter.value || modelFilter.value),
);
const errorKind = computed(() =>
  isApplicationError(branchesQuery.error.value)
    ? branchesQuery.error.value.kind
    : "unknown",
);

let completeLoadSequence = 0;
async function loadCompleteDataset(): Promise<void> {
  const sequence = ++completeLoadSequence;
  while (sequence === completeLoadSequence && branchesQuery.hasNextPage.value)
    await branchesQuery.fetchNextPage();
}
watch([keyword, modelFilter, statusFilter], async ([search, model]) => {
  completeLoadSequence++;
  if (search || model) {
    await nextTick();
    void loadCompleteDataset();
  }
});

const statusOptions = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "active", label: "Đang hoạt động" },
  { value: "suspended", label: "Tạm ngưng" },
  { value: "inactive", label: "Ngừng hoạt động" },
];

const modelOptions = [
  { value: "", label: "Tất cả mô hình" },
  { value: "store", label: "Bán hàng" },
  { value: "hybrid", label: "Bán hàng + Clinic" },
];

function columnVisible(key: ColumnKey): boolean {
  return visibleColumns.has(key);
}
function toggleColumn(key: ColumnKey): void {
  visibleColumns.has(key)
    ? visibleColumns.delete(key)
    : visibleColumns.add(key);
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
function setStatusFilter(value: string): void {
  if (
    value === "" ||
    value === "active" ||
    value === "suspended" ||
    value === "inactive"
  ) {
    statusFilter.value = value;
  }
}
function clearFilters(): void {
  clearSearch();
  statusFilter.value = "";
  modelFilter.value = "";
}
function openBranch(id: number): void {
  void router.push(`/admin/branches/${id}`);
}
function handleRowKeydown(event: KeyboardEvent, id: number): void {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    openBranch(id);
  }
}
async function copyCode(branch: BranchRecord, event: Event): Promise<void> {
  event.stopPropagation();
  try {
    await navigator.clipboard.writeText(branch.code);
    copiedId.value = branch.id;
    window.clearTimeout(copyTimer);
    copyTimer = window.setTimeout(() => {
      copiedId.value = null;
    }, 1700);
  } catch {
    /* clipboard denial leaves the control unchanged */
  }
}
function modelLabel(branch: BranchRecord): string {
  if (branch.branch_type === "store") return "Bán hàng";
  if (branch.branch_type === "hybrid") return "Bán hàng + Clinic";
  if (branch.branch_type === "clinic") return "Clinic";
  return branch.branch_type_label || "—";
}
function supportsClinic(branch: BranchRecord): boolean {
  return branch.branch_type === "hybrid" || branch.branch_type === "clinic";
}
function dateTime(value?: string | null): string {
  return value
    ? new Date(value).toLocaleString("vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "—";
}
function markImageFailed(id: number): void {
  imageFailedIds.add(id);
}
</script>

<template>
  <section
    class="branches-v2 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
    aria-label="Quản lý chi nhánh"
    data-testid="admin-branches-list"
  >
    <div class="branches-toolbar mb-3 shrink-0 p-2.5">
      <div class="flex flex-wrap items-center gap-2">
        <label class="relative min-w-60 flex-[1_1_22rem]">
          <span class="sr-only">Tìm kiếm chi nhánh</span>
          <Search
            class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            ref="searchField"
            v-model="searchInput"
            type="search"
            placeholder="Tìm theo tên chi nhánh"
            class="branches-search h-10 w-full rounded-xl bg-surface-subtle pl-9 pr-9 text-[0.8125rem] outline-none ring-1 ring-inset ring-transparent transition focus:bg-surface focus:ring-primary-500"
          />
          <button
            v-if="searchInput"
            type="button"
            aria-label="Xóa tìm kiếm"
            class="absolute right-1.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:bg-primary-50 hover:text-primary-800"
            @click="clearSearch"
          >
            <X class="size-3.5" />
          </button>
        </label>
        <AdminOrdersFilterMenu
          :model-value="statusFilter"
          label="Lọc trạng thái chi nhánh"
          :options="statusOptions"
          @update:model-value="setStatusFilter"
        />
        <AdminOrdersFilterMenu
          v-model="modelFilter"
          label="Lọc mô hình hoạt động"
          :options="modelOptions"
        />
        <BasePopover
          v-model="columnsOpen"
          align="end"
          :side-offset="6"
          class="w-60 p-2"
        >
          <template #trigger>
            <button
              type="button"
              class="branches-column-trigger"
              aria-label="Điều chỉnh cột"
              :aria-expanded="columnsOpen"
              data-testid="columns-trigger"
            >
              <Columns3 class="size-4 shrink-0" /><span
                class="min-w-0 flex-1 truncate text-left"
                >Điều chỉnh cột</span
              ><ChevronDown
                class="size-3.5 shrink-0 text-muted-foreground transition-transform"
                :class="columnsOpen && 'rotate-180'"
              />
            </button>
          </template>
          <div data-testid="columns-menu">
            <p
              class="px-2 py-1 text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground"
            >
              Cột hiển thị
            </p>
            <div
              class="flex items-center gap-3 rounded-lg px-2 py-2 text-[0.8125rem] text-muted-foreground"
              data-testid="required-branch-column"
            >
              <input
                type="checkbox"
                checked
                disabled
                class="accent-primary-700"
              />Chi nhánh
            </div>
            <label
              v-for="column in columnDefinitions"
              :key="column.key"
              class="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-[0.8125rem] hover:bg-surface-subtle"
            >
              <input
                type="checkbox"
                :checked="visibleColumns.has(column.key)"
                class="accent-primary-700"
                :data-testid="`column-${column.key}`"
                @change="toggleColumn(column.key)"
              />{{ column.label }}
            </label>
            <button
              type="button"
              class="mt-1 flex w-full items-center gap-2 border-t border-border/70 px-2 pt-2 text-left text-[0.75rem] font-medium text-primary-700 hover:text-primary-900"
              data-testid="reset-columns"
              @click="resetColumns"
            >
              <RotateCcw class="size-3.5" />Khôi phục mặc định
            </button>
          </div>
        </BasePopover>
        <button
          v-if="auth.role === 'super_admin'"
          type="button"
          class="branches-create-button ml-auto"
          data-testid="create-branch"
          @click="router.push('/admin/branches/create')"
        >
          <Plus class="size-4" aria-hidden="true" /> Tạo chi nhánh mới
        </button>
      </div>
    </div>

    <div
      v-if="branchesQuery.isPending.value && !branchesQuery.data.value"
      class="branches-shell min-h-0 flex-1"
      data-testid="branches-loading"
    >
      <div class="h-11 bg-surface-subtle" />
      <div
        v-for="index in 7"
        :key="index"
        class="flex h-16 items-center gap-5 border-t border-border/50 px-5"
      >
        <BaseSkeleton class="h-3 w-36" /><BaseSkeleton
          class="h-3 w-24"
        /><BaseSkeleton class="h-3 flex-1" /><BaseSkeleton class="h-3 w-20" />
      </div>
    </div>
    <div
      v-else-if="branchesQuery.isError.value && !loadedBranches.length"
      class="branches-shell grid min-h-72 place-items-center p-6 text-center"
      data-testid="branches-error"
    >
      <div>
        <span
          class="mx-auto grid size-11 place-items-center rounded-2xl bg-rose-50 text-rose-700"
          ><RefreshCw class="size-5"
        /></span>
        <h2 class="mt-3 font-semibold">Không thể tải danh sách chi nhánh</h2>
        <p class="mt-1 text-[0.8125rem] text-muted-foreground">
          {{
            errorKind === "forbidden"
              ? "Bạn không có quyền xem dữ liệu này."
              : "Vui lòng thử lại sau ít phút."
          }}
        </p>
        <button
          type="button"
          class="mt-4 text-[0.8125rem] font-medium text-primary-700"
          @click="branchesQuery.refetch()"
        >
          Thử lại
        </button>
      </div>
    </div>
    <div
      v-else-if="!rows.length"
      class="branches-shell grid min-h-72 place-items-center p-6 text-center"
      data-testid="branches-empty"
    >
      <div>
        <span
          class="mx-auto grid size-11 place-items-center rounded-2xl bg-primary-50 text-primary-700"
          ><Building2 class="size-5"
        /></span>
        <h2 class="mt-3 font-semibold">
          {{
            hasFilters
              ? "Không tìm thấy chi nhánh phù hợp"
              : "Chưa có chi nhánh"
          }}
        </h2>
        <p class="mt-1 text-[0.8125rem] text-muted-foreground">
          {{
            hasFilters
              ? "Thử thay đổi từ khóa hoặc bộ lọc."
              : "Danh sách chi nhánh sẽ xuất hiện tại đây."
          }}
        </p>
        <button
          v-if="hasFilters"
          type="button"
          class="mt-4 text-[0.8125rem] font-medium text-primary-700"
          @click="clearFilters"
        >
          Xóa bộ lọc
        </button>
      </div>
    </div>

    <div
      v-else
      class="branches-shell flex min-h-0 flex-1 flex-col"
      data-testid="branches-table-shell"
    >
      <div
        class="min-h-0 flex-1 overflow-auto overscroll-contain"
        data-testid="branches-table-scroll"
      >
        <table
          class="w-full min-w-5xl table-fixed text-left text-[0.8125rem]"
        >
          <thead
            class="sticky top-0 z-10 bg-[#f8faf7]/95 text-[0.75rem] font-medium text-[#657269] backdrop-blur"
          >
            <tr>
              <th class="w-60 px-4 py-3 font-medium">Chi nhánh</th>
              <th v-if="columnVisible('model')" class="w-40 px-4 py-3 font-medium">
                Mô hình
              </th>
              <th v-if="columnVisible('address')" class="w-[16rem] px-4 py-3">
                Địa chỉ
              </th>
              <th v-if="columnVisible('catalog')" class="w-40 px-4 py-3 font-medium">
                Danh mục hỗ trợ
              </th>
              <th v-if="columnVisible('staff')" class="w-28 px-4 py-3 font-medium">
                Nhân sự
              </th>
              <th v-if="columnVisible('status')" class="w-40 px-4 py-3 font-medium">
                Trạng thái
              </th>
              <th v-if="columnVisible('updated')" class="w-40 px-4 py-3 font-medium">
                Cập nhật
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="branch in rows"
              :key="branch.id"
              tabindex="0"
              class="branch-row cursor-pointer outline-none transition-colors"
              data-testid="branch-row"
              @click="openBranch(branch.id)"
              @keydown="handleRowKeydown($event, branch.id)"
            >
              <td class="border-b border-border/55 px-4 py-3">
                <div class="flex min-w-0 items-start gap-2.5">
                  <span
                    class="mt-0.5 grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-primary-50 text-primary-700 ring-1 ring-black/[0.035]"
                    ><img
                      v-if="branch.image_url && !imageFailedIds.has(branch.id)"
                      :src="branch.image_url"
                      :alt="`Hình ảnh ${branch.name}`"
                      class="size-full object-cover"
                      loading="lazy"
                      decoding="async"
                      data-testid="branch-image"
                      @error="markImageFailed(branch.id)" /><Building2
                      v-else
                      class="size-4"
                      data-testid="branch-image-fallback"
                  /></span>
                  <div class="min-w-0">
                    <button
                      type="button"
                      class="max-w-44 truncate text-left font-semibold text-[#25342b] hover:text-primary-700"
                      :title="branch.name"
                      @click.stop="openBranch(branch.id)"
                    >
                      {{ branch.name }}
                    </button>
                    <div class="mt-0.5 flex items-center gap-1">
                      <span
                        class="font-mono text-[0.6875rem] text-muted-foreground"
                        >{{ branch.code }}</span
                      ><button
                        type="button"
                        :aria-label="
                          copiedId === branch.id
                            ? 'Đã sao chép mã chi nhánh'
                            : 'Sao chép mã chi nhánh'
                        "
                        class="grid size-6 place-items-center rounded-md text-muted-foreground transition hover:bg-primary-50 hover:text-primary-700"
                        data-testid="copy-branch-code"
                        @click="copyCode(branch, $event)"
                      >
                        <Check
                          v-if="copiedId === branch.id"
                          class="size-3.5 text-emerald-600"
                          data-testid="copy-success-icon"
                        /><Clipboard
                          v-else
                          class="size-3.5"
                          data-testid="copy-icon"
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </td>
              <td
                v-if="columnVisible('model')"
                class="border-b border-border/55 px-4 py-3"
              >
                <span
                  class="inline-flex rounded-full bg-[#f1f4ef] px-2.5 py-1 text-[0.6875rem] font-medium text-[#58675e]"
                  >{{ modelLabel(branch) }}</span
                >
              </td>
              <td
                v-if="columnVisible('address')"
                class="border-b border-border/55 px-4 py-3"
              >
                <p
                  class="line-clamp-2 max-w-56 leading-5 text-[#56645c]"
                  :title="branch.address || 'Chưa cập nhật địa chỉ'"
                  :aria-label="branch.address || 'Chưa cập nhật địa chỉ'"
                >
                  {{ branch.address || "—" }}
                </p>
              </td>
              <td
                v-if="columnVisible('catalog')"
                class="border-b border-border/55 px-4 py-3"
              >
                <div class="grid gap-0.5 text-[0.75rem] text-[#647169]">
                  <span>{{
                    branch.product_count != null
                      ? `${branch.product_count.toLocaleString("vi-VN")} mặt hàng`
                      : "—"
                  }}</span
                  ><span v-if="supportsClinic(branch)">{{
                    branch.service_count != null
                      ? `${branch.service_count.toLocaleString("vi-VN")} dịch vụ`
                      : "—"
                  }}</span>
                </div>
              </td>
              <td
                v-if="columnVisible('staff')"
                class="border-b border-border/55 px-4 py-3 tabular-nums text-[#56645c]"
              >
                {{
                  branch.staff_count != null
                    ? branch.staff_count.toLocaleString("vi-VN")
                    : "—"
                }}
              </td>
              <td
                v-if="columnVisible('status')"
                class="border-b border-border/55 px-4 py-3"
              >
                <span
                  :class="[
                    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6875rem] font-medium',
                    branch.status === 'active'
                      ? 'bg-emerald-50 text-emerald-800'
                      : branch.status === 'suspended'
                        ? 'bg-amber-50 text-amber-800'
                        : branch.status === 'inactive'
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-slate-100 text-slate-700',
                  ]"
                >
                  <span
                    :class="[
                      'size-1.5 rounded-full',
                      branch.status === 'active'
                        ? 'bg-emerald-500'
                        : branch.status === 'suspended'
                          ? 'bg-amber-500'
                          : branch.status === 'inactive'
                            ? 'bg-rose-400'
                            : 'bg-slate-400',
                    ]"
                  ></span>

                  {{ branch.status_label || "—" }}
                </span>
              </td>
              <td
                v-if="columnVisible('updated')"
                class="border-b border-border/55 px-4 py-3 whitespace-nowrap tabular-nums text-muted-foreground"
              >
                {{ dateTime(branch.updated_at) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div
        ref="infiniteSentinel"
        class="flex min-h-12 items-center justify-center border-t border-border/60 px-4 py-2 text-[0.75rem] text-muted-foreground"
        data-testid="branches-infinite-sentinel"
        aria-live="polite"
      >
        <span
          v-if="branchesQuery.isFetchingNextPage.value"
          class="inline-flex items-center gap-2"
          ><RefreshCw class="size-3.5 animate-spin" />Đang tải thêm chi
          nhánh…</span
        >
        <span v-else-if="branchesQuery.hasNextPage.value"
          >Cuộn để tải thêm chi nhánh</span
        >
        <span v-else
          >Đã hiển thị tất cả
          {{ loadedBranches.length.toLocaleString("vi-VN") }} chi nhánh</span
        >
      </div>
    </div>
  </section>
</template>

<style scoped>
.branches-toolbar,
.branches-shell {
  border-radius: 1rem;
  background: var(--surface);
  box-shadow:
    0 1px 2px rgb(16 28 19 / 0.025),
    0 8px 24px rgb(16 28 19 / 0.04),
    0 0 0 1px rgb(16 28 19 / 0.04);
}
.branches-shell {
  overflow: hidden;
  isolation: isolate;
}
.branches-create-button {
  display: inline-flex;
  min-height: 2.5rem;
  align-items: center;
  gap: 0.45rem;
  border-radius: 0.75rem;
  padding-inline: 0.9rem;
  color: white;
  background: #2f684b;
  font-size: 0.8125rem;
  font-weight: 600;
  box-shadow: 0 5px 14px rgb(34 91 62 / 0.16);
  transition:
    background-color 150ms,
    transform 150ms,
    box-shadow 150ms;
}
.branches-create-button:hover {
  background: #285b41;
  box-shadow: 0 7px 18px rgb(34 91 62 / 0.2);
  transform: translateY(-1px);
}
.branches-create-button:focus-visible {
  outline: 2px solid rgb(47 104 75 / 0.3);
  outline-offset: 2px;
}
.branches-search::-webkit-search-cancel-button {
  display: none;
  appearance: none;
}
.branches-column-trigger {
  display: flex;
  height: 2.5rem;
  min-width: 10.75rem;
  align-items: center;
  gap: 0.625rem;
  border: 1px solid rgb(16 28 19 / 0.055);
  border-radius: 0.75rem;
  padding-inline: 0.75rem;
  background: var(--surface-subtle);
  color: var(--foreground);
  font-size: 0.8125rem;
  box-shadow: 0 1px 2px rgb(16 28 19 / 0.025);
  outline: none;
  transition:
    background-color 150ms,
    border-color 150ms,
    box-shadow 150ms;
}
.branches-column-trigger:hover {
  border-color: rgb(39 93 70 / 0.14);
  background: var(--surface);
}
.branches-column-trigger:focus-visible {
  border-color: var(--primary-500);
  box-shadow: 0 0 0 3px rgb(39 93 70 / 0.1);
}
.branch-row:hover {
  background: rgb(239 246 240 / 0.55);
}
.branch-row:focus-visible {
  box-shadow: inset 3px 0 #347a57;
  background: rgb(239 246 240 / 0.68);
}
@media (prefers-reduced-motion: reduce) {
  .branches-v2 *,
  .branches-v2 *::before,
  .branches-v2 *::after {
    transition-duration: 1ms !important;
    animation-duration: 1ms !important;
  }
}
</style>
