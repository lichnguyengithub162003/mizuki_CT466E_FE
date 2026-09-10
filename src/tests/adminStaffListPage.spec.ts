/// <reference types="node" />

import { readFileSync } from "node:fs";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { createPinia } from "pinia";
import { nextTick } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminStaffListPage from "@/pages/admin/AdminStaffListPage.vue";
import AdminStaffCreatePage from "@/pages/admin/AdminStaffCreatePage.vue";
import AdminStaffDetailPage from "@/pages/admin/AdminStaffDetailPage.vue";
import { createAppRouter } from "@/router";
import { useAuthStore } from "@/stores/auth";
import { pinia as appPinia } from "@/stores/pinia";
import type { AuthenticatedUser } from "@/types/auth";
import type { AdminStaffListRecord } from "@/types/admin";

const mocks = vi.hoisted(() => ({ getAdminList: vi.fn() }));
vi.mock("@/api/adminApi", () => ({ getAdminList: mocks.getAdminList }));

const adminUser: AuthenticatedUser = {
  id: 1,
  name: "Super Admin",
  email: "admin@example.test",
  phone: null,
  avatar: null,
  role: "super_admin",
  role_label: "Quản trị viên hệ thống",
  branch_id: null,
  email_verified_at: "2026-09-01T00:00:00Z",
  created_at: "2026-08-01T00:00:00Z",
};
const branchManager: AuthenticatedUser = {
  ...adminUser,
  id: 2,
  role: "branch_manager",
  role_label: "Quản lý chi nhánh",
  branch_id: 7,
};
const branches = [
  { id: 7, code: "MZ-NK", name: "Mizuki Ninh Kiều" },
  { id: 8, code: "MZ-CR", name: "Mizuki Cái Răng" },
];
const cloudinaryAvatar = "https://res.cloudinary.com/u4itwfv3/image/upload/f_auto/q_auto/mizuki/users/29/avatar/23e09c50-5f84-4e2b-a4c8-1ebe749363d2";
const cloudinaryRendition = "https://res.cloudinary.com/u4itwfv3/image/upload/c_fill,g_auto:faces,h_256,w_256/f_auto/q_auto/mizuki/users/29/avatar/23e09c50-5f84-4e2b-a4c8-1ebe749363d2";
const staff: AdminStaffListRecord[] = [
  {
    id: 11,
    code: "NV-00011",
    name: "Nguyễn Minh Anh",
    email: "minh.anh@mizuki.test",
    phone: "0901000011",
    avatar: cloudinaryAvatar,
    avatar_rendition_url: cloudinaryRendition,
    role: "technician",
    role_label: "Kỹ thuật viên",
    job_title: "Bác sĩ da liễu",
    branch: branches[0]!,
    status: "working",
    status_label: "Đang làm việc",
  },
  {
    id: 12,
    code: "NV-00012",
    name: "Trần Thu Hà",
    email: null,
    phone: null,
    avatar: null,
    role: "cashier",
    role_label: "Thu ngân",
    job_title: null,
    branch: null,
    status: "left",
    status_label: "Đã nghỉ việc",
  },
];

const wrappers: VueWrapper[] = [];
let intersectionCallback: IntersectionObserverCallback | undefined;

