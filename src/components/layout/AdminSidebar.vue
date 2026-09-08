<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type Component,
} from "vue";
import {
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  LogOut,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  ShoppingBag,
  Sparkles,
  Users,
  UserRound,
} from "@lucide/vue";
import { RouterLink, useRouter } from "vue-router";
import AdminOrderPendingBadge from "@/components/admin/AdminOrderPendingBadge.vue";
import AdminRefundPendingBadge from "@/components/admin/AdminRefundPendingBadge.vue";
import CustomerAccountAvatar from "@/components/customer-shell/CustomerAccountAvatar.vue";
import { useAuthStore } from "@/stores/auth";
import { useBranchPreferenceStore } from "@/stores/branchPreference";
import {
  ADMIN_NAVIGATION_ITEMS,
  type AdminNavigationKey,
} from "@/types/layout/adminNavigation";
import { cn } from "@/utils/cn";

type SidebarGroupId =
  | "sales"
  | "appointments"
  | "customers"
  | "products"
  | "marketing"
  | "system";
interface SidebarGroup {
  id: SidebarGroupId;
  label: string;
  icon: Component;
  itemKeys: readonly AdminNavigationKey[];
}

const props = defineProps<{
  collapsed: boolean;
  activeKey: AdminNavigationKey;
}>();
defineEmits<{ toggle: [] }>();

const router = useRouter();
const auth = useAuthStore();
const branchStore = useBranchPreferenceStore();
const sidebarRoot = ref<HTMLElement | null>(null);
const accountMenuOpen = ref(false);
const loggingOut = ref(false);
const overviewItem = ADMIN_NAVIGATION_ITEMS.find(
  (item) => item.key === "overview",
)!;
const sidebarGroups: readonly SidebarGroup[] = [
  {
    id: "sales",
    label: "Bán hàng",
    icon: ShoppingBag,
    itemKeys: ["orders", "pos", "refunds", "shipping"],
  },
  {
    id: "appointments",
    label: "Đặt lịch",
    icon: CalendarDays,
    itemKeys: ["appointments"],
  },
  {
    id: "customers",
    label: "Khách hàng",
    icon: Users,
    itemKeys: ["customers"],
  },
  {
    id: "products",
    label: "Sản phẩm",
    icon: Package,
    itemKeys: ["products", "categories", "brands", "inventory"],
  },
  {
    id: "marketing",
    label: "Marketing",
    icon: Sparkles,
    itemKeys: ["promotions", "reviews"],
  },
  {
    id: "system",
    label: "Hệ thống",
    icon: Building2,
    itemKeys: ["branches", "staff"],
  },
];

function groupForKey(key: AdminNavigationKey): SidebarGroup | undefined {
  return sidebarGroups.find((group) => group.itemKeys.includes(key));
}
function itemsForGroup(group: SidebarGroup) {
  return group.itemKeys.flatMap((key) => {
    const item = ADMIN_NAVIGATION_ITEMS.find(
      (candidate) => candidate.key === key,
    );
    return item ? [item] : [];
  });
}

const activeGroupId = computed(() => groupForKey(props.activeKey)?.id ?? null);
const openGroupId = ref<SidebarGroupId | null>(activeGroupId.value);
watch(
  () => props.activeKey,
  () => {
    openGroupId.value = activeGroupId.value;
  },
);
watch(
  () => props.collapsed,
  (collapsed) => {
    accountMenuOpen.value = false;
    if (!collapsed) openGroupId.value = activeGroupId.value;
  },
);

const workingBranch = computed(() => {
  if (auth.user?.role === "super_admin") return null;
  const assignedBranchId = auth.user?.branch_id;
  if (assignedBranchId !== null && assignedBranchId !== undefined) {
    return (
      branchStore.branches.find((branch) => branch.id === assignedBranchId) ??
      null
    );
  }
  return null;
});
const workingBranchLabel = computed(() => {
  if (auth.user?.role === "super_admin") return "Toàn hệ thống";
  if (workingBranch.value) return workingBranch.value.name;
  return "Chưa xác định chi nhánh";
});
const displayName = computed(() => auth.user?.name?.trim() || "Quản trị viên");
const displayEmail = computed(
  () => auth.user?.email?.trim() || "Chưa có email",
);
const displayAvatar = computed(
  () => auth.user?.avatar_rendition_url ?? auth.user?.avatar ?? null,
);

