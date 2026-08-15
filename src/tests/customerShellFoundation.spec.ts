/// <reference types="node" />

import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import { createMemoryHistory, type Router } from "vue-router";
import App from "@/App.vue";
import {
  CustomerAnnouncementBar,
  CustomerBackToTop,
  CustomerBranchSelector,
  CustomerCategoryHighlights,
  CustomerCategoryMenu,
  CustomerDesktopNavigation,
  CustomerFooter,
  CustomerHeader,
  CustomerHeroBanners,
  CustomerLogo,
  CustomerMobileHeader,
  CustomerMobileNavigation,
  CustomerSearch,
  CustomerVoucherFloat,
} from "@/components/customer-shell";
import CustomerLayout from "@/layouts/CustomerLayout.vue";
import { createAppRouter } from "@/router";
import { DEFAULT_CUSTOMER_BRANCH } from "@/types/customer-shell";
import { pinia } from "@/stores/pinia";
import { useAuthStore } from "@/stores/auth";
import {
  BRANCH_PREFERENCE_KEY,
  useBranchPreferenceStore,
} from "@/stores/branchPreference";

const {
  getBranchesMock,
  getProductBrandsMock,
  getProductCategoriesMock,
  getProductListingMock,
} = vi.hoisted(() => ({
  getBranchesMock: vi.fn(),
  getProductBrandsMock: vi.fn(),
  getProductCategoriesMock: vi.fn(),
  getProductListingMock: vi.fn(),
}));

const cartApiMocks = vi.hoisted(() => ({
  getCustomerCart: vi.fn(),
  addCartItem: vi.fn(),
  updateCartItem: vi.fn(),
  removeCartItem: vi.fn(),
  selectCartBranch: vi.fn(),
}));

vi.mock("@/api/branchApi", () => ({
  getBranches: getBranchesMock,
}));

vi.mock("@/api/cartApi", () => ({
  getCustomerCart: cartApiMocks.getCustomerCart,
  addCartItem: cartApiMocks.addCartItem,
  updateCartItem: cartApiMocks.updateCartItem,
  removeCartItem: cartApiMocks.removeCartItem,
  selectCartBranch: cartApiMocks.selectCartBranch,
}));

vi.mock("@/api/productListingApi", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/api/productListingApi")>();
  return {
    ...actual,
    getProductBrands: getProductBrandsMock,
    getProductCategories: getProductCategoriesMock,
    getProductListing: getProductListingMock,
  };
});

const headerCategoryFixtures = [
  {
    id: 6,
    parent_id: null,
    name: "Chăm sóc da",
    slug: "cham-soc-da",
    children: [
      {
        id: 10,
        parent_id: 6,
        name: "Làm sạch",
        slug: "lam-sach",
        children: [],
      },
      {
        id: 11,
        parent_id: 6,
        name: "Dưỡng da",
        slug: "duong-da",
        children: [],
      },
    ],
  },
  {
    id: 38,
    parent_id: null,
    name: "Trang điểm",
    slug: "trang-diem",
    children: [
      {
        id: 39,
        parent_id: 38,
        name: "Trang điểm mặt",
        slug: "trang-diem-mat",
        children: [],
      },
    ],
  },
];

const representativeListingResponse = {
  success: true,
  message: "OK",
  data: [
    {
      id: 1,
      name: "Sản phẩm đại diện",
      slug: "san-pham-dai-dien-1",
      category: { id: 10, name: "Làm sạch", parent_id: 6 },
      brand: { id: 6, name: "Cocoon" },
      primary_image: "/storage/catalog/products/representative.png",
      primary_image_url: null,
      price: 120_000,
      original_price: null,
      minimum_price: 120_000,
      has_discount: false,
      discount: null,
      rating: 4.8,
      review_count: 12,
      default_variant: null,
      availability: { available: true, available_quantity: 8 },
    },
  ],
  meta: {
    pagination: { current_page: 1, per_page: 1, total: 1, last_page: 1 },
  },
};