function page<T>(items: T[], currentPage = 1, lastPage = 1, total = items.length) {
  return { items: structuredClone(items), pagination: { current_page: currentPage, per_page: 30, total, last_page: lastPage } };
}
function defaultMock(module: string) {
  return Promise.resolve(module === "branches" ? page(branches) : page(staff));
}
async function mountPage(user: AuthenticatedUser = adminUser) {
  const pinia = createPinia();
  useAuthStore(pinia).$patch({ user, isInitialized: true });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/admin/staff", component: AdminStaffListPage },
      { path: "/admin/staff/create", component: AdminStaffCreatePage },
      { path: "/admin/staff/:id", component: AdminStaffDetailPage },
    ],
  });
  await router.push("/admin/staff");
  await router.isReady();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const wrapper = mount(AdminStaffListPage, {
    attachTo: document.body,
    global: { plugins: [pinia, router, [VueQueryPlugin, { queryClient }]] },
  });
  wrappers.push(wrapper);
  await flushPromises();
  return { wrapper, router };
}
async function chooseMenuOption(wrapper: VueWrapper, triggerLabel: string, optionLabel: string) {
  await wrapper.get(`button[aria-label="${triggerLabel}"]`).trigger("click");
  await nextTick();
  const option = [...document.body.querySelectorAll<HTMLButtonElement>('button[role="radio"]')]
    .find((button) => button.textContent?.includes(optionLabel));
  expect(option).toBeDefined();
  option!.click();
  await flushPromises();
}

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal("IntersectionObserver", class {
    constructor(callback: IntersectionObserverCallback) { intersectionCallback = callback; }
    observe() {} unobserve() {} disconnect() {} takeRecords() { return []; }
    root = null; rootMargin = "0px"; thresholds = [0];
  });
  vi.clearAllMocks();
  intersectionCallback = undefined;
  window.localStorage.clear();
  document.body.innerHTML = "";
  useAuthStore(appPinia).resetForTesting();
  mocks.getAdminList.mockImplementation(defaultMock);
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  document.body.innerHTML = "";
  useAuthStore(appPinia).resetForTesting();
});