function toggleGroup(groupId: SidebarGroupId): void {
  openGroupId.value = openGroupId.value === groupId ? null : groupId;
}
function isGroupOpen(groupId: SidebarGroupId): boolean {
  return groupId === openGroupId.value;
}
function toggleAccountMenu(): void {
  accountMenuOpen.value = !accountMenuOpen.value;
}
function closeFloatingMenus(): void {
  accountMenuOpen.value = false;
}
function handleDocumentPointerDown(event: PointerEvent): void {
  if (!sidebarRoot.value?.contains(event.target as Node)) closeFloatingMenus();
}
function handleDocumentKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape") closeFloatingMenus();
}
async function logout(): Promise<void> {
  if (loggingOut.value) return;
  loggingOut.value = true;
  try {
    await auth.logout();
  } finally {
    accountMenuOpen.value = false;
    loggingOut.value = false;
    await router.replace("/admin/login");
  }
}

onMounted(() => {
  document.addEventListener("pointerdown", handleDocumentPointerDown);
  document.addEventListener("keydown", handleDocumentKeydown);
});
onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", handleDocumentPointerDown);
  document.removeEventListener("keydown", handleDocumentKeydown);
});
</script>

<template>
  <aside
    ref="sidebarRoot"
    :class="
      cn(
        'hidden h-full min-h-0 shrink-0 flex-col overflow-visible rounded-[1.75rem] bg-surface/95 shadow-sm transition-[width,padding] duration-200 lg:flex',
        props.collapsed ? 'w-20 px-2.5 py-3' : 'w-72 px-4 py-4',
      )
    "
    aria-label="Thanh bên quản trị"
  >
    <header
      :class="
        cn(
          'flex shrink-0 items-center justify-between',
          props.collapsed ? 'gap-1 px-0.5' : 'px-1',
        )
      "
    >
      <RouterLink
        to="/admin/dashboard"
        class="inline-flex min-h-11 min-w-0 items-center rounded-xl text-primary-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        aria-label="MIZUKI – Tổng quan"
        title="MIZUKI – Tổng quan"
        data-testid="admin-wordmark"
      >
        <span class="admin-wordmark customer-wordmark leading-none">{{
          props.collapsed ? "M" : "MIZUKI"
        }}</span>
      </RouterLink>
      <button
        type="button"
        :class="
          cn(
            'grid shrink-0 place-items-center rounded-xl bg-surface-subtle/60 text-muted-foreground/80 ring-1 ring-black/[0.04] transition-colors hover:bg-primary-50 hover:text-primary-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
            props.collapsed ? 'size-9' : 'size-10',
          )
        "
        :aria-label="
          props.collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'
        "
        :aria-expanded="!props.collapsed"
        @click="$emit('toggle')"
      >
        <PanelLeftOpen
          v-if="props.collapsed"
          class="size-3.5"
          aria-hidden="true"
        />
        <PanelLeftClose v-else class="size-3.5" aria-hidden="true" />
      </button>
    </header>

    <div class="mt-3 shrink-0" data-testid="working-branch-container">
      <div
        :class="
          cn(
            'w-full rounded-2xl bg-primary-50/75 text-primary-950',
            props.collapsed
              ? 'grid min-h-11 place-items-center px-1'
              : 'flex items-center gap-2.5 px-3 py-2.5',
          )
        "
        :aria-label="`Chi nhánh đang làm việc: ${workingBranchLabel}`"
        :title="props.collapsed ? workingBranchLabel : undefined"
        data-testid="working-branch"
      >
        <span
          v-if="props.collapsed"
          class="grid size-8 place-items-center rounded-xl bg-white/75 text-primary-800"
          ><Building2
            class="size-4"
            aria-hidden="true"
            data-testid="working-branch-fallback-icon"
        /></span>
        <template v-else>
          <span
            class="grid size-8 shrink-0 place-items-center rounded-xl bg-white/75 text-primary-800 shadow-xs"
            ><Building2
              class="size-4"
              aria-hidden="true"
              data-testid="working-branch-fallback-icon"
          /></span>
          <span class="min-w-0 flex-1 text-left">
            <span
              class="block text-[0.625rem] font-medium leading-4 text-muted-foreground"
              >Chi nhánh đang làm việc</span
            >
            <span class="block truncate text-body-sm font-semibold leading-5">{{
              workingBranchLabel
            }}</span>
          </span>
        </template>
      </div>
    </div>

    <div
      class="admin-sidebar-scroll mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain pb-3"
      data-testid="admin-sidebar-navigation-scroll"
    >
      <nav aria-label="Điều hướng quản trị desktop">
        <template v-if="props.collapsed">
          <div class="grid gap-1.5">
            <RouterLink
              v-for="item in ADMIN_NAVIGATION_ITEMS"
              :key="item.key"
              :to="item.to"
              :aria-label="item.label"
              :title="item.label"
              :aria-current="props.activeKey === item.key ? 'page' : undefined"
              :class="
                cn(
                  'relative grid min-h-11 place-items-center rounded-[0.9rem] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                  props.activeKey === item.key
                    ? 'bg-primary-700 text-white shadow-sm'
                    : 'text-muted-foreground hover:bg-primary-50 hover:text-primary-900',
                )
              "
            >
              <component :is="item.icon" class="size-4" aria-hidden="true" />
              <AdminOrderPendingBadge v-if="item.key === 'orders'" compact />
              <AdminRefundPendingBadge v-if="item.key === 'refunds'" compact />
            </RouterLink>
          </div>
        </template>

        <template v-else>
          <RouterLink
            :to="overviewItem.to"
            :aria-current="
              props.activeKey === overviewItem.key ? 'page' : undefined
            "
            :class="
              cn(
                'mb-2 flex min-h-11 items-center gap-3 rounded-2xl px-3.5 text-body-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                props.activeKey === overviewItem.key
                  ? 'bg-primary-700 font-semibold text-white shadow-sm'
                  : 'font-medium text-foreground hover:bg-primary-50',
              )
            "
          >
            <component
              :is="overviewItem.icon"
              class="size-4"
              aria-hidden="true"
            /><span>{{ overviewItem.label }}</span>
          </RouterLink>

          <div class="grid gap-3">
            <section
              v-for="group in sidebarGroups"
              :key="group.id"
              class="rounded-2xl bg-surface-subtle/65 p-1"
              :data-testid="`admin-nav-group-${group.id}`"
            >
              <button
                type="button"
                :class="
                  cn(
                    'flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 text-left text-body-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring',
                    activeGroupId === group.id
                      ? 'bg-primary-50/90 text-primary-950 hover:bg-primary-100/80'
                      : 'bg-surface/65 text-foreground hover:bg-primary-50/80',
                  )
                "
                :aria-expanded="isGroupOpen(group.id)"
                :aria-controls="`admin-nav-group-panel-${group.id}`"
                @click="toggleGroup(group.id)"
              >
                <component
                  :is="group.icon"
                  class="size-4 shrink-0 text-primary-800"
                  aria-hidden="true"
                />
                <span class="min-w-0 flex-1 truncate">{{ group.label }}</span>
                <ChevronDown
                  :class="
                    cn(
                      'size-3.5 shrink-0 text-muted-foreground transition-transform duration-200',
                      isGroupOpen(group.id) && 'rotate-180',
                    )
                  "
                  aria-hidden="true"
                />
              </button>
              <div
                v-show="isGroupOpen(group.id)"
                :id="`admin-nav-group-panel-${group.id}`"
                class="grid gap-0.5 pb-1 pt-1.5"
                data-testid="admin-nav-child-list"
              >
                <RouterLink
                  v-for="item in itemsForGroup(group)"
                  :key="item.key"
                  :to="item.to"
                  :aria-current="
                    props.activeKey === item.key ? 'page' : undefined
                  "
                  :class="
                    cn(
                      'ml-3 mr-1 flex min-h-10 items-center gap-2.5 rounded-xl px-3 text-body-sm font-normal transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                      props.activeKey === item.key
                        ? 'bg-primary-700 font-semibold text-white shadow-sm'
                        : 'text-muted-foreground hover:bg-primary-100/70 hover:text-primary-900',
                    )
                  "
                >
                  <component
                    :is="item.icon"
                    class="size-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
                  <AdminOrderPendingBadge v-if="item.key === 'orders'" />
                  <AdminRefundPendingBadge v-if="item.key === 'refunds'" />
                </RouterLink>
              </div>
            </section>
          </div>
        </template>
      </nav>
    </div>

    <footer class="relative shrink-0 pt-2" data-testid="admin-account-footer">
      <div
        v-if="accountMenuOpen"
        class="account-popup absolute z-30 rounded-2xl bg-white p-2 shadow-[0_12px_40px_rgba(15,23,42,0.14)] ring-1 ring-black/[0.05]"
        role="menu"
        aria-label="Menu tài khoản quản trị"
        data-testid="admin-account-menu"
      >
        <button
          type="button"
          class="flex w-full cursor-not-allowed items-center gap-2.5 rounded-xl px-3 py-2.5 text-body-sm font-medium text-muted-foreground opacity-60"
          disabled
          role="menuitem"
          title="Hồ sơ cá nhân chưa khả dụng"
        >
          <UserRound class="size-4 shrink-0" aria-hidden="true" />
          <span>Hồ sơ cá nhân</span>
        </button>
        <div
          class="mx-2 my-1 h-px bg-border/50"
          role="separator"
          aria-hidden="true"
        ></div>
        <button
          type="button"
          class="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-body-sm font-medium text-rose-600 transition-colors duration-150 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-60"
          :disabled="loggingOut"
          role="menuitem"
          @click="logout"
        >
          <LogOut class="size-4" aria-hidden="true" /><span>{{
            loggingOut ? "Đang đăng xuất…" : "Đăng xuất"
          }}</span>
        </button>
      </div>
      <button
        type="button"
        :class="
          cn(
            'flex w-full items-center rounded-2xl bg-surface-subtle/90 text-left transition-colors hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
            props.collapsed
              ? 'min-h-12 justify-center p-1'
              : 'min-h-[3.75rem] gap-3 px-2.5 py-2',
          )
        "
        aria-haspopup="menu"
        :aria-expanded="accountMenuOpen"
        :aria-label="
          props.collapsed ? `Tài khoản: ${displayName}` : 'Mở menu tài khoản'
        "
        :title="
          props.collapsed ? `${displayName} · ${displayEmail}` : undefined
        "
        data-testid="admin-account-trigger"
        @click="toggleAccountMenu"
      >
        <CustomerAccountAvatar
          :name="displayName"
          :avatar="displayAvatar"
          size="md"
        />
        <template v-if="!props.collapsed">
          <span class="min-w-0 flex-1"
            ><span
              class="block truncate text-body-sm font-semibold text-foreground"
              >{{ displayName }}</span
            ><span
              class="mt-0.5 block truncate text-caption text-muted-foreground"
              >{{ displayEmail }}</span
            ></span
          >
          <ChevronRight
            class="size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        </template>
      </button>
    </footer>
  </aside>
</template>

<style scoped>
.admin-wordmark {
  font-size: x-large;
}
.admin-sidebar-scroll {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.admin-sidebar-scroll::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}
.account-popup {
  bottom: 0;
  left: calc(100% + 0.75rem);
  width: 14rem;
}
</style>
