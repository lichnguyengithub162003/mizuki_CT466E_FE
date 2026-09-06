import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminRefundsListPage from "@/pages/admin/AdminRefundsListPage.vue";
import { useAuthStore } from "@/stores/auth";

const mocks = vi.hoisted(() => ({
  getAdminList: vi.fn(),
  getCurrentUser: vi.fn(),
  writeText: vi.fn(),
}));
vi.mock("@/api/adminApi", async (original) => ({
  ...(await original()),
  getAdminList: mocks.getAdminList,
}));
vi.mock("@/api/auth/authApi", () => ({
  getCurrentUser: mocks.getCurrentUser,
  login: vi.fn(),
  staffLogin: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
}));

const refund = (id: number, overrides = {}) => ({
  id,
  refund_number: `RF-V2-${id}`,
  status: "requested",
  status_label: "Chờ duyệt",
  next_action: null,
  destination: "pending",
  settlement: {
    method: "wallet",
    method_label: "Ví Mizuki",
    destination: "wallet",
    destination_label: "Ví Mizuki",
    status: "pending",
    status_label: "Chờ hoàn tiền",
    reference: null,
  },
  order: {
    id: 100 + id,
    order_number: `MZ-ORDER-${id}`,
    status: "refund_requested",
    total_amount: 450_000,
  },
  customer: {
    id: 20 + id,
    name: `Khách hoàn ${id}`,
    email: `refund${id}@example.test`,
    phone: `090000000${id}`,
  },
  branch: { id: 1, name: "Mizuki Ninh Kiều" },
  requested_amount: 350_000,
  approved_amount: null,
  reason_type: "product_damaged",
  reason_type_label: "Sản phẩm bị hư hỏng",
  reason: "Bao bì hư hỏng khi nhận hàng",
  image_url: `/storage/catalog/products/refund-${id}.webp`,
  item_count: 1,
  created_at: "2026-09-01T09:15:00Z",
  updated_at: "2026-09-02T10:30:00Z",
  return: {
    required: false,
    status: "not_required",
    status_label: "Không cần trả",
    inspection_status: null,
    inspection_label: null,
    received_at: null,
    restocked_at: null,
    allowed_actions: [],
  },
  ...overrides,
});

const wrappers: Array<ReturnType<typeof mount>> = [];
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => {
    try {
      wrapper.unmount();
    } catch {
      /* already torn down after a render failure */
    }
  });
  vi.useRealTimers();
});

