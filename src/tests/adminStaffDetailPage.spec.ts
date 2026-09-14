import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { createPinia } from "pinia";
import { nextTick } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminStaffDetailPage from "@/pages/admin/AdminStaffDetailPage.vue";
import { useAuthStore } from "@/stores/auth";
import type { AdminStaffDetailRecord, AdminStaffRole, AdminStaffWorkArea } from "@/types/admin";
import type { AuthenticatedUser } from "@/types/auth";

const mocks = vi.hoisted(() => ({
  getAdminStaffDetail: vi.fn(),
  getAdminList: vi.fn(),
  preflightAdminStaffAssignment: vi.fn(),
  changeAdminStaffAssignment: vi.fn(),
  changeAdminStaffEmploymentStatus: vi.fn(),
  trashAdminStaff: vi.fn(),
  restoreAdminStaff: vi.fn(),
  updateAdminRecord: vi.fn(),
  uploadAdminImage: vi.fn(),
}));

vi.mock("@/api/adminApi", () => mocks);

const adminUser: AuthenticatedUser = {
  id: 1, name: "Super Admin", email: "admin@example.test", phone: null, avatar: null,
  role: "super_admin", role_label: "Quản trị viên hệ thống", branch_id: null,
  email_verified_at: "2026-09-01T00:00:00Z", created_at: "2026-08-01T00:00:00Z",
};
const branches = [
  { id: 7, code: "MZ-NK", name: "Mizuki Ninh Kiều" },
  { id: 8, code: "MZ-CR", name: "Mizuki Cái Răng" },
];
const rendition = "https://res.cloudinary.com/demo/image/upload/c_fill,w_256/avatar";
const original = "https://res.cloudinary.com/demo/image/upload/avatar";

function makeStaff(overrides: Partial<AdminStaffDetailRecord> = {}): AdminStaffDetailRecord {
  const base: AdminStaffDetailRecord = {
    id: 29,
    code: "NV-00029",
    name: "Local QA Super Admin",
    email: "qa@mizuki.test",
    phone: "0901000029",
    avatar: original,
    avatar_rendition_url: rendition,
    role: "technician",
    role_label: "Kỹ thuật viên",
    job_title: "Chuyên viên chăm sóc da",
    branch: branches[0]!,
    status: "working",
    status_label: "Đang làm việc",
    current_assignment: {
      id: 91, branch: branches[0]!, role: "technician", role_label: "Kỹ thuật viên",
      job_title: "Chuyên viên chăm sóc da", work_area: "clinic",
      effective_from: "2026-08-01T02:00:00Z", effective_to: null, reason: "Phân công ban đầu",
    },
    employment_started_at: "2026-07-15T00:00:00Z",
    employment_ended_at: null,
    permissions: { change_assignment: true, change_employment_status: true, trash: true, restore: false },
    allowed_actions: ["change_assignment", "change_employment_status", "trash"],
    history: {
      assignments: [
        { id: 91, branch: branches[0]!, role: "technician", role_label: "Kỹ thuật viên", job_title: "Chuyên viên chăm sóc da", work_area: "clinic", effective_from: "2026-08-01T02:00:00Z", effective_to: null, reason: "Phân công hiện tại" },
        { id: 90, branch: branches[1]!, role: "cashier", role_label: "Thu ngân", job_title: null, work_area: "retail", effective_from: "2026-07-15T02:00:00Z", effective_to: "2026-08-01T01:59:59Z", reason: null },
      ],
      events: [
        { id: 102, type: "assignment_changed", description: null, metadata: { before: { branch_id: 8, role: "cashier" }, after: { branch_id: 7, role: "technician" }, reason: "Điều chuyển chuyên môn" }, occurred_at: "2026-08-01T02:00:00Z", actor: { id: 1, name: "Super Admin" } },
        { id: 101, type: "account_created", description: "Tạo hồ sơ", metadata: null, occurred_at: "2026-07-15T02:00:00Z", actor: null },
      ],
    },
    created_at: "2026-07-15T02:00:00Z",
    updated_at: "2026-08-01T02:00:00Z",
  };
  return { ...base, ...overrides };
}

const wrappers: VueWrapper[] = [];

async function mountPage(staff = makeStaff(), detailImplementation?: () => Promise<AdminStaffDetailRecord>) {
  const pinia = createPinia();
  useAuthStore(pinia).$patch({ user: adminUser, isInitialized: true });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/admin/staff", component: { template: "<div>Staff list</div>" } },
      { path: "/admin/staff/:id", component: AdminStaffDetailPage },
    ],
  });
  await router.push("/admin/staff/29");
  await router.isReady();
  mocks.getAdminStaffDetail.mockImplementation(detailImplementation ?? (() => Promise.resolve(structuredClone(staff))));
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });
  const wrapper = mount(AdminStaffDetailPage, {
    attachTo: document.body,
    global: { plugins: [pinia, router, [VueQueryPlugin, { queryClient }]] },
  });
  wrappers.push(wrapper);
  await flushPromises();
  return { wrapper, router };
}