const backendBranches = [
  {
    id: 1,
    code: "MZ-NK-01",
    name: "Mizuki Ninh Kiều",
    address: "51 Đường 3/2, Ninh Kiều, Cần Thơ",
    phone: "02923730101",
    email: "ninhkieu@mizuki.vn",
    is_active: true,
    opening_hours: [],
  },
  {
    id: 6,
    code: "MZ-VL-01",
    name: "Mizuki Vĩnh Long",
    address: "68 Phạm Thái Bường, Vĩnh Long",
    phone: "02703730606",
    email: "vinhlong@mizuki.vn",
    is_active: true,
    opening_hours: [],
  },
  {
    id: 99,
    code: "MZ-OFF",
    name: "Mizuki Không Hoạt Động",
    address: "Địa chỉ không hoạt động",
    phone: null,
    email: null,
    is_active: false,
    opening_hours: [],
  },
];

interface MountedCustomerApp {
  wrapper: VueWrapper;
  router: Router;
}

const mountedWrappers: VueWrapper[] = [];
const customerShellCss = readFileSync("src/style.css", "utf8");

class ResizeObserverMock implements ResizeObserver {
  readonly observe = vi.fn();
  readonly unobserve = vi.fn();
  readonly disconnect = vi.fn();
}

function createTestRouter(): Router {
  return createAppRouter(createMemoryHistory());
}

async function mountCustomerApp(
  path = "/customer-shell",
): Promise<MountedCustomerApp> {
  const router = createTestRouter();
  await router.push(path);
  await router.isReady();
  const wrapper = mount(App, {
    attachTo: document.body,
    global: { plugins: [pinia, router] },
  });
  mountedWrappers.push(wrapper);
  await flushPromises();
  return { wrapper, router };
}

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverMock);
  useAuthStore(pinia).resetForTesting();
  window.localStorage.clear();
  getBranchesMock.mockReset();
  getBranchesMock.mockResolvedValue(backendBranches);
  getProductBrandsMock.mockReset();
  getProductCategoriesMock.mockReset();
  getProductListingMock.mockReset();
  getProductBrandsMock.mockResolvedValue([]);
  getProductCategoriesMock.mockResolvedValue(headerCategoryFixtures);
  getProductListingMock.mockResolvedValue(representativeListingResponse);
  cartApiMocks.getCustomerCart.mockReset();
  cartApiMocks.selectCartBranch.mockReset();
  cartApiMocks.getCustomerCart.mockResolvedValue({
    id: 1,
    totalQuantity: 0,
    totalAmount: 0,
    discountAmount: 0,
    totalAfterDiscount: 0,
    items: [],
  });
  useBranchPreferenceStore(pinia).$patch({
    branches: [],
    selectedBranchId: null,
    status: "idle",
    error: null,
  });
});