async function mountPage() {
  const pinia = createPinia();
  mocks.getCurrentUser.mockResolvedValue({
    id: 1,
    name: "QA Admin",
    email: "qa.admin@mizuki.local",
    role: "super_admin",
    role_label: "Admin",
    branch_id: null,
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/admin/refunds", component: AdminRefundsListPage },
      {
        path: "/admin/refunds/:id",
        component: { template: "<p>Refund detail</p>" },
      },
    ],
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  await useAuthStore(pinia).restoreSession();
  await router.push("/admin/refunds");
  const wrapper = mount(AdminRefundsListPage, {
    global: { plugins: [pinia, router, [VueQueryPlugin, { queryClient }]] },
  });
  wrappers.push(wrapper);
  await flushPromises();
  return { wrapper, router };
}

describe("Admin Refund List V2", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    vi.clearAllMocks();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: mocks.writeText },
    });
    mocks.writeText.mockResolvedValue(undefined);
    mocks.getAdminList.mockImplementation(
      (module: string, params: Record<string, unknown>) => {
        if (module === "branches")
          return Promise.resolve({
            items: [{ id: 1, name: "Mizuki Ninh Kiều" }],
            pagination: {
              current_page: 1,
              per_page: 100,
              total: 1,
              last_page: 1,
            },
          });
        const page = Number(params.page ?? 1);
        return Promise.resolve({
          items:
            page === 1
              ? [
                  refund(1),
                  refund(2, {
                    status: "approved",
                    status_label: "Đã duyệt",
                    approved_amount: 300_000,
                    next_action: "wallet_payout",
                    return: {
                      required: true,
                      status: "received",
                      status_label: "Đã nhận hàng",
                      inspection_status: "pending",
                      inspection_label: "Chờ kiểm tra",
                      received_at: "2026-09-02T09:00:00Z",
                      restocked_at: null,
                      allowed_actions: [
                        "return_restock",
                        "return_not_restockable",
                      ],
                    },
                  }),
                ]
              : [refund(2), refund(3)],
          pagination: {
            current_page: page,
            per_page: 40,
            total: 3,
            last_page: 2,
          },
        });
      },
    );
  });

  it("renders refund-specific columns and compact authoritative status semantics", async () => {
    const { wrapper } = await mountPage();
    const headings = wrapper.findAll("thead th").map((node) => node.text());
    expect(headings).toEqual([
      "Yêu cầu hoàn",
      "Đơn hàng",
      "Khách hàng",
      "Số tiền",
      "Lý do",
      "Trả hàng / Hoàn kho",
      "Hoàn tiền vào",
      "Trạng thái",
      "Cập nhật",
    ]);
    expect(
      wrapper.get('[data-testid="refund-status-indicator"]').classes(),
    ).toContain("whitespace-nowrap");
    expect(
      wrapper.get('[data-testid="refund-status-indicator"]').classes(),
    ).not.toContain("rounded-full");
    expect(wrapper.text()).toContain("Không cần trả hàng");
    expect(wrapper.text()).toContain("Đã nhận · Chờ kiểm tra");
    expect(wrapper.get('[data-testid="refunds-mobile-list"]').text()).toContain(
      "RF-V2-1",
    );
  });

  it("toggles all optional desktop columns with checkbox semantics while keeping the refund column and mobile cards", async () => {
    const { wrapper } = await mountPage();
    const optionalColumns = [
      "order",
      "customer",
      "amount",
      "reason",
      "return",
      "settlement",
      "status",
      "updated",
    ];

    expect(wrapper.findAll("thead th[data-column]")).toHaveLength(9);
    expect(wrapper.findAll("tbody tr[tabindex='0']")[0]!.findAll("td[data-column]")).toHaveLength(9);
    for (const column of optionalColumns) {
      expect(wrapper.find(`thead th[data-column="${column}"]`).exists()).toBe(true);
      expect(wrapper.find(`tbody td[data-column="${column}"]`).exists()).toBe(true);
    }

    await wrapper.get('button[aria-label="Chọn cột hiển thị"]').trigger("click");
    await flushPromises();
    const menu = document.body.querySelector<HTMLElement>('[aria-label="Các cột hiển thị"]')!;
    const checkboxes = [...menu.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')];
    expect(checkboxes).toHaveLength(8);
    expect(checkboxes.every((checkbox) => checkbox.checked)).toBe(true);

    const reasonCheckbox = checkboxes.find((checkbox) => checkbox.parentElement?.textContent?.includes("Lý do"))!;
    reasonCheckbox.click();
    await flushPromises();
    expect(reasonCheckbox.checked).toBe(false);
    expect(wrapper.find('thead th[data-column="reason"]').exists()).toBe(false);
    expect(wrapper.find('tbody td[data-column="reason"]').exists()).toBe(false);
    expect(wrapper.find('thead th[data-column="refund"]').exists()).toBe(true);
    expect(wrapper.find('tbody td[data-column="refund"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="reason-presentation"][data-layout="mobile"]')).toBeTruthy();

    reasonCheckbox.click();
    await flushPromises();
    expect(reasonCheckbox.checked).toBe(true);
    expect(wrapper.find('thead th[data-column="reason"]').exists()).toBe(true);
    expect(wrapper.find('tbody td[data-column="reason"]').exists()).toBe(true);
  });

  it("suppresses duplicate, blank and null reason details on desktop and mobile", async () => {
    const items = [
      refund(1, {
        reason_type_label: "Sản phẩm bị hư hỏng",
        reason: "  sản PHẨM BỊ HƯ HỎNG  ",
      }),
      refund(2, {
        reason_type_label: "Sản phẩm bị hư hỏng",
        reason: "Vỏ hộp móp, chai bị vỡ",
      }),
      refund(3, { reason_type_label: "Đổi ý", reason: "   " }),
      refund(4, { reason_type_label: "Khác", reason: null }),
    ];
    mocks.getAdminList.mockImplementation((module: string) =>
      Promise.resolve({
        items:
          module === "branches" ? [{ id: 1, name: "Mizuki Ninh Kiều" }] : items,
        pagination: {
          current_page: 1,
          per_page: 40,
          total: module === "branches" ? 1 : items.length,
          last_page: 1,
        },
      }),
    );

    const { wrapper } = await mountPage();
    for (const layout of ["desktop", "mobile"]) {
      const presentations = wrapper.findAll(
        `[data-testid="reason-presentation"][data-layout="${layout}"]`,
      );
      expect(presentations).toHaveLength(4);
      expect(
        presentations[0]!.findAll('[data-testid="reason-detail"]'),
      ).toHaveLength(0);
      expect(
        presentations[1]!.get('[data-testid="reason-detail"]').text(),
      ).toBe("Vỏ hộp móp, chai bị vỡ");
      expect(
        presentations[2]!.findAll('[data-testid="reason-detail"]'),
      ).toHaveLength(0);
      expect(
        presentations[3]!.findAll('[data-testid="reason-detail"]'),
      ).toHaveLength(0);
    }
  });

  it("maps every return lifecycle state and rejected inspection consistently on desktop and mobile", async () => {
    const states = [
      ["not_required", "Không cần trả hàng"],
      ["awaiting_return", "Chờ khách trả hàng"],
      ["in_transit", "Đang trả hàng"],
      ["received", "Đã nhận · Chờ kiểm tra"],
      ["restocked", "Đã nhập kho"],
      ["not_restockable", "Không thể nhập kho"],
    ] as const;
    const items = states.map(([state], index) =>
      refund(index + 1, {
        return: {
          required: state !== "not_required",
          status: state,
          status_label: "Nhãn từ API",
          inspection_status: state === "received" ? "pending" : null,
          inspection_label: null,
          received_at: null,
          restocked_at: null,
          allowed_actions: [],
        },
      }),
    );
    items.push(
      refund(7, {
        return: {
          required: true,
          status: "received",
          status_label: "Đã nhận",
          inspection_status: "rejected",
          inspection_label: "Không đạt",
          received_at: "2026-09-02T09:00:00Z",
          restocked_at: null,
          allowed_actions: [],
        },
      }),
    );
    mocks.getAdminList.mockImplementation((module: string) =>
      Promise.resolve({
        items:
          module === "branches" ? [{ id: 1, name: "Mizuki Ninh Kiều" }] : items,
        pagination: {
          current_page: 1,
          per_page: 40,
          total: module === "branches" ? 1 : items.length,
          last_page: 1,
        },
      }),
    );

    const { wrapper } = await mountPage();
    const desktop = wrapper.get("tbody").text();
    const mobile = wrapper.get('[data-testid="refunds-mobile-list"]').text();
    for (const [, label] of states) {
      expect(desktop).toContain(label);
      expect(mobile).toContain(label);
    }
    expect(desktop).toContain("Không đạt điều kiện hoàn");
    expect(mobile).toContain("Không đạt điều kiện hoàn");
  });

  it("filters return status server-side and exposes an info tooltip trigger for every supported option", async () => {
    const { wrapper } = await mountPage();
    await wrapper
      .get('button[aria-label="Lọc trạng thái trả hàng"]')
      .trigger("click");
    await flushPromises();

    const returnGroup = document.body.querySelector<HTMLElement>(
      '[role="radiogroup"][aria-label="Trạng thái trả hàng"]',
    )!;
    const options = [
      ...returnGroup.querySelectorAll<HTMLButtonElement>('[role="radio"]'),
    ];
    const infoTriggers = [
      ...returnGroup.querySelectorAll<HTMLButtonElement>(
        'button[aria-label^="Giải thích:"]',
      ),
    ];
    expect(options).toHaveLength(8);
    expect(infoTriggers).toHaveLength(8);
    expect(
      options.some((option) =>
        option.textContent?.includes("Không đạt điều kiện hoàn"),
      ),
    ).toBe(true);

    options
      .find((option) => option.textContent?.includes("Chờ khách trả hàng"))!
      .click();
    await vi.waitFor(() =>
      expect(mocks.getAdminList).toHaveBeenLastCalledWith(
        "refunds",
        expect.objectContaining({ page: 1, return_status: "awaiting_return" }),
      ),
    );
  });

  it("renders settlement source and status as two compact lines on desktop and mobile", async () => {
    mocks.getAdminList.mockImplementation((module: string) =>
      Promise.resolve({
        items:
          module === "branches"
            ? [{ id: 1, name: "Mizuki Ninh Kiều" }]
            : [
                refund(1),
                refund(2, {
                  settlement: {
                    method: "vnpay",
                    method_label: "VNPAY",
                    destination: "vnpay_original",
                    destination_label: "Giao dịch VNPAY gốc",
                    status: "pending",
                    status_label: "Chờ hoàn tiền",
                    reference: "VNP-2",
                  },
                }),
                refund(3, {
                  settlement: {
                    method: "momo",
                    method_label: "MoMo",
                    destination: "momo_original",
                    destination_label: "Giao dịch MoMo gốc",
                    status: "processing",
                    status_label: "Đang hoàn tiền",
                    reference: "MM-3",
                  },
                }),
                refund(4, {
                  settlement: {
                    method: "wallet",
                    method_label: "Ví Mizuki",
                    destination: "wallet",
                    destination_label: "Ví Mizuki",
                    status: "succeeded",
                    status_label: "Đã hoàn tiền",
                    reference: "WL-4",
                  },
                }),
                refund(5, {
                  settlement: {
                    method: "zalopay",
                    method_label: "ZaloPay",
                    destination: "zalopay_original",
                    destination_label: "Giao dịch ZaloPay gốc",
                    status: "failed",
                    status_label: "Hoàn tiền thất bại",
                    reference: "ZP-5",
                  },
                }),
              ],
        pagination: {
          current_page: 1,
          per_page: 40,
          total: module === "branches" ? 1 : 5,
          last_page: 1,
        },
      }),
    );

    const { wrapper } = await mountPage();
    const desktop = wrapper.findAll(
      '[data-testid="settlement-presentation"][data-layout="desktop"]',
    );
    const mobile = wrapper.findAll(
      '[data-testid="settlement-presentation"][data-layout="mobile"]',
    );
    for (const presentations of [desktop, mobile]) {
      expect(presentations[0]!.text()).toContain("Ví MizukiChờ hoàn tiền");
      expect(presentations[1]!.text()).toContain("VNPAYChờ hoàn tiền");
      expect(presentations[1]!.text()).not.toContain("Giao dịch VNPAY gốc");
      expect(presentations[2]!.text()).toContain("MoMoĐang hoàn tiền");
      expect(presentations[3]!.text()).toContain("Ví MizukiĐã hoàn tiền");
      expect(presentations[4]!.text()).toContain("ZaloPayHoàn tiền thất bại");
    }
    expect(
      wrapper
        .get('[data-testid="settlement-status-dot"][data-status="processing"]')
        .classes(),
    ).toContain("bg-sky-500");
    expect(
      wrapper
        .get('[data-testid="settlement-status-dot"][data-status="succeeded"]')
        .classes(),
    ).toContain("bg-emerald-500");
    expect(
      wrapper
        .get('[data-testid="settlement-status-dot"][data-status="failed"]')
        .classes(),
    ).toContain("bg-rose-500");
    expect(wrapper.text()).not.toContain("Chờ hoàn ngoài hệ thống");
  });

  it("uses safe settlement fallbacks when the contract object is null", async () => {
    mocks.getAdminList.mockImplementation((module: string) =>
      Promise.resolve({
        items:
          module === "branches"
            ? [{ id: 1, name: "Mizuki Ninh Kiều" }]
            : [refund(1, { settlement: null })],
        pagination: { current_page: 1, per_page: 40, total: 1, last_page: 1 },
      }),
    );
    const { wrapper } = await mountPage();
    const desktop = wrapper.get(
      '[data-testid="settlement-presentation"][data-layout="desktop"]',
    );
    const mobile = wrapper.get(
      '[data-testid="settlement-presentation"][data-layout="mobile"]',
    );
    expect(desktop.text()).toContain("Chưa xác địnhChưa có trạng thái");
    expect(mobile.text()).toContain("Chưa xác địnhChưa có trạng thái");
  });

  it("labels the settlement filter as sources and only sends the currently supported wallet value", async () => {
    const { wrapper } = await mountPage();
    await wrapper
      .get('button[aria-label="Lọc nguồn hoàn tiền"]')
      .trigger("click");
    await flushPromises();
    const options = [
      ...document.body.querySelectorAll<HTMLButtonElement>('[role="radio"]'),
    ];
    expect(
      options.some((option) =>
        option.textContent?.includes("Tất cả nguồn hoàn tiền"),
      ),
    ).toBe(true);
    expect(
      options.some((option) => option.textContent?.includes("VNPAY")),
    ).toBe(true);
    options
      .find((option) => option.textContent?.includes("Ví Mizuki"))!
      .click();
    await vi.waitFor(() =>
      expect(mocks.getAdminList).toHaveBeenLastCalledWith(
        "refunds",
        expect.objectContaining({ page: 1, settlement_method: "wallet" }),
      ),
    );
  });

  it("debounces phone search and composes status, branch and settlement filters", async () => {
    const { wrapper } = await mountPage();
    await wrapper.get('input[type="search"]').setValue("0900000001");
    await new Promise((resolve) => setTimeout(resolve, 350));
    await wrapper
      .get('button[aria-label="Lọc trạng thái hoàn tiền"]')
      .trigger("click");
    await flushPromises();
    [...document.body.querySelectorAll<HTMLButtonElement>('[role="radio"]')]
      .find((option) => option.textContent?.includes("Đã duyệt"))!
      .click();
    await wrapper
      .get('button[aria-label="Lọc theo chi nhánh"]')
      .trigger("click");
    await flushPromises();
    [...document.body.querySelectorAll<HTMLButtonElement>('[role="radio"]')]
      .find((option) => option.textContent?.includes("Mizuki Ninh Kiều"))!
      .click();
    await wrapper
      .get('button[aria-label="Lọc nguồn hoàn tiền"]')
      .trigger("click");
    await flushPromises();
    [...document.body.querySelectorAll<HTMLButtonElement>('[role="radio"]')]
      .find((option) => option.textContent?.includes("Ví Mizuki"))!
      .click();
    await vi.waitFor(() =>
      expect(mocks.getAdminList).toHaveBeenLastCalledWith(
        "refunds",
        expect.objectContaining({
          page: 1,
          keyword: "0900000001",
          status: "approved",
          branch_id: 1,
          settlement_method: "wallet",
          sort_by: "created_at",
          sort_direction: "desc",
        }),
      ),
    );
  });

  it("maps all four sortable headings to sort_by and asc/desc", async () => {
    const { wrapper } = await mountPage();
    const buttons = wrapper.findAll("thead button");
    expect(buttons.map((button) => button.text())).toEqual([
      "Yêu cầu hoàn",
      "Số tiền",
      "Trả hàng / Hoàn kho",
      "Hoàn tiền vào",
      "Trạng thái",
      "Cập nhật",
    ]);
    expect(wrapper.findAll("th[aria-sort]")[0]!.attributes("aria-sort")).toBe(
      "descending",
    );
    await buttons[0]!.trigger("click");
    await vi.waitFor(() =>
      expect(mocks.getAdminList).toHaveBeenLastCalledWith(
        "refunds",
        expect.objectContaining({
          sort_by: "created_at",
          sort_direction: "asc",
          page: 1,
        }),
      ),
    );
    await buttons[1]!.trigger("click");
    await vi.waitFor(() =>
      expect(mocks.getAdminList).toHaveBeenLastCalledWith(
        "refunds",
        expect.objectContaining({
          sort_by: "requested_amount",
          sort_direction: "asc",
          page: 1,
        }),
      ),
    );
    await buttons[1]!.trigger("click");
    await vi.waitFor(() =>
      expect(mocks.getAdminList).toHaveBeenLastCalledWith(
        "refunds",
        expect.objectContaining({
          sort_by: "requested_amount",
          sort_direction: "desc",
          page: 1,
        }),
      ),
    );
    await buttons[2]!.trigger("click");
    await vi.waitFor(() =>
      expect(mocks.getAdminList).toHaveBeenLastCalledWith(
        "refunds",
        expect.objectContaining({
          sort_by: "return_status",
          sort_direction: "asc",
          page: 1,
        }),
      ),
    );
    await buttons[3]!.trigger("click");
    await vi.waitFor(() =>
      expect(mocks.getAdminList).toHaveBeenLastCalledWith(
        "refunds",
        expect.objectContaining({
          sort_by: "settlement_method",
          sort_direction: "asc",
          page: 1,
        }),
      ),
    );
  });

  it("maps every time option and custom range to authoritative server params", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 8, 6, 12, 0, 0));
    const { wrapper } = await mountPage();

    const trigger = wrapper.get(
      'button[aria-label="Lọc và sắp xếp thời gian"]',
    );
    expect(trigger.text()).toContain("Mới nhất");
    expect(wrapper.text()).not.toContain("Mọi thời gian");

    await trigger.trigger("click");
    await flushPromises();
    let group = document.body.querySelector<HTMLElement>(
      '[role="radiogroup"][aria-label="Thời gian yêu cầu hoàn tiền"]',
    )!;
    [...group.querySelectorAll<HTMLButtonElement>('[role="radio"]')]
      .find((option) => option.textContent?.includes("Cũ nhất"))!
      .click();
    await vi.waitFor(() =>
      expect(mocks.getAdminList).toHaveBeenLastCalledWith(
        "refunds",
        expect.objectContaining({
          sort_by: "created_at",
          sort_direction: "asc",
          date_from: undefined,
          date_to: undefined,
          page: 1,
        }),
      ),
    );

    await trigger.trigger("click");
    await flushPromises();
    group = document.body.querySelector<HTMLElement>(
      '[role="radiogroup"][aria-label="Thời gian yêu cầu hoàn tiền"]',
    )!;
    [...group.querySelectorAll<HTMLButtonElement>('[role="radio"]')]
      .find((option) => option.textContent?.includes("7 ngày gần đây"))!
      .click();
    await vi.waitFor(() =>
      expect(mocks.getAdminList).toHaveBeenLastCalledWith(
        "refunds",
        expect.objectContaining({
          sort_by: "created_at",
          sort_direction: "desc",
          date_from: "2026-08-31",
          date_to: "2026-09-06",
          page: 1,
        }),
      ),
    );

    await trigger.trigger("click");
    await flushPromises();
    group = document.body.querySelector<HTMLElement>(
      '[role="radiogroup"][aria-label="Thời gian yêu cầu hoàn tiền"]',
    )!;
    [...group.querySelectorAll<HTMLButtonElement>('[role="radio"]')]
      .find((option) => option.textContent?.includes("30 ngày gần đây"))!
      .click();
    await vi.waitFor(() =>
      expect(mocks.getAdminList).toHaveBeenLastCalledWith(
        "refunds",
        expect.objectContaining({
          sort_by: "created_at",
          sort_direction: "desc",
          date_from: "2026-08-08",
          date_to: "2026-09-06",
          page: 1,
        }),
      ),
    );

    await trigger.trigger("click");
    await flushPromises();
    group = document.body.querySelector<HTMLElement>(
      '[role="radiogroup"][aria-label="Thời gian yêu cầu hoàn tiền"]',
    )!;
    [...group.querySelectorAll<HTMLButtonElement>('[role="radio"]')]
      .find((option) =>
        option.textContent?.includes("Khoảng thời gian tùy chỉnh"),
      )!
      .click();
    await flushPromises();
    const from = document.body.querySelector<HTMLInputElement>(
      'input[aria-label="Từ ngày hoàn tiền"]',
    )!;
    const to = document.body.querySelector<HTMLInputElement>(
      'input[aria-label="Đến ngày hoàn tiền"]',
    )!;
    from.value = "2026-08-01";
    from.dispatchEvent(new Event("input", { bubbles: true }));
    to.value = "2026-08-31";
    to.dispatchEvent(new Event("input", { bubbles: true }));
    await vi.waitFor(() =>
      expect(mocks.getAdminList).toHaveBeenLastCalledWith(
        "refunds",
        expect.objectContaining({
          sort_by: "created_at",
          sort_direction: "desc",
          date_from: "2026-08-01",
          date_to: "2026-08-31",
          page: 1,
        }),
      ),
    );

    const reset = [
      ...document.body.querySelectorAll<HTMLButtonElement>("button"),
    ].find((button) => button.textContent?.includes("Đặt lại thời gian"))!;
    reset.click();
    await vi.waitFor(() =>
      expect(mocks.getAdminList).toHaveBeenLastCalledWith(
        "refunds",
        expect.objectContaining({
          sort_by: "created_at",
          sort_direction: "desc",
          date_from: undefined,
          date_to: undefined,
          page: 1,
        }),
      ),
    );
    expect(trigger.text()).toContain("Mới nhất");
  });

  it("loads another batch inside the table viewport and removes duplicate ids", async () => {
    const { wrapper } = await mountPage();
    const scroll = wrapper.get('[data-testid="refunds-scroll-region"]');
    Object.defineProperties(scroll.element, {
      scrollHeight: { value: 1000 },
      clientHeight: { value: 600 },
      scrollTop: { value: 200 },
    });
    await scroll.trigger("scroll");
    await flushPromises();
    expect(wrapper.findAll('tbody tr[tabindex="0"]')).toHaveLength(3);
  });

  it("copies both identities without opening detail, while row click navigates", async () => {
    const { wrapper, router } = await mountPage();
    await wrapper.get('button[aria-label="Sao chép mã đơn"]').trigger("click");
    await flushPromises();
    expect(mocks.writeText).toHaveBeenCalledWith("MZ-ORDER-1");
    expect(router.currentRoute.value.path).toBe("/admin/refunds");
    await wrapper.get('tbody tr[tabindex="0"]').trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/admin/refunds/1");
  });

  it("uses one clear action and keeps structural shells separate from the scroll viewport", async () => {
    const { wrapper } = await mountPage();
    await wrapper.get('input[type="search"]').setValue("RF-V2");
    expect(wrapper.findAll('button[aria-label="Xóa tìm kiếm"]')).toHaveLength(
      1,
    );
    await wrapper.get('button[aria-label="Xóa tìm kiếm"]').trigger("click");
    expect(wrapper.get('input[type="search"]').element).toHaveProperty(
      "value",
      "",
    );
    expect(
      wrapper.get('[data-testid="refunds-table-shell"]').classes(),
    ).toContain("refunds-rounded-shell");
    expect(
      wrapper.get('[data-testid="refunds-scroll-region"]').classes(),
    ).toContain("overflow-auto");
  });
});