describe("Admin Staff List V2", () => {
  it("registers canonical list, create, and detail routes", () => {
    const router = createAppRouter(createMemoryHistory());
    expect(router.resolve("/admin/staff").name).toBe("admin-staff");
    expect(router.resolve("/admin/staff/create").name).toBe("admin-staff-create");
    expect(router.resolve("/admin/staff/11").name).toBe("admin-staff-detail");
  });

  it("starts with one compact toolbar, the exact search copy, and no hero", async () => {
    const { wrapper } = await mountPage();
    expect(wrapper.find("h1").exists()).toBe(false);
    const search = wrapper.get('input[placeholder="Tìm theo tên, mã, email hoặc số điện thoại"]');
    expect(search.attributes("type")).toBe("text");
    expect(wrapper.find('input[type="search"]').exists()).toBe(false);
    expect(wrapper.get(".staff-toolbar").text()).toContain("Tất cả chức vụ");
    expect(wrapper.get(".staff-toolbar").text()).toContain("Tất cả chi nhánh");
    expect(wrapper.get(".staff-toolbar").text()).toContain("Tất cả trạng thái");
    expect(wrapper.get("[data-testid='create-staff']").text()).toContain("Tạo nhân viên");
  });

  it("renders only the five approved columns with normal capitalization", async () => {
    const { wrapper } = await mountPage();
    expect(wrapper.get("thead").text()).toContain("Nhân viênChức vụChi nhánhLiên hệTrạng thái");
    expect(wrapper.get("thead").classes()).not.toContain("uppercase");
    expect(wrapper.get("table").text()).not.toMatch(/Ngày tham gia|Cập nhật|Lịch làm việc|Dịch vụ|Thao tác|Xóa/);
  });

  it("renders the exact row contract, truthful role hierarchy, and fallbacks", async () => {
    const { wrapper } = await mountPage();
    expect(wrapper.findAll("[data-testid='staff-row']")).toHaveLength(2);
    expect(wrapper.text()).toContain("Bác sĩ da liễu");
    expect(wrapper.text()).toContain("Kỹ thuật viên");
    expect(wrapper.text()).toContain("Thu ngân");
    expect(wrapper.text()).toContain("Mizuki Ninh Kiều");
    expect(wrapper.text()).toContain("Toàn hệ thống");
    expect(wrapper.text()).toContain("Đang làm việc");
    expect(wrapper.text()).toContain("Đã nghỉ việc");
    expect(wrapper.findAll("[data-testid='staff-avatar-fallback']")).toHaveLength(1);
    expect(wrapper.get("[data-testid='staff-row']").text()).not.toContain("technician");

    const firstRoleCell = wrapper.findAll("[data-testid='staff-row']")[0]!.findAll("td")[1]!;
    expect(firstRoleCell.text().indexOf("Kỹ thuật viên")).toBeLessThan(firstRoleCell.text().indexOf("Bác sĩ da liễu"));
    const secondRoleCell = wrapper.findAll("[data-testid='staff-row']")[1]!.findAll("td")[1]!;
    expect(secondRoleCell.findAll("p")).toHaveLength(1);
    expect(secondRoleCell.text()).toBe("Thu ngân");
  });

  it("renders the exact Cloudinary rendition URL visibly without waiting for load", async () => {
    const { wrapper } = await mountPage();
    const image = wrapper.get("[data-testid='staff-avatar']");
    expect(image.attributes("src")).toBe(cloudinaryRendition);
    expect(image.classes()).not.toContain("invisible");
    expect(wrapper.findAll("[data-testid='staff-avatar-fallback']")).toHaveLength(1);
  });

  it("retries the original avatar once when the rendition fails", async () => {
    const { wrapper } = await mountPage();
    const rendition = wrapper.get("[data-testid='staff-avatar']");
    await rendition.trigger("error");
    const original = wrapper.get("[data-testid='staff-avatar']");
    expect(original.attributes("src")).toBe(cloudinaryAvatar);
    expect(original.classes()).not.toContain("invisible");
  });

  it("removes the img and shows initials after both avatar candidates fail", async () => {
    const { wrapper } = await mountPage();
    await wrapper.get("[data-testid='staff-avatar']").trigger("error");
    await wrapper.get("[data-testid='staff-avatar']").trigger("error");
    expect(wrapper.find("[data-testid='staff-avatar']").exists()).toBe(false);
    expect(wrapper.findAll("[data-testid='staff-avatar-fallback']")).toHaveLength(2);
  });

  it("renders initials immediately when both avatar URLs are null", async () => {
    const { wrapper } = await mountPage();
    const secondRow = wrapper.findAll("[data-testid='staff-row']")[1]!;
    expect(secondRow.find("[data-testid='staff-avatar']").exists()).toBe(false);
    expect(secondRow.get("[data-testid='staff-avatar-fallback']").text()).toBe("TH");
  });

  it("isolates avatar failures between staff rows", async () => {
    const other = {
      ...staff[0]!,
      id: 13,
      code: "NV-00013",
      name: "Lê Minh Tú",
      avatar: "/storage/avatars/minh-tu.webp",
      avatar_rendition_url: "/storage/avatars/minh-tu-square.webp",
    };
    mocks.getAdminList.mockImplementation((module: string) =>
      Promise.resolve(module === "branches" ? page(branches) : page([staff[0]!, other])),
    );
    const { wrapper } = await mountPage();
    const rows = wrapper.findAll("[data-testid='staff-row']");
    await rows[0]!.get("[data-testid='staff-avatar']").trigger("error");
    await rows[0]!.get("[data-testid='staff-avatar']").trigger("error");
    expect(rows[0]!.find("[data-testid='staff-avatar']").exists()).toBe(false);
    expect(rows[0]!.find("[data-testid='staff-avatar-fallback']").exists()).toBe(true);
    expect(rows[1]!.get("[data-testid='staff-avatar']").attributes("src")).toBe("/storage/avatars/minh-tu-square.webp");
  });

  it("retries the rendition normally when fresh API data is fetched", async () => {
    const { wrapper } = await mountPage();
    await wrapper.get("[data-testid='staff-avatar']").trigger("error");
    await wrapper.get("[data-testid='staff-avatar']").trigger("error");
    expect(wrapper.find("[data-testid='staff-avatar']").exists()).toBe(false);

    await chooseMenuOption(wrapper, "Lọc trạng thái nhân viên", "Đang làm việc");
    expect(wrapper.get("[data-testid='staff-avatar']").attributes("src")).toBe(cloudinaryRendition);
  });

  it("renders understated dot and text statuses instead of pill badges", async () => {
    const { wrapper } = await mountPage();
    const statuses = wrapper.findAll("[data-testid='staff-status']");
    const dots = wrapper.findAll("[data-testid='staff-status-dot']");
    expect(statuses[0]!.text()).toBe("Đang làm việc");
    expect(statuses[0]!.classes()).toContain("text-emerald-800");
    expect(statuses[1]!.text()).toBe("Đã nghỉ việc");
    expect(statuses[1]!.classes()).toContain("text-rose-700");
    expect(statuses.every((status) => !status.classes().includes("rounded-full"))).toBe(true);
    expect(statuses.every((status) => !status.classes().some((name) => name.startsWith("bg-")))).toBe(true);
    expect(dots[0]!.classes()).toContain("bg-emerald-500");
    expect(dots[1]!.classes()).toContain("bg-rose-500");
  });

  it("debounces backend search using the staff keyword convention", async () => {
    vi.useFakeTimers();
    const { wrapper } = await mountPage();
    await wrapper.get('input[type="text"]').setValue("  NV-00011  ");
    expect(mocks.getAdminList).not.toHaveBeenCalledWith("staff", expect.objectContaining({ keyword: "NV-00011" }));
    vi.advanceTimersByTime(310);
    await flushPromises();
    expect(mocks.getAdminList).toHaveBeenCalledWith("staff", expect.objectContaining({ keyword: "NV-00011", page: 1, per_page: 30 }));
  });

  it("composes role, status, and real branch filters as server params", async () => {
    const { wrapper } = await mountPage();
    await chooseMenuOption(wrapper, "Lọc chức vụ", "Kỹ thuật viên");
    await chooseMenuOption(wrapper, "Lọc trạng thái nhân viên", "Đã nghỉ việc");
    await chooseMenuOption(wrapper, "Lọc chi nhánh", "Mizuki Cái Răng");
    expect(mocks.getAdminList).toHaveBeenLastCalledWith("staff", expect.objectContaining({
      role: "technician", status: "left", branch_id: 8, page: 1, per_page: 30,
    }));
  });

  it("preserves staff status and translates keyword to search in the API adapter", () => {
    const source = readFileSync("src/api/adminApi.ts", "utf8");
    expect(source).toContain('module !== "branches" && module !== "staff"');
    expect(source).toMatch(/raw\.search = raw\.keyword;\s*delete raw\.keyword;/);
  });

  it("does not fetch branch options or send branch_id for branch managers", async () => {
    const { wrapper } = await mountPage(branchManager);
    expect(wrapper.find('button[aria-label="Lọc chi nhánh"]').exists()).toBe(false);
    expect(wrapper.find("[data-testid='create-staff']").exists()).toBe(true);
    expect(mocks.getAdminList.mock.calls.some(([module]) => module === "branches")).toBe(false);
    expect(mocks.getAdminList).toHaveBeenCalledWith("staff", expect.not.objectContaining({ branch_id: expect.anything() }));
  });

  it("navigates Create and row mouse/keyboard interactions to the real routes", async () => {
    const first = await mountPage();
    await first.wrapper.get("[data-testid='create-staff']").trigger("click");
    await flushPromises();
    expect(first.router.currentRoute.value.path).toBe("/admin/staff/create");

    first.wrapper.unmount();
    wrappers.splice(wrappers.indexOf(first.wrapper), 1);
    document.body.innerHTML = "";
    const second = await mountPage();
    await second.wrapper.findAll("[data-testid='staff-row']")[0]!.trigger("keydown", { key: "Enter" });
    await flushPromises();
    expect(second.router.currentRoute.value.path).toBe("/admin/staff/11");
  });

  it("copies staff code, shows feedback, resets, and never opens the row", async () => {
    vi.useFakeTimers();
    const { wrapper, router } = await mountPage();
    const button = wrapper.findAll("[data-testid='copy-staff-code']")[0]!;
    await button.trigger("click");
    await flushPromises();
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("NV-00011");
    expect(button.find("[data-testid='copy-success-icon']").exists()).toBe(true);
    expect(router.currentRoute.value.path).toBe("/admin/staff");
    vi.advanceTimersByTime(1800);
    await nextTick();
    expect(button.find("[data-testid='copy-icon']").exists()).toBe(true);
  });

  it("appends infinite pages without duplicate staff or pagination controls", async () => {
    const third = { ...staff[0]!, id: 13, code: "NV-00013", name: "Lê Minh Tú" };
    mocks.getAdminList.mockImplementation((module: string, params: { page?: number }) => {
      if (module === "branches") return Promise.resolve(page(branches));
      return Promise.resolve(params.page === 2 ? page([staff[1]!, third], 2, 2, 3) : page(staff, 1, 2, 3));
    });
    const { wrapper } = await mountPage();
    intersectionCallback?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    await flushPromises();
    expect(mocks.getAdminList).toHaveBeenCalledWith("staff", expect.objectContaining({ page: 2 }));
    expect(wrapper.findAll("[data-testid='staff-row']")).toHaveLength(3);
    expect(wrapper.text()).not.toMatch(/Trang 1\/|\bTrước\b|\bSau\b/);
    expect(wrapper.get("[data-testid='staff-infinite-sentinel']").text()).toContain("Đã hiển thị tất cả 3 nhân viên");
  });

  it("resets infinite data when filters change instead of carrying stale pages", async () => {
    const third = { ...staff[0]!, id: 13, code: "NV-00013", name: "Lê Minh Tú" };
    mocks.getAdminList.mockImplementation((module: string, params: { page?: number; status?: string }) => {
      if (module === "branches") return Promise.resolve(page(branches));
      if (params.status === "left") return Promise.resolve(page([staff[1]!]));
      return Promise.resolve(params.page === 2 ? page([third], 2, 2, 3) : page(staff, 1, 2, 3));
    });
    const { wrapper } = await mountPage();
    intersectionCallback?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    await flushPromises();
    expect(wrapper.findAll("[data-testid='staff-row']")).toHaveLength(3);
    await chooseMenuOption(wrapper, "Lọc trạng thái nhân viên", "Đã nghỉ việc");
    expect(wrapper.findAll("[data-testid='staff-row']")).toHaveLength(1);
    expect(wrapper.text()).not.toContain("Lê Minh Tú");
  });

  it("keeps Staff mandatory and persists, restores, and resets optional columns", async () => {
    localStorage.setItem("admin.staff.visibleColumns", JSON.stringify(["role", "status"]));
    const { wrapper } = await mountPage();
    expect(wrapper.get("thead").text()).toContain("Nhân viên");
    expect(wrapper.get("thead").text()).not.toContain("Liên hệ");
    await wrapper.get("[data-testid='columns-trigger']").trigger("click");
    expect(document.body.querySelector<HTMLInputElement>("[data-testid='required-staff-column'] input")!.disabled).toBe(true);
    document.body.querySelector<HTMLButtonElement>("[data-testid='reset-columns']")!.click();
    await nextTick();
    expect(wrapper.get("thead").text()).toContain("Liên hệ");
    expect(JSON.parse(localStorage.getItem("admin.staff.visibleColumns") ?? "[]")).toContain("contact");
  });

  it("renders loading, unfiltered empty, filtered empty, and error states", async () => {
    let resolveStaff!: (value: ReturnType<typeof page<AdminStaffListRecord>>) => void;
    mocks.getAdminList.mockImplementation((module: string) => module === "branches" ? Promise.resolve(page(branches)) : new Promise((resolve) => { resolveStaff = resolve; }));
    const loading = await mountPage();
    expect(loading.wrapper.find("[data-testid='staff-loading']").exists()).toBe(true);
    resolveStaff(page([]));
    await flushPromises();
    expect(loading.wrapper.get("[data-testid='staff-empty']").text()).toContain("Chưa có nhân viên");

    mocks.getAdminList.mockImplementation((module: string) =>
      Promise.resolve(module === "branches" ? page(branches) : page([])),
    );
    vi.useFakeTimers();
    await loading.wrapper.get('input[type="text"]').setValue("không tồn tại");
    vi.advanceTimersByTime(310);
    await flushPromises();
    vi.useRealTimers();
    expect(loading.wrapper.get("[data-testid='staff-empty']").text()).toContain("Không tìm thấy nhân viên phù hợp");
    expect(loading.wrapper.get("[data-testid='staff-empty']").text()).toContain("Thử thay đổi từ khóa hoặc bộ lọc.");
    expect(loading.wrapper.get("[data-testid='staff-empty']").text()).toContain("Xóa bộ lọc");

    loading.wrapper.unmount();
    wrappers.splice(wrappers.indexOf(loading.wrapper), 1);
    document.body.innerHTML = "";
    mocks.getAdminList.mockImplementation((module: string) => module === "branches" ? Promise.resolve(page(branches)) : Promise.reject(new Error("network")));
    const failed = await mountPage();
    await vi.waitFor(() => expect(failed.wrapper.find("[data-testid='staff-error']").exists()).toBe(true), { timeout: 2500 });
    expect(failed.wrapper.text()).toContain("Không thể tải danh sách nhân viên");
  });
});