function appError(kind: "not-found" | "forbidden" | "validation" | "server", message: string, validationErrors?: Record<string, string[]>) {
  return { name: "ApplicationError" as const, kind, message, status: kind === "not-found" ? 404 : undefined, validationErrors, cause: null };
}
function bodyButton(testId: string): HTMLButtonElement {
  const button = document.body.querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`);
  expect(button).not.toBeNull();
  return button!;
}
async function clickBody(testId: string) {
  bodyButton(testId).click();
  await flushPromises();
}
async function setBodyValue(testId: string, value: string) {
  const control = document.body.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(`[data-testid="${testId}"]`);
  expect(control).not.toBeNull();
  control!.value = value;
  control!.dispatchEvent(new Event("input", { bubbles: true }));
  control!.dispatchEvent(new Event("change", { bubbles: true }));
  await nextTick();
}
async function openAction(testId: string) {
  bodyButton("staff-actions-menu").click();
  await nextTick();
  await clickBody(testId);
}
async function selectAvatarFile(file = new File(['image'], 'avatar.png', { type: 'image/png' })) {
  const input = document.body.querySelector<HTMLInputElement>('[data-testid="avatar-file"]')!;
  Object.defineProperty(input, 'files', { configurable: true, value: [file] });
  input.dispatchEvent(new Event('change', { bubbles: true }));
  await nextTick();
  return file;
}
function workStaff(role: AdminStaffRole, workArea: AdminStaffWorkArea): AdminStaffDetailRecord {
  const labels: Record<AdminStaffRole, string> = { cashier: "Thu ngân", sales_staff: "Nhân viên bán hàng", technician: "Kỹ thuật viên", branch_manager: "Quản lý chi nhánh", super_admin: "Quản trị viên hệ thống" };
  const staff = makeStaff({ role, role_label: labels[role], branch: role === "super_admin" ? null : branches[0]! });
  staff.current_assignment = { ...staff.current_assignment!, role, role_label: labels[role], work_area: workArea, branch: staff.branch };
  return staff;
}

beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = "";
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } });
  mocks.getAdminList.mockResolvedValue({ items: branches, pagination: { current_page: 1, per_page: 100, total: 2, last_page: 1 } });
  mocks.preflightAdminStaffAssignment.mockResolvedValue({ can_transfer: true, blockers: [] });
  mocks.changeAdminStaffAssignment.mockResolvedValue(makeStaff());
  mocks.changeAdminStaffEmploymentStatus.mockResolvedValue(makeStaff());
  mocks.trashAdminStaff.mockResolvedValue(makeStaff());
  mocks.restoreAdminStaff.mockResolvedValue(makeStaff());
  mocks.updateAdminRecord.mockResolvedValue(makeStaff());
  mocks.uploadAdminImage.mockResolvedValue({ upload_token: 'avatar-token', preview_url: 'https://media.test/preview', mime_type: 'image/png', size: 10 });
});

afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

describe("Admin Staff Detail V2", () => {
  it.each([
    ['name', 'Local QA Super Admin', 'Nguyễn Minh Anh'],
    ['email', 'qa@mizuki.test', 'other@mizuki.test'],
    ['phone', '0901000029', '0901234567'],
  ])('enables Save only when %s differs and disables on revert', async (field, originalValue, changedValue) => {
    await mountPage();
    await clickBody('edit-profile');
    expect(bodyButton('save-profile').disabled).toBe(true);
    await clickBody('save-profile');
    document.body.querySelector('[data-testid="profile-edit-form"]')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flushPromises();
    expect(mocks.updateAdminRecord).not.toHaveBeenCalled();
    await setBodyValue(`profile-${field}`, changedValue!);
    expect(bodyButton('save-profile').disabled).toBe(false);
    await setBodyValue(`profile-${field}`, originalValue!);
    expect(bodyButton('save-profile').disabled).toBe(true);
  });

  it.each([['name', ' '], ['email', 'bad-email'], ['phone', '1'.repeat(21)]])('disables invalid %s even when dirty', async (field, value) => {
    await mountPage();
    await clickBody('edit-profile');
    await setBodyValue(`profile-${field}`, value!);
    expect(bodyButton('save-profile').disabled).toBe(true);
    document.body.querySelector('[data-testid="profile-edit-form"]')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flushPromises();
    expect(mocks.updateAdminRecord).not.toHaveBeenCalled();
  });

  it('resets baseline after successful profile save and reopening', async () => {
    await mountPage();
    await clickBody('edit-profile');
    await setBodyValue('profile-name', 'Updated Name');
    mocks.getAdminStaffDetail.mockResolvedValue(makeStaff({ name: 'Updated Name' }));
    await clickBody('save-profile');
    await clickBody('edit-profile');
    expect(bodyButton('save-profile').disabled).toBe(true);
    expect((document.body.querySelector('[data-testid="profile-name"]') as HTMLInputElement).value).toBe('Updated Name');
    await setBodyValue('profile-name', 'Other');
    await setBodyValue('profile-name', 'Updated Name');
    expect(bodyButton('save-profile').disabled).toBe(true);
  });

  it('treats trimmed values and null/empty phone consistently', async () => {
    await mountPage(makeStaff({ phone: null }));
    await clickBody('edit-profile');
    await setBodyValue('profile-name', ' Local QA Super Admin ');
    await setBodyValue('profile-phone', ' ');
    expect(bodyButton('save-profile').disabled).toBe(true);
  });
  it('automatically uploads selection, patches only the token and refetches the avatar', async () => {
    const { wrapper } = await mountPage();
    await clickBody('edit-profile');
    await setBodyValue('profile-name', 'Unsaved profile name');
    mocks.getAdminStaffDetail.mockResolvedValue(makeStaff({ avatar: 'https://media.test/new', avatar_rendition_url: 'https://media.test/new-rendition' }));
    const file = await selectAvatarFile();
    expect(mocks.uploadAdminImage).toHaveBeenCalledWith(file);
    await flushPromises();
    expect(document.body.querySelector('[data-testid="save-avatar"]')).toBeNull();
    expect(mocks.updateAdminRecord).toHaveBeenCalledWith('staff', 29, { avatar_upload_token: 'avatar-token' });
    expect(mocks.getAdminStaffDetail).toHaveBeenCalledTimes(2);
    expect(wrapper.get('[data-testid="detail-avatar"]').attributes('src')).toBe('https://media.test/new-rendition');
    expect(document.body.querySelector('[data-testid="avatar-selection"]')).toBeNull();
    expect(document.body.textContent).toContain('Đã cập nhật ảnh đại diện.');
    expect((document.body.querySelector('[data-testid="profile-name"]') as HTMLInputElement).value).toBe('Unsaved profile name');
    expect(document.body.querySelector('[data-testid="avatar-progress"]')).toBeNull();
    expect(bodyButton('save-profile').disabled).toBe(false);
    await clickBody('save-profile');
    expect(mocks.updateAdminRecord).toHaveBeenLastCalledWith('staff', 29, { name: 'Unsaved profile name', email: 'qa@mizuki.test', phone: '0901000029' });
  });

  it.each(['upload', 'patch'] as const)('preserves avatar and profile drafts after %s failure', async (phase) => {
    const { wrapper } = await mountPage();
    await clickBody('edit-profile');
    await setBodyValue('profile-phone', '0901234567');
    const error = appError('validation', 'failed', { image: ['Ảnh không hợp lệ từ máy chủ'] });
    if (phase === 'upload') mocks.uploadAdminImage.mockRejectedValueOnce(error);
    else mocks.updateAdminRecord.mockRejectedValueOnce(error);
    await selectAvatarFile();
    await flushPromises();
    expect(document.body.textContent).toContain('Ảnh không hợp lệ từ máy chủ');
    expect(document.body.querySelector('[data-testid="profile-edit-form"]')).not.toBeNull();
    expect(wrapper.get('[data-testid="detail-avatar"]').attributes('src')).toBe(rendition);
    expect((document.body.querySelector('[data-testid="profile-phone"]') as HTMLInputElement).value).toBe('0901234567');
    expect(mocks.getAdminStaffDetail).toHaveBeenCalledTimes(1);
    if (phase === 'upload') expect(mocks.updateAdminRecord).not.toHaveBeenCalled();
    expect(document.body.querySelector('[data-testid="avatar-progress"]')).toBeNull();
    expect((document.body.querySelector('[data-testid="avatar-file"]') as HTMLInputElement).value).toBe('');
    expect(bodyButton('change-avatar').disabled).toBe(false);
    mocks.uploadAdminImage.mockResolvedValueOnce({ upload_token: 'fresh-token', preview_url: 'https://media.test/new-preview' });
    await selectAvatarFile();
    await flushPromises();
    expect(mocks.updateAdminRecord).toHaveBeenLastCalledWith('staff', 29, { avatar_upload_token: 'fresh-token' });
  });

  it('blocks duplicate uploads and profile saves through upload and patch phases', async () => {
    let finishUpload!: (value: unknown) => void;
    let finishPatch!: (value: unknown) => void;
    mocks.uploadAdminImage.mockImplementationOnce(() => new Promise(resolve => { finishUpload = resolve; }));
    mocks.updateAdminRecord.mockImplementationOnce(() => new Promise(resolve => { finishPatch = resolve; }));
    await mountPage();
    await clickBody('edit-profile');
    await selectAvatarFile();
    expect(document.body.querySelector('[data-testid="avatar-progress"]')?.textContent).toContain('Đang cập nhật ảnh');
    await selectAvatarFile();
    await clickBody('change-avatar');
    await clickBody('save-profile');
    expect(mocks.uploadAdminImage).toHaveBeenCalledTimes(1);
    expect(mocks.updateAdminRecord).not.toHaveBeenCalled();
    finishUpload({ upload_token: 'token', preview_url: 'https://media.test/preview' });
    await flushPromises();
    expect(document.body.querySelector('[data-testid="avatar-progress"]')?.textContent).toContain('Đang cập nhật ảnh');
    expect(bodyButton('change-avatar').disabled).toBe(true);
    await selectAvatarFile();
    expect(mocks.updateAdminRecord).toHaveBeenCalledTimes(1);
    finishPatch(makeStaff());
    await flushPromises();
  });

  it.each([
    new File(['text'], 'bad.txt', { type: 'text/plain' }),
    new File([], 'empty.png', { type: 'image/png' }),
    new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' }),
  ])('rejects invalid selection $name before uploading', async (file) => {
    await mountPage();
    await clickBody('edit-profile');
    await selectAvatarFile(file);
    expect(document.body.querySelector('[data-testid="avatar-error"]')).not.toBeNull();
    expect(document.body.querySelector('[data-testid="save-avatar"]')).toBeNull();
    expect(mocks.uploadAdminImage).not.toHaveBeenCalled();
  });

  it('keeps profile save pristine after avatar-only changes and clears temporary state', async () => {
    await mountPage();
    await clickBody('edit-profile');
    expect(bodyButton('save-profile').disabled).toBe(true);
    await selectAvatarFile();
    await flushPromises();
    expect(document.body.querySelector('[data-testid="avatar-preview"]')).toBeNull();
    expect(document.body.querySelector('[data-testid="avatar-selection"]')).toBeNull();
    expect(document.body.querySelector('[data-testid="save-avatar"]')).toBeNull();
    expect(document.body.textContent).not.toContain('Ảnh đã chọn · Chưa lưu');
    expect(bodyButton('save-profile').disabled).toBe(true);
    await clickBody('save-profile');
    expect(mocks.updateAdminRecord).toHaveBeenCalledTimes(1);
    expect(mocks.updateAdminRecord).toHaveBeenCalledWith('staff', 29, { avatar_upload_token: 'avatar-token' });
  });

  it('requires confirmation to remove, refetches and renders initials after success', async () => {
    const { wrapper } = await mountPage();
    await clickBody('edit-profile');
    await clickBody('remove-avatar');
    expect(mocks.updateAdminRecord).not.toHaveBeenCalled();
    await clickBody('cancel-remove-avatar');
    expect(document.body.querySelector('[data-testid="confirm-remove-avatar"]')).toBeNull();
    await clickBody('remove-avatar');
    mocks.getAdminStaffDetail.mockResolvedValue(makeStaff({ avatar: null, avatar_rendition_url: null }));
    await clickBody('confirm-remove-avatar');
    expect(mocks.updateAdminRecord).toHaveBeenCalledWith('staff', 29, { avatar: null });
    expect(mocks.getAdminStaffDetail).toHaveBeenCalledTimes(2);
    expect(wrapper.find('[data-testid="detail-avatar"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="detail-avatar-fallback"]').exists()).toBe(true);
    expect(document.body.querySelector('[data-testid="profile-avatar-fallback"]')).not.toBeNull();
    expect(document.body.querySelector('[data-testid="remove-avatar"]')).toBeNull();
    expect(document.body.textContent).toContain('Đã xóa ảnh đại diện.');
    expect(bodyButton('save-profile').disabled).toBe(true);
  });

  it('keeps stored avatar on remove failure and hides remove when initially missing', async () => {
    const { wrapper } = await mountPage();
    await clickBody('edit-profile');
    await clickBody('remove-avatar');
    mocks.updateAdminRecord.mockRejectedValueOnce(appError('server', 'Không thể xóa ảnh'));
    await clickBody('confirm-remove-avatar');
    expect(document.body.textContent).toContain('Không thể xóa ảnh');
    expect(wrapper.get('[data-testid="detail-avatar"]').attributes('src')).toBe(rendition);
    wrapper.unmount();
    await mountPage(makeStaff({ avatar: null, avatar_rendition_url: null }));
    await clickBody('edit-profile');
    expect(document.body.querySelector('[data-testid="remove-avatar"]')).toBeNull();
  });

  it.each([
    ['working', 'Đang làm việc', 'Đã nghỉ việc'],
    ['left', 'Đã nghỉ việc', 'Khôi phục trạng thái làm việc'],
  ] as const)('renders truthful %s header treatment and action label', async (status, statusLabel, actionLabel) => {
    const { wrapper } = await mountPage(makeStaff({ status, status_label: statusLabel }));
    const header = wrapper.get('.profile-header');
    expect(header.attributes('data-employment-state')).toBe(status);
    expect(header.classes().includes('profile-header-left')).toBe(status === 'left');
    expect(wrapper.get('[data-testid="detail-status"]').classes()).toContain(status === 'left' ? 'is-left' : 'is-working');
    await clickBody('staff-actions-menu');
    expect(bodyButton('change-status').textContent).toBe(actionLabel);
    expect(document.body.textContent).not.toContain('Thay đổi trạng thái công tác');
    expect(document.body.textContent).not.toContain('Thay ảnh');
  });

  it('restores active header after returning a left employee to working', async () => {
    const { wrapper } = await mountPage(makeStaff({ status: 'left', status_label: 'Đã nghỉ việc' }));
    await openAction('change-status');
    mocks.getAdminStaffDetail.mockResolvedValue(makeStaff());
    await clickBody('confirm-status');
    expect(mocks.changeAdminStaffEmploymentStatus).toHaveBeenCalledWith(29, 'working');
    expect(wrapper.get('.profile-header').classes()).not.toContain('profile-header-left');
    expect(wrapper.get('.profile-header').attributes('data-employment-state')).toBe('working');
  });

  it('hides Edit Profile scrollbar while retaining the scrollable dialog', async () => {
    await mountPage();
    await clickBody('edit-profile');
    const dialog = document.body.querySelector('[role="dialog"]')!;
    expect(dialog.classList.contains('[scrollbar-width:none]')).toBe(true);
    expect(dialog.classList.contains('overflow-y-auto')).toBe(true);
    expect(dialog.classList.contains('overflow-hidden')).toBe(false);
    expect(dialog.querySelector('[data-testid="save-profile"]')).not.toBeNull();
  });

  it.each([
    ["technician", "clinic", "Phòng khám"], ["cashier", "retail", "Bán hàng"],
    ["sales_staff", "retail", "Bán hàng"], ["branch_manager", "management", "Quản lý"],
    ["super_admin", "system", "Toàn hệ thống"],
  ] as const)("uses staff identity and translated area for %s", async (role, area, label) => {
    const { wrapper } = await mountPage(workStaff(role, area));
    expect(wrapper.text()).toContain("MIZUKI STAFF");
    expect(wrapper.findAll('[role="tab"]')).toHaveLength(3);
    expect(wrapper.get('.context-area').text()).toBe(label);
    expect(wrapper.get('[data-testid="information-tab"]').text()).toContain(label);
    expect(wrapper.text()).toContain("15/07/2026");
    expect(wrapper.text()).toContain("01/08/2026 09:00");
    expect(wrapper.text()).not.toContain("thg");
  });

  it("presents deferred clinic services without duplicated identity or fake data/actions", async () => {
    const { wrapper } = await mountPage();
    await clickBody("tab-work");
    const panel = wrapper.get('[data-testid="work-tab"]');
    expect(panel.text()).toContain("Chuyên môn & dịch vụ phụ trách");
    expect(panel.text()).toContain("Nhóm nghiệp vụ");
    expect(panel.text()).toContain("Dịch vụ phụ trách");
    expect(panel.text()).toContain("Clinic Services");
    expect(panel.find('button').attributes('disabled')).toBeDefined();
    expect(panel.find('button').attributes('aria-describedby')).toBe('services-deferred');
    expect(panel.text()).not.toMatch(/Mizuki Ninh Kiều|Kỹ thuật viên|Chuyên viên chăm sóc da|01\/08\/2026|\d+\s+dịch vụ/);
    await panel.get('button').trigger('click');
    expect(mocks.updateAdminRecord).not.toHaveBeenCalled();
    expect(mocks.changeAdminStaffAssignment).not.toHaveBeenCalled();
    expect(mocks.getAdminList).toHaveBeenCalledTimes(1);
    expect(mocks.getAdminList.mock.calls[0]![0]).toBe('branches');
  });

  it.each([
    ['cashier', 'retail', 'Phạm vi bán hàng'], ['sales_staff', 'retail', 'Phạm vi bán hàng'],
    ['branch_manager', 'management', 'Phạm vi quản lý'], ['super_admin', 'system', 'Phạm vi hệ thống'],
  ] as const)('keeps %s scope concise and without clinic controls', async (role, area, title) => {
    const { wrapper } = await mountPage(workStaff(role, area));
    await clickBody('tab-work');
    const panel = wrapper.get('[data-testid="work-tab"]');
    expect(panel.get('h2').text()).toBe(title);
    expect(panel.text()).not.toMatch(/Mizuki Ninh Kiều|Phân công từ|Chuyên viên chăm sóc da|Quản lý dịch vụ/);
    expect(panel.find('button').exists()).toBe(false);
  });

  it('places direct avatar and real controls in Edit Profile only', async () => {
    await mountPage();
    await clickBody('staff-actions-menu');
    expect(document.body.textContent).not.toContain('Thay ảnh');
    await clickBody('staff-actions-menu');
    await clickBody('edit-profile');
    const form = document.body.querySelector('[data-testid="profile-edit-form"]')!;
    expect(form.querySelector('[data-testid="profile-avatar"]')?.getAttribute('src')).toBe(rendition);
    const photos = [...form.querySelectorAll<HTMLButtonElement>('button')].filter((button) => /Thay ảnh|Xóa ảnh/.test(button.textContent ?? ''));
    expect(photos).toHaveLength(2);
    expect(photos.every(button => !button.disabled)).toBe(true);
    const picker = form.querySelector<HTMLInputElement>('input[type="file"]')!;
    expect(picker.accept).toBe('image/jpeg,image/png,image/webp');
    const openPicker = vi.spyOn(picker, 'click');
    await clickBody('change-avatar');
    expect(openPicker).toHaveBeenCalledOnce();
    expect(mocks.uploadAdminImage).not.toHaveBeenCalled();
    expect(mocks.updateAdminRecord).not.toHaveBeenCalled();
    form.querySelector('[data-testid="profile-avatar"]')!.dispatchEvent(new Event('error'));
    await nextTick();
    expect(form.querySelector('img')?.getAttribute('src')).toBe(original);
    form.querySelector('img')!.dispatchEvent(new Event('error'));
    await nextTick();
    expect(form.querySelector('img')).toBeNull();
    expect(form.querySelector('[data-testid="profile-avatar-fallback"]')?.textContent).toBe('SA');
  });

  it('omits copy buttons for missing values and renders initials in profile', async () => {
    const { wrapper } = await mountPage(makeStaff({ code: '', email: null, phone: null, avatar: null, avatar_rendition_url: null }));
    expect(wrapper.findAll('button[aria-label^="Sao chép"]')).toHaveLength(0);
    await clickBody('edit-profile');
    expect(document.body.querySelector('[data-testid="profile-avatar"]')).toBeNull();
    expect(document.body.querySelector('[data-testid="profile-avatar-fallback"]')).not.toBeNull();
  });

  it.each([
    ['technician', 'Phòng khám'], ['cashier', 'Bán hàng'], ['sales_staff', 'Bán hàng'],
    ['branch_manager', 'Quản lý'], ['super_admin', 'Toàn hệ thống'],
  ] as const)('derives read-only work area for assignment role %s', async (role, label) => {
    await mountPage();
    await clickBody('change-assignment');
    await setBodyValue('assignment-role', role);
    expect(document.body.querySelector('[data-testid="assignment-work-area"]')?.textContent).toBe(label);
    expect(document.body.querySelector('select[data-testid="assignment-work-area"]')).toBeNull();
    expect(document.body.querySelector('input[type="date"]')).toBeNull();
    expect(document.body.textContent).toContain('Có hiệu lực ngay sau khi xác nhận');
    expect(document.body.querySelectorAll('.step-track span')).toHaveLength(2);
    expect(document.body.querySelector('[data-testid="confirm-assignment"]')).toBeNull();
    if (role === 'super_admin') {
      expect(document.body.querySelector('[data-testid="assignment-branch"]')).toBeNull();
      expect(document.body.querySelector('[data-testid="assignment-system-scope"]')?.textContent).toBe('Toàn hệ thống');
      await clickBody('run-preflight');
      expect(mocks.preflightAdminStaffAssignment).toHaveBeenCalledWith(29, expect.objectContaining({ branch_id: null, role, work_area: 'system' }));
    }
  });

  it('requires a new preflight after returning from confirmation and shows POS blockers', async () => {
    await mountPage();
    await clickBody('change-assignment');
    await clickBody('run-preflight');
    const back = [...document.body.querySelectorAll<HTMLButtonElement>('[data-testid="assignment-review"] button')].find((button) => button.textContent === 'Chỉnh sửa')!;
    back.click();
    await nextTick();
    await setBodyValue('assignment-role', 'cashier');
    expect(document.body.querySelector('[data-testid="confirm-assignment"]')).toBeNull();
    mocks.preflightAdminStaffAssignment.mockResolvedValueOnce({ can_transfer: false, blockers: [{ type: 'pos_sessions', count: 1, message: 'Phiên POS còn mở', action: 'close_session' }] });
    await clickBody('run-preflight');
    expect(mocks.preflightAdminStaffAssignment).toHaveBeenCalledTimes(2);
    expect(document.body.textContent).toContain('Phiên bán hàng chưa kết thúc');
    expect(document.body.querySelector('[data-testid="assignment-review"]')).toBeNull();
    expect(mocks.changeAdminStaffAssignment).not.toHaveBeenCalled();
  });

  it('stays in the form on preflight failure and prevents duplicate pending requests', async () => {
    let reject!: (reason: unknown) => void;
    mocks.preflightAdminStaffAssignment.mockImplementationOnce(() => new Promise((_resolve, fail) => { reject = fail; }));
    await mountPage();
    await clickBody('change-assignment');
    await clickBody('run-preflight');
    expect(bodyButton('run-preflight').disabled).toBe(true);
    expect((document.body.querySelector('[data-testid="assignment-role"]') as HTMLSelectElement).disabled).toBe(true);
    await clickBody('run-preflight');
    expect(mocks.preflightAdminStaffAssignment).toHaveBeenCalledTimes(1);
    reject(appError('server', 'Không thể kiểm tra lúc này'));
    await flushPromises();
    expect(document.body.textContent).toContain('Không thể kiểm tra lúc này');
    expect(document.body.querySelector('[data-testid="confirm-assignment"]')).toBeNull();
  });

  it('groups assignment and field events into one dated transaction while retaining initial period', async () => {
    const record = makeStaff();
    const primary = record.history.events[0]!;
    record.history.events.push(
      { ...primary, id: 103, type: 'role_changed', metadata: { from: 'cashier', to: 'technician', reason: primary.metadata!.reason } },
      { ...primary, id: 104, type: 'branch_changed', metadata: { from: 8, to: 7, reason: primary.metadata!.reason } },
      { ...primary, id: 105, type: 'job_title_changed', metadata: { from: null, to: 'Chuyên viên chăm sóc da', reason: primary.metadata!.reason } },
    );
    const { wrapper } = await mountPage(record);
    await clickBody('tab-history');
    const panel = wrapper.get('[data-testid="history-tab"]');
    expect(panel.text()).toContain('Hành trình công tác.');
    expect(panel.findAll('[data-kind="assignment_changed"]')).toHaveLength(1);
    expect(panel.findAll('[data-kind="role_changed"], [data-kind="branch_changed"], [data-kind="job_title_changed"]')).toHaveLength(0);
    expect(panel.findAll('[data-testid="assignment-history"]')).toHaveLength(1);
    const transaction = panel.get('[data-kind="assignment_changed"]');
    expect(transaction.findAll('.career-change')).toHaveLength(3);
    expect(transaction.text()).toContain('Người thực hiện: Super Admin');
    expect(transaction.text()).toContain('Lý do: Điều chuyển chuyên môn');
    expect(transaction.text()).toContain('01/08/2026');
    expect(panel.get('[data-testid="assignment-history"]').text()).toContain('15/07/2026');
  });

  it('uses assignment IDs without merging different transactions at the same instant', async () => {
    const record = makeStaff();
    const primary = record.history.events[0]!;
    Object.assign(primary.metadata!, { assignment_id: 91 });
    record.history.events.push({ ...primary, id: 110, type: 'role_changed', metadata: { from: 'cashier', to: 'technician', reason: primary.metadata!.reason } });
    const other = { ...primary, id: 111, type: 'job_title_changed', metadata: { from: 'A', to: 'B', reason: primary.metadata!.reason } };
    Object.assign(other.metadata, { assignment_id: 999 });
    record.history.events.push(other);
    const { wrapper } = await mountPage(record);
    await clickBody('tab-history');
    expect(wrapper.findAll('[data-kind="assignment_changed"]')).toHaveLength(1);
    expect(wrapper.findAll('[data-kind="job_title_changed"]')).toHaveLength(1);
    expect(wrapper.findAll('[data-testid="assignment-history"]')).toHaveLength(1);
  });

  it('does not collapse different actors, reasons or timestamps into a transaction', async () => {
    const record = makeStaff();
    const first = record.history.events[0]!;
    record.history.events.push(
      { ...first, id: 103, actor: { id: 2, name: 'Other Admin' } },
      { ...first, id: 104, metadata: { ...first.metadata, reason: 'Khác' } },
      { ...first, id: 105, occurred_at: '2026-08-02T02:00:00Z' },
    );
    const { wrapper } = await mountPage(record);
    await clickBody('tab-history');
    expect(wrapper.findAll('[data-kind="assignment_changed"]')).toHaveLength(4);
  });

  it("activates History with a real click when the live response omits detail extensions", async () => {
    const record: Partial<AdminStaffDetailRecord> = makeStaff();
    delete record.history;
    delete record.code;
    delete record.permissions;
    delete record.allowed_actions;
    delete record.status;
    delete record.status_label;
    const { wrapper } = await mountPage(record as AdminStaffDetailRecord);
    await clickBody("tab-history");
    expect(wrapper.get('[data-testid="history-tab"]').isVisible()).toBe(true);
    expect(wrapper.get('[data-testid="tab-history"]').attributes("aria-selected")).toBe("true");
    expect(wrapper.text()).toContain("Chưa có dữ liệu phân công.");
    expect(wrapper.find('[data-testid="copy-detail-code"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="edit-profile"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain("undefined");
    await clickBody("tab-work");
    await clickBody("tab-information");
    expect(wrapper.get('[data-testid="information-tab"]').isVisible()).toBe(true);
  });

  it("activates every panel through real button clicks while retaining profile actions", async () => {
    const { wrapper } = await mountPage();
    for (const tab of ["work", "history", "information"]) {
      await clickBody(`tab-${tab}`);
      expect(wrapper.get(`[data-testid='${tab}-tab']`).isVisible()).toBe(true);
      expect(wrapper.get(`[data-testid='tab-${tab}']`).attributes("aria-selected")).toBe("true");
      expect(wrapper.findAll('[role="tabpanel"]')).toHaveLength(1);
      expect(wrapper.get('[role="tabpanel"]').attributes("aria-labelledby")).toBe(`staff-tab-${tab}`);
      expect(wrapper.findAll(".identity-copy h1")).toHaveLength(1);
      expect(wrapper.get('[data-testid="edit-profile"]').isVisible()).toBe(true);
    }
  });

  it("supports keyboard tab navigation and roving focus", async () => {
    const { wrapper } = await mountPage();
    await wrapper.get('[data-testid="tab-information"]').trigger("keydown", { key: "End" });
    await nextTick();
    expect(wrapper.get('[data-testid="history-tab"]').isVisible()).toBe(true);
    expect(document.activeElement?.id).toBe("staff-tab-history");
    await wrapper.get('[data-testid="tab-history"]').trigger("keydown", { key: "ArrowLeft" });
    await nextTick();
    expect(document.activeElement?.id).toBe("staff-tab-work");
    await wrapper.get('[data-testid="tab-work"]').trigger("keydown", { key: "Home" });
    await nextTick();
    expect(document.activeElement?.id).toBe("staff-tab-information");
    await wrapper.get('[data-testid="tab-information"]').trigger("keydown", { key: "ArrowRight" });
    await nextTick();
    expect(document.activeElement?.id).toBe("staff-tab-work");
    expect(wrapper.findAll('[role="tab"][tabindex="0"]')).toHaveLength(1);
  });

  it("offers only purposeful copy controls with titles and visible feedback", async () => {
    const { wrapper } = await mountPage();
    const buttons = wrapper.findAll('button[aria-label^="Sao chép"]');
    expect(buttons).toHaveLength(3);
    expect(buttons.every((button) => Boolean(button.attributes("title")))).toBe(true);
    expect(wrapper.findAll('.context-zone button[aria-label^="Sao chép"]')).toHaveLength(0);
    await clickBody("copy-detail-code");
    expect(wrapper.text()).toContain("Đã sao chép");
  });

  it("prefills and saves only basic profile fields, then refetches the displayed identity", async () => {
    const { wrapper } = await mountPage();
    await clickBody("edit-profile");
    const form = document.body.querySelector('[data-testid="profile-edit-form"]')!;
    expect([...form.querySelectorAll<HTMLInputElement>('input:not([type="file"])')].map((input) => input.value)).toEqual(["Local QA Super Admin", "qa@mizuki.test", "0901000029"]);
    expect(form.querySelectorAll('select, [data-testid^="assignment-"]')).toHaveLength(0);
    expect(form.textContent).not.toMatch(/Vai trò|Chi nhánh|Chức danh|Khu vực làm việc/);
    await setBodyValue("profile-name", "Nguyễn Minh Anh");
    await setBodyValue("profile-phone", "");
    mocks.getAdminStaffDetail.mockResolvedValue(makeStaff({ name: "Nguyễn Minh Anh", phone: null }));
    await clickBody("save-profile");
    expect(mocks.updateAdminRecord).toHaveBeenCalledWith("staff", 29, { name: "Nguyễn Minh Anh", email: "qa@mizuki.test", phone: null });
    expect(mocks.getAdminStaffDetail).toHaveBeenCalledTimes(2);
    expect(wrapper.get("h1").text()).toBe("Nguyễn Minh Anh");
    expect(wrapper.text()).toContain("Đã cập nhật hồ sơ nhân viên.");
    expect(mocks.preflightAdminStaffAssignment).not.toHaveBeenCalled();
    expect(mocks.changeAdminStaffAssignment).not.toHaveBeenCalled();
  });

  it("validates profile input and renders backend 422 field errors without closing", async () => {
    await mountPage();
    await clickBody("edit-profile");
    await setBodyValue("profile-name", " ");
    await setBodyValue("profile-email", "invalid");
    await clickBody("save-profile");
    expect(mocks.updateAdminRecord).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("Vui lòng nhập họ và tên.");
    expect(document.body.textContent).toContain("Vui lòng nhập email hợp lệ.");
    await setBodyValue("profile-name", "Local QA Super Admin");
    await setBodyValue("profile-email", "taken@mizuki.test");
    mocks.updateAdminRecord.mockRejectedValueOnce(appError("validation", "Thông tin không hợp lệ", { email: ["Email này đã được sử dụng."] }));
    await clickBody("save-profile");
    expect(document.body.querySelector('#profile-error-email')?.textContent).toBe("Email này đã được sử dụng.");
    expect(document.body.querySelector('[data-testid="profile-email"]')?.getAttribute("aria-invalid")).toBe("true");
    expect(mocks.getAdminStaffDetail).toHaveBeenCalledTimes(1);
  });

  it("cancels profile changes and respects backend management permissions", async () => {
    const first = await mountPage();
    await clickBody("edit-profile");
    await setBodyValue("profile-name", "Unsaved");
    const cancel = [...document.body.querySelectorAll<HTMLButtonElement>('[data-testid="profile-edit-form"] button')].find((button) => button.textContent === "Hủy")!;
    cancel.click();
    await flushPromises();
    expect(mocks.updateAdminRecord).not.toHaveBeenCalled();
    expect(first.wrapper.get('h1').text()).toBe("Local QA Super Admin");
    first.wrapper.unmount();
    const { wrapper } = await mountPage(makeStaff({ permissions: { change_assignment: false, change_employment_status: false, trash: false, restore: false }, allowed_actions: [] }));
    expect(wrapper.find('[data-testid="edit-profile"]').exists()).toBe(false);
  });

  it("disables profile inputs and repeated saves while a save is pending", async () => {
    let finish!: (value: AdminStaffDetailRecord) => void;
    mocks.updateAdminRecord.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    await mountPage();
    await clickBody("edit-profile");
    await setBodyValue("profile-name", "Changed Name");
    await clickBody("save-profile");
    expect(bodyButton("save-profile").disabled).toBe(true);
    expect(bodyButton("save-profile").textContent).toContain("Đang lưu");
    expect((document.body.querySelector('[data-testid="profile-name"]') as HTMLInputElement).disabled).toBe(true);
    await clickBody("save-profile");
    expect(mocks.updateAdminRecord).toHaveBeenCalledTimes(1);
    finish(makeStaff());
    await flushPromises();
  });

  it("keeps assignment periods useful when lifecycle events are absent", async () => {
    const staff = makeStaff();
    staff.history.events = [];
    const { wrapper } = await mountPage(staff);
    await clickBody("tab-history");
    expect(wrapper.findAll('[data-testid="assignment-history"]')).toHaveLength(2);
    expect(wrapper.text()).toContain("Phân công hiện tại");
    expect(wrapper.text()).not.toContain("assignment_changed");
    expect(wrapper.text()).not.toContain('"branch_id"');
  });

  it("shows a loading skeleton while the detail request is pending", async () => {
    const { wrapper } = await mountPage(makeStaff(), () => new Promise(() => undefined));
    expect(wrapper.find("[data-testid='detail-loading']").exists()).toBe(true);
  });

  it("renders the information hierarchy, direct Cloudinary avatar, status, dates, and copy actions", async () => {
    const { wrapper } = await mountPage();
    expect(wrapper.get("h1").text()).toBe("Local QA Super Admin");
    expect(wrapper.get("[data-testid='detail-avatar']").attributes("src")).toBe(rendition);
    expect(wrapper.get("[data-testid='detail-status']").text()).toBe("Đang làm việc");
    expect(wrapper.text()).toContain("Chuyên viên chăm sóc da");
    expect(wrapper.text()).toContain("Mizuki Ninh Kiều");
    expect(wrapper.text()).toContain("Bắt đầu công tác");
    await wrapper.get("[data-testid='copy-detail-code']").trigger("click");
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("NV-00029");
  });

  it("falls back from rendition to original and then to initials without a broken image", async () => {
    const { wrapper } = await mountPage();
    await wrapper.get("[data-testid='detail-avatar']").trigger("error");
    expect(wrapper.get("[data-testid='detail-avatar']").attributes("src")).toBe(original);
    await wrapper.get("[data-testid='detail-avatar']").trigger("error");
    expect(wrapper.find("[data-testid='detail-avatar']").exists()).toBe(false);
    expect(wrapper.get("[data-testid='detail-avatar-fallback']").text()).toBe("SA");
  });

  it("renders distinct 404 and forbidden states", async () => {
    const first = await mountPage(makeStaff(), () => Promise.reject(appError("not-found", "missing")));
    expect(first.wrapper.text()).toContain("Không tìm thấy nhân viên");
    first.wrapper.unmount();
    document.body.innerHTML = "";
    const second = await mountPage(makeStaff(), () => Promise.reject(appError("forbidden", "denied")));
    expect(second.wrapper.text()).toContain("Bạn không có quyền xem hồ sơ này");
  });

  it("offers retry for a generic API failure", async () => {
    mocks.getAdminStaffDetail.mockRejectedValueOnce(appError("server", "unavailable")).mockResolvedValueOnce(makeStaff());
    const { wrapper } = await mountPage(makeStaff(), mocks.getAdminStaffDetail);
    expect(wrapper.text()).toContain("Không thể tải hồ sơ nhân viên");
    await wrapper.get("[data-testid='detail-error'] button").trigger("click");
    await flushPromises();
    expect(wrapper.text()).toContain("Local QA Super Admin");
    expect(mocks.getAdminStaffDetail).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["technician", "clinic", "clinic-expertise"],
    ["cashier", "retail", "retail-scope"],
    ["sales_staff", "retail", "retail-scope"],
    ["branch_manager", "management", "management-scope"],
    ["super_admin", "system", "system-scope"],
  ] as const)("renders the role-aware work view for %s", async (role, area, testId) => {
    const { wrapper } = await mountPage(workStaff(role, area));
    await wrapper.get("[data-testid='tab-work']").trigger("click");
    expect(wrapper.find(`[data-testid='${testId}']`).exists()).toBe(true);
  });

  it("renders assignment and lifecycle history newest first with actor and reason", async () => {
    const { wrapper } = await mountPage();
    await wrapper.get("[data-testid='tab-history']").trigger("click");
    const assignments = wrapper.findAll("[data-testid='assignment-history']");
    expect(assignments).toHaveLength(1);
    expect(assignments[0]!.text()).toContain("Mizuki Cái Răng");
    expect(wrapper.text()).toContain("Mizuki Cái Răng → Mizuki Ninh Kiều");
    expect(wrapper.text()).toContain("Người thực hiện: Super Admin");
    expect(wrapper.text()).toContain("Lý do: Điều chuyển chuyên môn");
  });

  it("shows explicit empty states when history is unavailable", async () => {
    const { wrapper } = await mountPage(makeStaff({ history: { assignments: [], events: [] } }));
    await wrapper.get("[data-testid='tab-history']").trigger("click");
    expect(wrapper.text()).toContain("Chưa có dữ liệu phân công");
    expect(wrapper.text()).toContain("Chưa có dấu mốc vòng đời nhân viên");
  });

  it("hides management actions when backend permissions deny them", async () => {
    const denied = makeStaff({ permissions: { change_assignment: false, change_employment_status: false, trash: false, restore: false }, allowed_actions: [] });
    const { wrapper } = await mountPage(denied);
    expect(wrapper.find("[data-testid='change-assignment']").exists()).toBe(false);
    expect(wrapper.find("[data-testid='staff-actions-menu']").exists()).toBe(false);
  });

  it("validates assignment locally and maps role to its truthful work area", async () => {
    const { wrapper } = await mountPage();
    await wrapper.get("[data-testid='change-assignment']").trigger("click");
    await setBodyValue("assignment-role", "sales_staff");
    expect(document.body.querySelector("[data-testid='assignment-work-area']")?.textContent).toBe("Bán hàng");
    expect(document.body.querySelector("select[data-testid='assignment-work-area']")).toBeNull();
    await setBodyValue("assignment-branch", "");
    await clickBody("run-preflight");
    expect(document.body.textContent).toContain("Vui lòng chọn chi nhánh");
    expect(mocks.preflightAdminStaffAssignment).not.toHaveBeenCalled();
  });

  it("runs preflight first and blocks confirmation when open responsibilities exist", async () => {
    mocks.preflightAdminStaffAssignment.mockResolvedValue({ can_transfer: false, blockers: [{ type: "appointments", count: 3, message: "Còn lịch hẹn", action: "reassign_appointments" }] });
    const { wrapper } = await mountPage();
    await wrapper.get("[data-testid='change-assignment']").trigger("click");
    await clickBody("run-preflight");
    expect(mocks.preflightAdminStaffAssignment).toHaveBeenCalledWith(29, expect.objectContaining({ branch_id: 7, role: "technician", work_area: "clinic" }));
    expect(document.body.textContent).toContain("Cần chuyển giao các lịch hẹn");
    expect(document.body.querySelector("[data-testid='continue-review']")).toBeNull();
    expect(mocks.changeAdminStaffAssignment).not.toHaveBeenCalled();
  });

  it("reviews, confirms, refetches, and reports a successful assignment", async () => {
    const { wrapper } = await mountPage();
    await wrapper.get("[data-testid='change-assignment']").trigger("click");
    await setBodyValue("assignment-branch", "8");
    await setBodyValue("assignment-role", "cashier");
    await setBodyValue("assignment-job-title", "Thu ngân trưởng");
    expect(document.body.querySelector('input[type="date"]')).toBeNull();
    await setBodyValue("assignment-reason", "Điều chỉnh vận hành");
    await clickBody("run-preflight");
    expect(document.body.querySelector('[data-testid="continue-review"]')).toBeNull();
    expect(document.body.querySelector('[data-testid="assignment-review"]')).not.toBeNull();
    expect(document.body.textContent).toContain("Đã kiểm tra — Không có trách nhiệm cần xử lý");
    expect(document.body.textContent).toContain("Phân công mới");
    await clickBody("confirm-assignment");
    expect(mocks.changeAdminStaffAssignment).toHaveBeenCalledWith(29, expect.objectContaining({
      branch_id: 8, role: "cashier", job_title: "Thu ngân trưởng", work_area: "retail",
      reason: "Điều chỉnh vận hành",
    }));
    expect(mocks.getAdminStaffDetail).toHaveBeenCalledTimes(2);
    expect(mocks.changeAdminStaffAssignment.mock.calls[0]![1]).not.toHaveProperty("effective_from");
    expect(wrapper.get("[data-testid='success-message']").text()).toContain("Đã cập nhật phân công");
  });

  it("supports both employment-state directions and surfaces backend validation", async () => {
    const first = await mountPage();
    await openAction("change-status");
    await clickBody("confirm-status");
    expect(mocks.changeAdminStaffEmploymentStatus).toHaveBeenCalledWith(29, "left");
    first.wrapper.unmount();
    document.body.innerHTML = "";

    mocks.changeAdminStaffEmploymentStatus.mockRejectedValueOnce(appError("validation", "blocked", { status: ["Cần tạo phân công hiện tại trước."] }));
    await mountPage(makeStaff({ status: "left", status_label: "Đã nghỉ việc" }));
    await openAction("change-status");
    await clickBody("confirm-status");
    expect(mocks.changeAdminStaffEmploymentStatus).toHaveBeenLastCalledWith(29, "working");
    expect(document.body.textContent).toContain("Cần tạo phân công hiện tại trước.");
  });

  it("trashes with confirmation and returns to the staff list", async () => {
    const { router } = await mountPage();
    await openAction("trash-staff");
    expect(document.body.textContent).toContain("Đây không phải là thao tác đánh dấu nghỉ việc");
    await clickBody("confirm-trash");
    expect(mocks.trashAdminStaff).toHaveBeenCalledWith(29);
    expect(router.currentRoute.value.path).toBe("/admin/staff");
  });

  it("keeps the trash dialog open and displays a backend failure", async () => {
    mocks.trashAdminStaff.mockRejectedValueOnce(appError("validation", "blocked", { staff: ["Nhân viên còn trách nhiệm đang mở."] }));
    await mountPage();
    await openAction("trash-staff");
    await clickBody("confirm-trash");
    expect(document.body.textContent).toContain("Nhân viên còn trách nhiệm đang mở.");
    expect(document.body.querySelector("[data-testid='confirm-trash']")).not.toBeNull();
  });
});