afterEach(() => {
  mountedWrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  document.body.innerHTML = "";
  document.body.removeAttribute("style");
  Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("customer shell foundation", () => {
  it("renders semantic header, main, and footer regions", async () => {
    const { wrapper } = await mountCustomerApp();

    expect(wrapper.findAll("header")).toHaveLength(2);
    expect(wrapper.get("main").element.tagName).toBe("MAIN");
    expect(wrapper.get("footer").attributes("aria-label")).toBe(
      "Chân trang Mizuki",
    );
  });

  it("renders the demo announcement copy", () => {
    const wrapper = mount(CustomerAnnouncementBar);
    mountedWrappers.push(wrapper);

    expect(wrapper.text()).toContain("Miễn phí giao hàng");
    expect(wrapper.text().replace(/\s+/g, " ")).toContain("FREESHIP EXTRA");
    expect(wrapper.text()).toContain("nội dung demo");
    expect(
      wrapper.get(".customer-announcement-offer").text().replace(/\s+/g, " "),
    ).toBe("FREESHIP EXTRA");
    expect(
      wrapper.get(".customer-announcement-offer span:first-child").classes(),
    ).toContain("text-[#40a66a]");
    expect(
      wrapper.get(".customer-announcement-offer span:last-child").classes(),
    ).toContain("text-[#b98122]");
  });

  it("renders the MIZUKI wordmark without the previous leaf icon", () => {
    const router = createTestRouter();
    const wrapper = mount(CustomerLogo, { global: { plugins: [router] } });
    mountedWrappers.push(wrapper);

    expect(wrapper.text()).toBe("MIZUKI");
    expect(wrapper.get("a").attributes("aria-label")).toBe("MIZUKI");
    expect(wrapper.find("svg").exists()).toBe(false);
  });

  it("keeps announcement content static and complete under reduced motion", () => {
    const reducedMotionCss = customerShellCss.slice(
      customerShellCss.indexOf("@media (prefers-reduced-motion: reduce)"),
    );

    expect(customerShellCss).toContain(
      "@keyframes customer-announcement-scroll",
    );
    expect(reducedMotionCss).toMatch(
      /\.customer-announcement-track\s*\{[^}]*animation:\s*none !important/,
    );
    expect(reducedMotionCss).toContain(
      ".customer-announcement-sequence[aria-hidden='true']",
    );
  });

  it("gives search an accessible label", () => {
    const wrapper = mount(CustomerSearch);
    mountedWrappers.push(wrapper);

    expect(wrapper.get("input").attributes("aria-label")).toBeUndefined();
    expect(wrapper.get("label").text()).toContain(
      "Tìm kiếm sản phẩm và dịch vụ",
    );
    expect(wrapper.get("label").attributes("for")).toBe(
      wrapper.get("input").attributes("id"),
    );
  });

  it("emits a trimmed local search query on submit", async () => {
    const wrapper = mount(CustomerSearch);
    mountedWrappers.push(wrapper);

    await wrapper.get("input").setValue("  serum dưỡng ẩm  ");
    await wrapper.get("form").trigger("submit");

    expect(wrapper.emitted("submit")).toEqual([["serum dưỡng ẩm"]]);
  });

  it("shows exactly one custom clear action only when search has content", async () => {
    const wrapper = mount(CustomerSearch);
    mountedWrappers.push(wrapper);

    expect(
      wrapper.findAll('button[aria-label="Xóa nội dung tìm kiếm"]'),
    ).toHaveLength(0);

    await wrapper.get("input").setValue("serum");

    expect(
      wrapper.findAll('button[aria-label="Xóa nội dung tìm kiếm"]'),
    ).toHaveLength(1);
    expect(wrapper.get("input").classes()).toContain("customer-search-input");
  });

  it("renders the two-banner commerce hero", () => {
    const router = createTestRouter();
    const wrapper = mount(CustomerHeroBanners, {
      global: { plugins: [router] },
    });
    mountedWrappers.push(wrapper);

    expect(wrapper.findAll("article.customer-hero-banner")).toHaveLength(2);
    expect(wrapper.get("h1").text()).toContain("Chăm da dịu nhẹ");
    expect(wrapper.text()).not.toContain("Foundation demo");
  });

  it("renders category highlights with local background visuals", () => {
    const wrapper = mount(CustomerCategoryHighlights);
    mountedWrappers.push(wrapper);

    expect(wrapper.findAll("article")).toHaveLength(4);
    expect(
      wrapper
        .findAll("article")
        .every((card) => Boolean(card.attributes("style"))),
    ).toBe(true);
    expect(wrapper.text()).toContain("Danh mục nổi bật");
  });

  it("renders the voucher floating utility", () => {
    const wrapper = mount(CustomerVoucherFloat);
    mountedWrappers.push(wrapper);

    expect(wrapper.get("a").text()).toContain("Nhận voucher");
    expect(wrapper.get("a").attributes("aria-label")).toBe(
      "Nhận voucher Mizuki",
    );
    expect(wrapper.get("a").attributes("href")).toBe("/vouchers");
  });

  it("shows the shared back-to-top control after scrolling and respects motion preference", async () => {
    const scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);
    const wrapper = mount(CustomerBackToTop);
    mountedWrappers.push(wrapper);

    expect(wrapper.find("[data-customer-back-to-top]").exists()).toBe(false);

    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: 640,
    });
    window.dispatchEvent(new Event("scroll"));
    await nextTick();

    const control = wrapper.get("[data-customer-back-to-top]");
    expect(control.attributes("aria-label")).toBe("Quay lên đầu trang");
    expect(control.classes()).toEqual(
      expect.arrayContaining([
        "bottom-[10rem]",
        "md:bottom-[5.5rem]",
        "size-11",
      ]),
    );

    await control.trigger("click");
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });

  it("shows the selected branch name", () => {
    const router = createTestRouter();
    const wrapper = mount(CustomerBranchSelector, {
      props: { selectedBranch: DEFAULT_CUSTOMER_BRANCH },
      global: { plugins: [pinia, router] },
    });
    mountedWrappers.push(wrapper);

    expect(
      wrapper.get('button[aria-label^="Chọn chi nhánh"]').text(),
    ).toContain("Mizuki Cần Thơ");
  });

  it("exposes branch dialog expanded state", () => {
    const router = createTestRouter();
    const wrapper = mount(CustomerBranchSelector, {
      props: { selectedBranch: DEFAULT_CUSTOMER_BRANCH },
      global: { plugins: [router] },
    });
    mountedWrappers.push(wrapper);

    expect(
      wrapper
        .get('button[aria-label^="Chọn chi nhánh"]')
        .attributes("aria-expanded"),
    ).toBe("false");
  });

  it("opens the branch dialog", async () => {
    const { wrapper } = await mountCustomerApp();

    await wrapper
      .findAll('button[aria-label^="Chọn chi nhánh"]')[0]
      ?.trigger("click");
    await nextTick();

    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    expect(document.body.textContent).toContain("Chọn chi nhánh Mizuki");
  });

  it("renders an accessible branch search field", async () => {
    const { wrapper } = await mountCustomerApp();
    await wrapper
      .findAll('button[aria-label^="Chọn chi nhánh"]')[0]
      ?.trigger("click");
    await nextTick();

    const input = document.querySelector<HTMLInputElement>(
      'input[placeholder="Nhập tên hoặc khu vực chi nhánh"]',
    );
    const label = input
      ? document.querySelector<HTMLLabelElement>(`label[for="${input.id}"]`)
      : null;

    expect(input).not.toBeNull();
    expect(label?.textContent).toContain("Tìm chi nhánh");
  });

  it("filters branch options locally", async () => {
    const { wrapper } = await mountCustomerApp();
    await wrapper
      .findAll('button[aria-label^="Chọn chi nhánh"]')[0]
      ?.trigger("click");
    await nextTick();
    const input = document.querySelector<HTMLInputElement>(
      'input[placeholder="Nhập tên hoặc khu vực chi nhánh"]',
    );

    expect(input).not.toBeNull();
    if (input) {
      input.value = "Ninh Kiều";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
    await nextTick();

    const branchOptions = [
      ...document.querySelectorAll<HTMLButtonElement>(
        'button[role="listitem"]',
      ),
    ];
    expect(branchOptions).toHaveLength(1);
    expect(branchOptions[0]?.textContent).toContain("Mizuki Ninh Kiều");
  });

  it("renders active backend branches without a demo fallback", async () => {
    const { wrapper } = await mountCustomerApp();
    await wrapper
      .findAll('button[aria-label^="Chọn chi nhánh"]')[0]
      ?.trigger("click");
    await flushPromises();

    const branchOptions = [
      ...document.querySelectorAll<HTMLButtonElement>(
        'button[role="listitem"]',
      ),
    ];
    expect(branchOptions).toHaveLength(2);
    expect(document.body.textContent).toContain("Mizuki Ninh Kiều");
    expect(document.body.textContent).toContain("Mizuki Vĩnh Long");
    expect(document.body.textContent).not.toContain("Mizuki Không Hoạt Động");
    expect(document.body.textContent).not.toContain("Mizuki Cần Thơ");
  });

  it("updates the selected branch in both responsive headers", async () => {
    const { wrapper } = await mountCustomerApp();
    await wrapper
      .findAll('button[aria-label^="Chọn chi nhánh"]')[0]
      ?.trigger("click");
    await nextTick();
    const target = [
      ...document.querySelectorAll<HTMLButtonElement>(
        'button[role="listitem"]',
      ),
    ].find((button) => button.textContent?.includes("Mizuki Ninh Kiều"));

    target?.click();
    await nextTick();

    expect(
      wrapper
        .findAll('button[aria-label^="Chọn chi nhánh"]')
        .every((button) => button.text().includes("Mizuki Ninh Kiều")),
    ).toBe(true);
  });

  it("shows the existing dialog error language and retries the branch API", async () => {
    getBranchesMock.mockRejectedValueOnce(new Error("network unavailable"));
    const { wrapper } = await mountCustomerApp();
    await flushPromises();
    await wrapper
      .findAll('button[aria-label^="Chọn chi nhánh"]')[0]
      ?.trigger("click");
    await nextTick();

    expect(document.querySelector('[role="alert"]')?.textContent).toContain(
      "Không thể tải danh sách chi nhánh",
    );

    getBranchesMock.mockResolvedValueOnce(backendBranches);
    const retryButton = [
      ...document.querySelectorAll<HTMLButtonElement>("button"),
    ].find((button) => button.textContent?.trim() === "Thử lại");
    retryButton?.click();
    await flushPromises();

    expect(getBranchesMock).toHaveBeenCalledTimes(2);
    expect(document.body.textContent).toContain("Mizuki Ninh Kiều");
  });

  it("restores the saved real branch in the unchanged desktop and mobile headers", async () => {
    window.localStorage.setItem(BRANCH_PREFERENCE_KEY, "6");
    const { wrapper } = await mountCustomerApp();
    await useBranchPreferenceStore(pinia).load();
    await flushPromises();

    expect(wrapper.findAll("header")).toHaveLength(2);
    expect(
      wrapper
        .findAll('button[aria-label^="Chọn chi nhánh"]')
        .every((button) => button.text().includes("Mizuki Vĩnh Long")),
    ).toBe(true);
  });

  it("closes the branch dialog with its close action", async () => {
    const { wrapper } = await mountCustomerApp();
    await wrapper
      .findAll('button[aria-label^="Chọn chi nhánh"]')[0]
      ?.trigger("click");
    await nextTick();
    const closeButton = document.querySelector<HTMLButtonElement>(
      'button[aria-label="Đóng chọn chi nhánh"]',
    );

    closeButton?.click();
    await nextTick();

    expect(
      document.querySelector('[role="dialog"]')?.getAttribute("data-state"),
    ).toBe("closed");
    expect(
      wrapper
        .findAll('button[aria-label^="Chọn chi nhánh"]')[0]
        ?.attributes("aria-expanded"),
    ).toBe("false");
  });

  it("renders all seven desktop shopping navigation items", () => {
    const router = createTestRouter();
    const wrapper = mount(CustomerDesktopNavigation, {
      props: { activeKey: "home" },
      global: { plugins: [router] },
    });
    mountedWrappers.push(wrapper);

    expect(wrapper.findAll("nav a")).toHaveLength(7);
    expect(wrapper.text()).toContain("Khuyến mãi");
  });

  it("opens the compact desktop category menu", async () => {
    const router = createTestRouter();
    const wrapper = mount(CustomerCategoryMenu, {
      attachTo: document.body,
      global: { plugins: [router] },
    });
    mountedWrappers.push(wrapper);

    await wrapper
      .get('button[aria-label="Mở danh mục sản phẩm"]')
      .trigger("click");
    await flushPromises();

    expect(wrapper.get("button").attributes("aria-expanded")).toBe("true");
    expect(
      document.body.querySelector("[data-real-category-menu]"),
    ).not.toBeNull();
    expect(document.body.textContent).toContain("Chăm sóc da");
    expect(document.body.textContent).not.toContain("Danh mục sản phẩm");
    expect(document.body.textContent).not.toContain("Nội dung demo");
  });

  it("renders real parent and child categories with category_id navigation", async () => {
    const router = createTestRouter();
    useBranchPreferenceStore(pinia).$patch({
      branches: backendBranches.slice(0, 2),
      selectedBranchId: 6,
      status: "success",
      error: null,
    });
    const wrapper = mount(CustomerCategoryMenu, {
      attachTo: document.body,
      global: { plugins: [router] },
    });
    mountedWrappers.push(wrapper);

    await wrapper
      .get('button[aria-label="Mở danh mục sản phẩm"]')
      .trigger("click");
    await flushPromises();

    expect(document.body.textContent).toContain("Chăm sóc da");
    expect(document.body.textContent).toContain("Làm sạch");
    expect(document.body.textContent).toContain("Dưỡng da");
    expect(
      document.body
        .querySelector('[data-header-category-id="6"]')
        ?.getAttribute("href"),
    ).toBe("/products?category_id=6&page=1");
    expect(
      document.body
        .querySelector('[data-header-child-category-id="10"]')
        ?.getAttribute("href"),
    ).toBe("/products?category_id=10&page=1");
    expect(
      document.body.querySelectorAll("[data-category-representative-image]"),
    ).toHaveLength(2);
    expect(
      document.body.querySelector("[data-category-representative-image]")
        ?.classList,
    ).toContain("size-16");
    expect(
      document.body.querySelector("[data-category-representative-image]")
        ?.classList,
    ).toContain("object-contain");
    expect(
      document.body.querySelectorAll("[data-category-menu-scroll-region]"),
    ).toHaveLength(1);
    expect(
      document.body.querySelector("[data-category-menu-scroll-region]")
        ?.classList,
    ).toContain("overflow-y-auto");
    expect(
      document.body.querySelector("[data-category-menu-scroll-region]")
        ?.classList,
    ).toContain("overflow-x-hidden");
    expect(
      document.body.querySelector('nav[aria-label="Danh mục cha"]')?.classList,
    ).not.toContain("overflow-y-auto");
    expect(
      getProductListingMock.mock.calls.every(
        ([request]) => request.category_id === 10 || request.category_id === 11,
      ),
    ).toBe(true);
    expect(
      getProductListingMock.mock.calls.every(
        ([request]) => request.per_page === 1,
      ),
    ).toBe(true);
    expect(getProductListingMock).toHaveBeenCalledTimes(2);
  });

  it("closes the category menu with Escape", async () => {
    const router = createTestRouter();
    const wrapper = mount(CustomerCategoryMenu, {
      attachTo: document.body,
      global: { plugins: [router] },
    });
    mountedWrappers.push(wrapper);

    await wrapper
      .get('button[aria-label="Mở danh mục sản phẩm"]')
      .trigger("click");
    await nextTick();
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    await nextTick();

    expect(wrapper.get("button").attributes("aria-expanded")).toBe("false");
  });

  it("renders the compact mobile header", () => {
    const router = createTestRouter();
    const wrapper = mount(CustomerMobileHeader, {
      props: { selectedBranch: DEFAULT_CUSTOMER_BRANCH },
      global: { plugins: [router] },
    });
    mountedWrappers.push(wrapper);

    expect(wrapper.get("header").attributes("aria-label")).toBe(
      "Đầu trang khách hàng mobile",
    );
    expect(wrapper.text()).toContain("Mizuki");
    expect(wrapper.get("input").attributes("placeholder")).toContain(
      "Tìm sản phẩm",
    );
  });

  it("renders exactly five mobile customer navigation items", () => {
    const router = createTestRouter();
    const wrapper = mount(CustomerMobileNavigation, {
      props: { activeKey: "home" },
      global: { plugins: [router] },
    });
    mountedWrappers.push(wrapper);

    expect(wrapper.findAll("nav a")).toHaveLength(4);
    expect(wrapper.findAll("nav [data-navigation-key]")).toHaveLength(5);
    expect(
      wrapper
        .findAll("nav [data-navigation-key]")
        .map((item) => item.attributes("aria-label")),
    ).toEqual(["Trang chủ", "Sản phẩm", "Yêu thích", "Giỏ hàng", "Tài khoản"]);
    expect(
      wrapper.get('[data-navigation-key="favorites"]').attributes("href"),
    ).toBe("/favorites");
    expect(wrapper.get('[data-navigation-key="cart"]').attributes("href")).toBe(
      "/cart",
    );
    expect(
      wrapper.findAll("nav a span").every((item) => item.text() === ""),
    ).toBe(true);
  });

  it("marks the active mobile customer item semantically", () => {
    const router = createTestRouter();
    const wrapper = mount(CustomerMobileNavigation, {
      props: { activeKey: "cart" },
      global: { plugins: [router] },
    });
    mountedWrappers.push(wrapper);

    expect(wrapper.get('a[aria-current="page"]').attributes("aria-label")).toBe(
      "Giỏ hàng",
    );
  });

  it("renders all footer foundation groups", () => {
    const wrapper = mount(CustomerFooter);
    mountedWrappers.push(wrapper);

    expect(wrapper.text()).toContain("Về Mizuki");
    expect(wrapper.text()).toContain("Hỗ trợ khách hàng");
    expect(wrapper.text()).toContain("Chính sách");
    expect(wrapper.text()).toContain("Liên hệ");
    expect(wrapper.text()).toContain("Phương thức thanh toán");
  });

  it("allows the router to visit the customer shell", async () => {
    const { wrapper, router } = await mountCustomerApp();

    expect(router.currentRoute.value.path).toBe("/customer-shell");
    expect(wrapper.get("h1").text()).toContain("Chăm da dịu nhẹ");
  });

  it("links to the real product page and renders it without reloading", async () => {
    const { wrapper, router } = await mountCustomerApp();
    const desktopNavigation = wrapper.get(
      'nav[aria-label="Điều hướng mua sắm"]',
    );

    const productsNavigation = desktopNavigation.get(
      '[data-navigation-key="products"]',
    );
    const productsHref = productsNavigation.attributes("href");
    expect(productsHref).toBe("/products");
    if (productsHref === undefined) {
      throw new Error("Product navigation must provide an href.");
    }
    await router.push(productsHref);
    await flushPromises();

    expect(router.currentRoute.value.path).toBe("/products");
    expect(wrapper.get("h1").text()).toContain("Sản phẩm chăm sóc da");
  });

  it("does not make a network request during local interactions", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const xhrSpy = vi.spyOn(XMLHttpRequest.prototype, "open");
    const { wrapper } = await mountCustomerApp();

    await wrapper
      .get('input[id="customer-search-desktop"]')
      .setValue("kem dưỡng");
    await wrapper
      .get('input[id="customer-search-desktop"]')
      .trigger("keyup.enter");
    await wrapper
      .findAll('button[aria-label^="Chọn chi nhánh"]')[0]
      ?.trigger("click");
    await wrapper
      .get('button[aria-label="Mở danh mục sản phẩm"]')
      .trigger("click");
    await nextTick();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
  });

  it("gives important customer actions accessible names", () => {
    const router = createTestRouter();
    const wrapper = mount(CustomerHeader, {
      props: { selectedBranch: DEFAULT_CUSTOMER_BRANCH, activeKey: "home" },
      global: { plugins: [pinia, router] },
    });
    mountedWrappers.push(wrapper);

    expect(wrapper.find('a[aria-label="Yêu thích"]').attributes("href")).toBe(
      "/favorites",
    );
    expect(wrapper.find('a[aria-label^="Giỏ hàng"]').attributes("href")).toBe(
      "/cart",
    );
    expect(wrapper.find('button[aria-label="Tài khoản"]').exists()).toBe(true);
    expect(wrapper.find('button[aria-label^="Chọn chi nhánh"]').exists()).toBe(
      true,
    );
  });

  it("logs an authenticated customer out through the existing account action", async () => {
    const router = createTestRouter();
    await router.push("/home");
    await router.isReady();
    const authStore = useAuthStore(pinia);
    authStore.$patch({
      user: {
        id: 1,
        name: "Customer",
        email: "customer@example.com",
        phone: null,
        avatar: null,
        role: "customer",
        role_label: "Khách hàng",
        branch_id: null,
        email_verified_at: null,
        created_at: "2026-07-31T00:00:00Z",
      },
    });
    const logout = vi
      .spyOn(authStore, "logout")
      .mockImplementation(async () => {
        authStore.clearSession();
      });
    const wrapper = mount(CustomerHeader, {
      attachTo: document.body,
      props: { selectedBranch: DEFAULT_CUSTOMER_BRANCH, activeKey: "home" },
      global: { plugins: [pinia, router] },
    });
    mountedWrappers.push(wrapper);

    await wrapper
      .get('button[aria-label="Tài khoản của Customer"]')
      .trigger("click");
    await nextTick();
    const logoutButton = Array.from(
      document.body.querySelectorAll("button"),
    ).find((button) => button.textContent?.trim() === "Đăng xuất");
    expect(logoutButton).toBeDefined();
    logoutButton?.click();
    await flushPromises();
    expect(logout).toHaveBeenCalledOnce();
    expect(authStore.user).toBeNull();
    await vi.waitFor(() =>
      expect(router.currentRoute.value.path).toBe("/home"),
    );
  });

  it("reserves bottom space for mobile navigation", () => {
    const router = createTestRouter();
    const wrapper = mount(CustomerLayout, {
      slots: { default: "<p>Nội dung</p>" },
      global: { plugins: [pinia, router] },
    });
    mountedWrappers.push(wrapper);

    expect(wrapper.get("main").classes()).toEqual(
      expect.arrayContaining(["pb-24", "md:pb-0"]),
    );
  });

  it("uses distinct server cart lines for both responsive cart badges", async () => {
    const authStore = useAuthStore(pinia);
    authStore.$patch({
      user: {
        id: 707,
        name: "Customer",
        email: "customer@example.com",
        phone: null,
        avatar: null,
        role: "customer",
        role_label: "Khách hàng",
        branch_id: null,
        email_verified_at: null,
        created_at: "2026-08-14T00:00:00Z",
      },
      isInitialized: true,
    });
    cartApiMocks.getCustomerCart.mockResolvedValueOnce({
      id: 1,
      totalQuantity: 19,
      totalAmount: 0,
      discountAmount: 0,
      totalAfterDiscount: 0,
      items: [
        { id: 1, quantity: 1 },
        { id: 2, quantity: 1 },
        { id: 3, quantity: 17 },
      ],
    });
    const router = createTestRouter();
    const wrapper = mount(CustomerLayout, {
      slots: { default: "<p>Nội dung</p>" },
      global: { plugins: [pinia, router] },
    });
    mountedWrappers.push(wrapper);
    await flushPromises();

    expect(wrapper.findAll("[data-cart-badge]").map((badge) => badge.text())).toEqual(["3", "3"]);
  });

  it("synchronizes a changed global branch with the server cart", async () => {
    useAuthStore(pinia).$patch({
      user: {
        id: 708,
        name: "Customer",
        email: "customer@example.com",
        phone: null,
        avatar: null,
        role: "customer",
        role_label: "Khách hàng",
        branch_id: null,
        email_verified_at: null,
        created_at: "2026-08-14T00:00:00Z",
      },
      isInitialized: true,
    });
    useBranchPreferenceStore(pinia).$patch({
      branches: backendBranches.filter((branch) => branch.is_active),
      selectedBranchId: 6,
      status: "success",
      error: null,
    });
    const cartAtBranchSix = {
      id: 1,
      branch: { id: 6, name: "Mizuki Vĩnh Long", address: "Vĩnh Long" },
      totalQuantity: 1,
      totalAmount: 100000,
      discountAmount: 0,
      totalAfterDiscount: 100000,
      items: [],
    };
    cartApiMocks.getCustomerCart.mockResolvedValueOnce(cartAtBranchSix);
    cartApiMocks.selectCartBranch.mockResolvedValueOnce({
      ...cartAtBranchSix,
      branch: { id: 1, name: "Mizuki Ninh Kiều", address: "Cần Thơ" },
    });
    const router = createTestRouter();
    const wrapper = mount(CustomerLayout, {
      slots: { default: "<p>Nội dung</p>" },
      global: { plugins: [pinia, router] },
    });
    mountedWrappers.push(wrapper);
    await flushPromises();

    wrapper.getComponent(CustomerHeader).vm.$emit("selectBranch", {
      id: 1,
      name: "Mizuki Ninh Kiều",
      address: "Cần Thơ",
      note: "",
    });
    await flushPromises();

    expect(cartApiMocks.selectCartBranch).toHaveBeenCalledWith(1)
  });

  it("synchronizes a newly authenticated customer's unassigned cart with the existing global branch", async () => {
    const customer = (id: number) => ({
      id,
      name: "Customer",
      email: `customer-${id}@example.com`,
      phone: null,
      avatar: null,
      role: "customer" as const,
      role_label: "Khách hàng",
      branch_id: null,
      email_verified_at: null,
      created_at: "2026-08-14T00:00:00Z",
    });
    const cartAtVinhLong = {
      id: 1710,
      branch: { id: 6, name: "Mizuki Vĩnh Long", address: "Vĩnh Long" },
      totalQuantity: 1,
      totalAmount: 100000,
      discountAmount: 0,
      totalAfterDiscount: 100000,
      items: [],
    };
    const newlyLoadedCartWithoutBranch = {
      ...cartAtVinhLong,
      id: 1711,
      branch: undefined,
      items: [{ id: 9, quantity: 2 }],
    };
    useAuthStore(pinia).$patch({ user: customer(1710), isInitialized: true });
    useBranchPreferenceStore(pinia).$patch({
      branches: backendBranches.filter((branch) => branch.is_active),
      selectedBranchId: 6,
      status: "success",
      error: null,
    });
    window.localStorage.setItem(BRANCH_PREFERENCE_KEY, "6");
    cartApiMocks.getCustomerCart
      .mockResolvedValueOnce(cartAtVinhLong)
      .mockResolvedValueOnce(newlyLoadedCartWithoutBranch);
    cartApiMocks.selectCartBranch.mockResolvedValueOnce({
      ...newlyLoadedCartWithoutBranch,
      branch: cartAtVinhLong.branch,
    });

    const router = createTestRouter();
    const wrapper = mount(CustomerLayout, {
      slots: { default: "<p>Nội dung</p>" },
      global: { plugins: [pinia, router] },
    });
    mountedWrappers.push(wrapper);
    await flushPromises();

    useAuthStore(pinia).$patch({ user: customer(1711) });
    await flushPromises();

    expect(cartApiMocks.getCustomerCart).toHaveBeenCalledTimes(2);
    await vi.waitFor(() => {
      expect(cartApiMocks.selectCartBranch).toHaveBeenCalledTimes(1);
    });
    expect(cartApiMocks.selectCartBranch).toHaveBeenCalledWith(6);
  });
});
