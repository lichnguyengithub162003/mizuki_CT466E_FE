<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import {
  AlertTriangle, ArrowDown, ArrowLeft, BriefcaseBusiness, Building2,
  CalendarClock, Camera, Check, ChevronDown, Clipboard, Ellipsis, History,
  MapPinned, Network, Pencil, RefreshCw, RotateCcw, Stethoscope,
  Store, Trash2,
} from "@lucide/vue";
import { useQuery } from "@tanstack/vue-query";
import BaseDialog from "@/components/common/BaseDialog.vue";
import BasePopover from "@/components/common/BasePopover.vue";
import BaseSkeleton from "@/components/common/BaseSkeleton.vue";
import {
  changeAdminStaffAssignment, changeAdminStaffEmploymentStatus, getAdminStaffDetail,
  getAdminList, preflightAdminStaffAssignment, restoreAdminStaff, trashAdminStaff,
  updateAdminRecord, uploadAdminImage,
} from "@/api/adminApi";
import { useAuthStore } from "@/stores/auth";
import {
  isApplicationError, type AdminRecord, type AdminStaffAssignmentPayload,
  type AdminStaffDetailRecord, type AdminStaffLifecycleEvent,
  type AdminStaffRole, type AdminStaffStatus, type AdminStaffWorkArea,
} from "@/types/admin";

interface BranchOption extends AdminRecord { code: string; name: string }
type TabKey = "information" | "work" | "history";
type DetailPermission = keyof AdminStaffDetailRecord["permissions"];

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const staffId = computed(() => Number(route.params.id));
const activeTab = ref<TabKey>("information");
const actionMenuOpen = ref(false);
const copiedField = ref<"code" | "email" | "phone" | null>(null);
const successMessage = ref("");
let copyTimer: number | undefined;
let successTimer: number | undefined;

const detailQuery = useQuery({
  queryKey: computed(() => ["admin", "staff", "detail", staffId.value]),
  queryFn: () => getAdminStaffDetail(staffId.value),
  enabled: computed(() => Number.isInteger(staffId.value) && staffId.value > 0),
  retry: false,
});
const staff = computed(() => detailQuery.data.value ?? null);
const isNotFound = computed(() => isApplicationError(detailQuery.error.value) && detailQuery.error.value.kind === "not-found");
const isForbidden = computed(() => isApplicationError(detailQuery.error.value) && detailQuery.error.value.kind === "forbidden");
const isSuperAdmin = computed(() => auth.user?.role === "super_admin");
function actionAllowed(permission: DetailPermission): boolean {
  return Boolean(staff.value?.permissions?.[permission] || staff.value?.allowed_actions?.includes(permission));
}
// These backend capabilities share the same manageability rule as basic profile updates.
const canEditProfile = computed(() => actionAllowed("change_assignment") || actionAllowed("change_employment_status") || actionAllowed("trash"));
const profileOpen = ref(false);
const profileBusy = ref(false);
const avatarPhase = ref<"idle" | "uploading" | "saving" | "removing">("idle");
const avatarBusy = computed(() => avatarPhase.value !== "idle");
const profileLocked = computed(() => profileBusy.value || avatarBusy.value);
const profileDialogOpen = computed({
  get: () => profileOpen.value,
  set: (open: boolean) => { if (!profileLocked.value) profileOpen.value = open; },
});
const avatarInput = ref<HTMLInputElement | null>(null);
const selectedAvatar = ref<File | null>(null);
const avatarError = ref("");
const avatarMessage = ref("");
const avatarRemoveConfirm = ref(false);
const hasStoredAvatar = computed(() => Boolean(staff.value?.avatar?.trim() || staff.value?.avatar_rendition_url?.trim()));
let avatarRequest = 0;
function clearAvatarSelection(): void {
  selectedAvatar.value = null;
  if (avatarInput.value) avatarInput.value.value = "";
}
function resetAvatarEditor(): void {
  avatarRequest += 1;
  clearAvatarSelection();
  avatarPhase.value = "idle";
  avatarError.value = "";
  avatarMessage.value = "";
  avatarRemoveConfirm.value = false;
}
watch(profileOpen, (open) => { if (!open) resetAvatarEditor(); });
watch(staffId, () => { profileOpen.value = false; resetAvatarEditor(); });
onBeforeUnmount(resetAvatarEditor);
function chooseAvatar(): void {
  if (profileLocked.value || !canEditProfile.value) return;
  avatarInput.value?.click();
}
function selectAvatar(event: Event): void {
  if (profileLocked.value || !canEditProfile.value) return;
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  clearAvatarSelection();
  avatarError.value = "";
  avatarMessage.value = "";
  avatarRemoveConfirm.value = false;
  // The shared uploader delegates validation to the server; this is a conservative UI guard.
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    avatarError.value = "Vui lòng chọn ảnh JPEG, PNG hoặc WebP.";
    return;
  }
  if (!file.size || file.size > 5 * 1024 * 1024) {
    avatarError.value = "Ảnh phải có dung lượng lớn hơn 0 và không quá 5 MB.";
    return;
  }
  selectedAvatar.value = file;
  void saveAvatar();
}
async function saveAvatar(remove = false): Promise<void> {
  if (!canEditProfile.value || profileLocked.value || !profileOpen.value) return;
  if (remove ? !avatarRemoveConfirm.value || !hasStoredAvatar.value : !selectedAvatar.value) return;
  const id = staffId.value;
  const request = ++avatarRequest;
  const file = selectedAvatar.value;
  avatarError.value = "";
  avatarMessage.value = "";
  avatarPhase.value = remove ? "removing" : "uploading";
  try {
    let payload: { avatar: null } | { avatar_upload_token: string };
    if (remove) payload = { avatar: null };
    else {
      const uploaded = await uploadAdminImage(file!);
      if (request !== avatarRequest || id !== staffId.value) return;
      if (!uploaded.upload_token) throw new Error("Missing upload token");
      // Tokens are request-local: a retry uploads again and never reuses a consumed token.
      payload = { avatar_upload_token: uploaded.upload_token };
      avatarPhase.value = "saving";
    }
    await updateAdminRecord<AdminStaffDetailRecord>("staff", id, payload);
    if (request !== avatarRequest || id !== staffId.value) return;
    clearAvatarSelection();
    avatarRemoveConfirm.value = false;
    const refreshed = await detailQuery.refetch();
    if (request !== avatarRequest || id !== staffId.value) return;
    if (refreshed.error) {
      avatarError.value = "Ảnh đã được cập nhật nhưng chưa tải lại được hồ sơ. Vui lòng mở lại hồ sơ để kiểm tra.";
      return;
    }
    avatarMessage.value = remove ? "Đã xóa ảnh đại diện." : "Đã cập nhật ảnh đại diện.";
    showSuccess(avatarMessage.value);
  } catch (error) {
    if (request === avatarRequest) avatarError.value = mutationMessage(error, remove ? "Không thể xóa ảnh đại diện. Vui lòng thử lại." : "Không thể cập nhật ảnh đại diện. Vui lòng thử lại.");
  } finally {
    if (request === avatarRequest) {
      clearAvatarSelection();
      avatarPhase.value = "idle";
    }
  }
}
const profileError = ref("");
const profileErrors = reactive<Record<string, string>>({});
const profileForm = reactive({ name: "", email: "", phone: "" });
const originalProfile = reactive({ name: "", email: "", phone: "" });
const profileFields = ["name", "email", "phone"] as const;
const profileDirty = computed(() => profileFields.some(field => profileForm[field].trim() !== originalProfile[field].trim()));
const profileValidation = computed<Record<string, string>>(() => {
  const errors: Record<string, string> = {};
  if (!profileForm.name.trim()) errors.name = "Vui lòng nhập họ và tên.";
  else if (profileForm.name.trim().length > 255) errors.name = "Họ và tên không được vượt quá 255 ký tự.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileForm.email.trim())) errors.email = "Vui lòng nhập email hợp lệ.";
  else if (profileForm.email.trim().length > 255) errors.email = "Email không được vượt quá 255 ký tự.";
  if (profileForm.phone.trim().length > 20) errors.phone = "Số điện thoại không được vượt quá 20 ký tự.";
  return errors;
});
const canSaveProfile = computed(() => canEditProfile.value && profileDirty.value && !profileLocked.value && Object.keys(profileValidation.value).length === 0);
for (const field of profileFields) watch(() => profileForm[field], () => {
  delete profileErrors[field];
  if (profileOpen.value && profileValidation.value[field]) profileErrors[field] = profileValidation.value[field]!;
});
function syncProfileValues(preserveEdits = false): void {
  if (!staff.value) return;
  for (const field of profileFields) {
    const next = staff.value[field] ?? "";
    if (!preserveEdits || profileForm[field].trim() === originalProfile[field].trim()) profileForm[field] = next;
    originalProfile[field] = next;
  }
}
// Avatar refetches update the baseline without discarding unsaved profile edits.
watch(() => staff.value, () => { if (profileOpen.value) syncProfileValues(true); });
function openProfile(): void {
  if (!staff.value || !canEditProfile.value || profileLocked.value) return;
  resetAvatarEditor();
  syncProfileValues();
  Object.keys(profileErrors).forEach((key) => delete profileErrors[key]);
  profileError.value = "";
  profileOpen.value = true;
}
async function saveProfile(): Promise<void> {
  if (!canSaveProfile.value) return;
  Object.keys(profileErrors).forEach((key) => delete profileErrors[key]);
  profileBusy.value = true;
  profileError.value = "";
  try {
    await updateAdminRecord<AdminStaffDetailRecord>("staff", staffId.value, {
      name: profileForm.name.trim(), email: profileForm.email.trim(), phone: profileForm.phone.trim() || null,
    });
    const refreshed = await detailQuery.refetch();
    if (refreshed.error) {
      profileError.value = "Hồ sơ đã được lưu nhưng chưa tải lại được. Vui lòng mở lại hồ sơ để kiểm tra.";
      return;
    }
    syncProfileValues();
    profileOpen.value = false;
    showSuccess("Đã cập nhật hồ sơ nhân viên.");
  } catch (error) {
    profileError.value = mutationMessage(error, "Không thể cập nhật hồ sơ. Vui lòng thử lại.");
    if (isApplicationError(error)) for (const [field, messages] of Object.entries(error.validationErrors ?? {})) profileErrors[field] = messages[0] ?? error.message;
  } finally { profileBusy.value = false; }
}

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "information", label: "Thông tin" },
  { key: "work", label: "Công việc & chuyên môn" },
  { key: "history", label: "Lịch sử" },
];
const tabRail = ref<HTMLElement | null>(null);
async function navigateTabs(event: KeyboardEvent, index: number): Promise<void> {
  let target = index;
  if (event.key === "ArrowRight") target = (index + 1) % tabs.length;
  else if (event.key === "ArrowLeft") target = (index + tabs.length - 1) % tabs.length;
  else if (event.key === "Home") target = 0;
  else if (event.key === "End") target = tabs.length - 1;
  else return;
  event.preventDefault();
  activeTab.value = tabs[target]!.key;
  await nextTick();
  tabRail.value?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[target]?.focus();
}
const roleOptions: Array<{ value: AdminStaffRole; label: string }> = [
  { value: "cashier", label: "Thu ngân" },
  { value: "sales_staff", label: "Nhân viên bán hàng" },
  { value: "technician", label: "Kỹ thuật viên" },
  { value: "branch_manager", label: "Quản lý chi nhánh" },
  { value: "super_admin", label: "Quản trị viên hệ thống" },
];
const branchManagerRoles = roleOptions.filter((option) => ["cashier", "sales_staff", "technician"].includes(option.value));
const availableRoles = computed(() => isSuperAdmin.value ? roleOptions : branchManagerRoles);
const workAreaByRole: Record<AdminStaffRole, AdminStaffWorkArea> = {
  cashier: "retail", sales_staff: "retail", technician: "clinic",
  branch_manager: "management", super_admin: "system",
};
const workAreaLabels: Record<AdminStaffWorkArea, string> = {
  clinic: "Phòng khám", retail: "Bán hàng", management: "Quản lý", system: "Toàn hệ thống",
};
const roleLabels = Object.fromEntries(roleOptions.map((option) => [option.value, option.label])) as Record<AdminStaffRole, string>;

const branchOptionsQuery = useQuery({
  queryKey: ["admin", "staff", "detail-branch-options"],
  queryFn: () => getAdminList<BranchOption>("branches", { is_active: 1, per_page: 100 }),
  enabled: computed(() => Boolean(staff.value && isSuperAdmin.value && actionAllowed("change_assignment"))),
  staleTime: 5 * 60 * 1000,
});
const branchOptions = computed<BranchOption[]>(() => {
  if (isSuperAdmin.value) {
    const candidates = [staff.value?.branch, ...(branchOptionsQuery.data.value?.items ?? [])].filter(
      (branch): branch is BranchOption => Boolean(branch),
    );
    return [...new Map(candidates.map((branch) => [branch.id, branch])).values()];
  }
  return staff.value?.branch ? [staff.value.branch] : [];
});

const avatarCandidateIndex = ref(0);
const avatarSignature = computed(() => [staff.value?.avatar_rendition_url, staff.value?.avatar]
  .map((value) => value?.trim() ?? "")
  .filter((value, index, values) => Boolean(value) && values.indexOf(value) === index)
  .join("\u0000"));
const avatarCandidates = computed(() => avatarSignature.value ? avatarSignature.value.split("\u0000") : []);
const avatarUrl = computed(() => avatarCandidates.value[avatarCandidateIndex.value] ?? null);
watch([avatarSignature, staffId, detailQuery.dataUpdatedAt], () => { avatarCandidateIndex.value = 0; });
function handleAvatarError(event: Event): void {
  const failedSource = (event.currentTarget as HTMLImageElement).getAttribute("src") ?? "";
  if (failedSource === avatarUrl.value) avatarCandidateIndex.value += 1;
}
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(-2).map((part) => part[0]?.toUpperCase()).join("") || "NV";
}
function formatDate(value?: string | null, withTime = false): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "2-digit", year: "numeric",
    ...(withTime ? { hour: "2-digit" as const, minute: "2-digit" as const, hourCycle: "h23" as const } : {}),
    timeZone: "Asia/Ho_Chi_Minh",
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("day")}/${part("month")}/${part("year")}${withTime ? ` ${part("hour")}:${part("minute")}` : ""}`;
}
function showSuccess(message: string): void {
  successMessage.value = message;
  window.clearTimeout(successTimer);
  successTimer = window.setTimeout(() => { successMessage.value = ""; }, 3500);
}
async function copyValue(field: "code" | "email" | "phone", value?: string | null): Promise<void> {
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
    copiedField.value = field;
    window.clearTimeout(copyTimer);
    copyTimer = window.setTimeout(() => { copiedField.value = null; }, 1700);
  } catch { /* clipboard denial leaves the control unchanged */ }
}
onBeforeUnmount(() => { window.clearTimeout(copyTimer); window.clearTimeout(successTimer); });

function workArea(staffMember: AdminStaffDetailRecord): AdminStaffWorkArea {
  return staffMember.current_assignment?.work_area ?? workAreaByRole[staffMember.role];
}
function workAreaDescription(staffMember: AdminStaffDetailRecord): string {
  const area = workArea(staffMember);
  if (area === "clinic") return "Phục vụ hoạt động chuyên môn và chăm sóc khách hàng tại phòng khám.";
  if (area === "retail") return "Phục vụ vận hành bán lẻ, tư vấn và giao dịch tại chi nhánh.";
  if (area === "management") return "Chịu trách nhiệm điều phối hoạt động trong phạm vi chi nhánh.";
  return "Quản trị và điều phối hoạt động trên toàn hệ thống Mizuki.";
}

const assignmentOpen = ref(false);
const assignmentStep = ref<1 | 2>(1);
const assignmentBusy = ref(false);
const assignmentError = ref("");
const assignmentErrors = reactive<Record<string, string>>({});
const preflight = ref<Awaited<ReturnType<typeof preflightAdminStaffAssignment>> | null>(null);
const assignmentForm = reactive({
  branch_id: "", role: "technician" as AdminStaffRole, job_title: "",
  reason: "",
});
watch(() => assignmentForm.role, (role) => {
  if (role === "super_admin") assignmentForm.branch_id = "";
});
function openAssignment(): void {
  if (!staff.value || !actionAllowed("change_assignment")) return;
  assignmentForm.branch_id = staff.value.branch ? String(staff.value.branch.id) : "";
  assignmentForm.role = staff.value.role;
  assignmentForm.job_title = staff.value.job_title ?? "";
  assignmentForm.reason = "";
  assignmentStep.value = 1;
  preflight.value = null;
  assignmentError.value = "";
  Object.keys(assignmentErrors).forEach((key) => delete assignmentErrors[key]);
  assignmentOpen.value = true;
}
function assignmentPayload(): AdminStaffAssignmentPayload {
  return {
    branch_id: assignmentForm.role === "super_admin" ? null : Number(assignmentForm.branch_id),
    role: assignmentForm.role,
    job_title: assignmentForm.job_title.trim() || null,
    work_area: workAreaByRole[assignmentForm.role],
    reason: assignmentForm.reason.trim() || null,
  };
}
function validateAssignment(): boolean {
  Object.keys(assignmentErrors).forEach((key) => delete assignmentErrors[key]);
  if (assignmentForm.role !== "super_admin" && !assignmentForm.branch_id) assignmentErrors.branch_id = "Vui lòng chọn chi nhánh cho nhân viên.";
  return Object.keys(assignmentErrors).length === 0;
}
function mutationMessage(error: unknown, fallback: string): string {
  if (!isApplicationError(error)) return fallback;
  return Object.values(error.validationErrors ?? {}).flat()[0] ?? error.message;
}
function captureAssignmentError(error: unknown): void {
  assignmentError.value = mutationMessage(error, "Không thể hoàn tất thao tác. Vui lòng thử lại.");
  if (isApplicationError(error)) {
    for (const [field, messages] of Object.entries(error.validationErrors ?? {})) assignmentErrors[field] = messages[0] ?? error.message;
  }
}
async function runPreflight(): Promise<void> {
  if (assignmentBusy.value || !validateAssignment()) return;
  preflight.value = null;
  assignmentBusy.value = true;
  assignmentError.value = "";
  try {
    preflight.value = await preflightAdminStaffAssignment(staffId.value, assignmentPayload());
    assignmentStep.value = 2;
  } catch (error) { captureAssignmentError(error); }
  finally { assignmentBusy.value = false; }
}
async function submitAssignment(): Promise<void> {
  if (assignmentBusy.value || assignmentStep.value !== 2 || !preflight.value?.can_transfer) return;
  assignmentBusy.value = true;
  assignmentError.value = "";
  try {
    await changeAdminStaffAssignment(staffId.value, assignmentPayload());
    assignmentOpen.value = false;
    await detailQuery.refetch();
    showSuccess("Đã cập nhật phân công nhân viên.");
  } catch (error) { captureAssignmentError(error); }
  finally { assignmentBusy.value = false; }
}
const selectedBranch = computed(() => branchOptions.value.find((branch) => String(branch.id) === assignmentForm.branch_id) ?? null);
const assignmentChangedSignificantly = computed(() => Boolean(staff.value && (
  staff.value.role !== assignmentForm.role || String(staff.value.branch?.id ?? "") !== assignmentForm.branch_id
)));
function blockerTitle(type: string): string {
  if (type === "appointments") return "Lịch hẹn đang hoạt động";
  if (type === "pos_sessions") return "Phiên bán hàng chưa kết thúc";
  return "Trách nhiệm chưa hoàn tất";
}
function blockerGuidance(type: string): string {
  if (type === "appointments") return "Cần chuyển giao các lịch hẹn trước khi thay đổi phân công.";
  if (type === "pos_sessions") return "Vui lòng hoàn tất hoặc bàn giao phiên POS trước.";
  return "Vui lòng xử lý trách nhiệm đang mở trước khi tiếp tục.";
}

const statusOpen = ref(false);
const statusBusy = ref(false);
const statusError = ref("");
const targetStatus = computed<AdminStaffStatus>(() => staff.value?.status === "working" ? "left" : "working");
async function submitStatus(): Promise<void> {
  statusBusy.value = true;
  statusError.value = "";
  try {
    const status = targetStatus.value;
    await changeAdminStaffEmploymentStatus(staffId.value, status);
    statusOpen.value = false;
    await detailQuery.refetch();
    showSuccess(status === "left" ? "Đã cập nhật nhân viên nghỉ việc." : "Đã đưa nhân viên trở lại làm việc.");
  } catch (error) { statusError.value = mutationMessage(error, "Không thể cập nhật trạng thái làm việc."); }
  finally { statusBusy.value = false; }
}

const trashOpen = ref(false);
const trashBusy = ref(false);
const trashError = ref("");
async function submitTrash(): Promise<void> {
  trashBusy.value = true;
  trashError.value = "";
  try {
    await trashAdminStaff(staffId.value);
    trashOpen.value = false;
    await router.push("/admin/staff");
  } catch (error) { trashError.value = mutationMessage(error, "Không thể đưa nhân viên vào thùng rác."); }
  finally { trashBusy.value = false; }
}
async function submitRestore(): Promise<void> {
  if (!actionAllowed("restore")) return;
  try {
    await restoreAdminStaff(staffId.value);
    await detailQuery.refetch();
    showSuccess("Đã khôi phục nhân viên.");
  } catch (error) { showSuccess(mutationMessage(error, "Không thể khôi phục nhân viên.")); }
}

const sortedAssignments = computed(() => [...(staff.value?.history?.assignments ?? [])]
  .sort((a, b) => Date.parse(b.effective_from ?? "") - Date.parse(a.effective_from ?? "")));
const sortedEvents = computed(() => [...(staff.value?.history?.events ?? [])]
  .sort((a, b) => Date.parse(b.occurred_at ?? "") - Date.parse(a.occurred_at ?? "")));
const assignmentEventTypes = new Set(["assignment_changed", "branch_transferred", "branch_changed", "role_changed", "job_title_changed", "work_area_changed"]);
function eventAssignmentId(event: AdminStaffLifecycleEvent): unknown {
  // Read optional transaction linkage without inventing or modifying the API contract.
  const metadata = event.metadata as (AdminStaffLifecycleEvent["metadata"] & { assignment_id?: unknown });
  return metadata?.assignment_id;
}
function sameInstant(left: string | null, right: string | null): boolean {
  return Boolean(left && right && Number.isFinite(Date.parse(left)) && Date.parse(left) === Date.parse(right));
}
const careerTimeline = computed(() => {
  const groups: AdminStaffLifecycleEvent[][] = [];
  for (const event of sortedEvents.value) {
    const group = assignmentEventTypes.has(event.type) && groups.find((members) => {
      const first = members[0];
      if (!first || !assignmentEventTypes.has(first.type)) return false;
      const rightId = eventAssignmentId(event);
      if (rightId != null && members.some((member) => eventAssignmentId(member) != null && String(eventAssignmentId(member)) !== String(rightId))) return false;
      // A timestamp alone is not enough: keep unrelated actors/reasons separate.
      return sameInstant(first.occurred_at, event.occurred_at)
        && first.actor?.id === event.actor?.id
        && first.metadata?.reason === event.metadata?.reason;
    });
    if (group) group.push(event);
    else groups.push([event]);
  }
  const represented = new Set<number>();
  const eventEntries = groups.map((events) => {
    const primary = events.find((event) => event.type === "assignment_changed") ?? events[0]!;
    const assignment = assignmentEventTypes.has(primary.type) ? sortedAssignments.value.find((item) => events.some((event) => {
      const id = eventAssignmentId(event);
      if (id != null) return String(id) === String(item.id) && sameInstant(item.effective_from, event.occurred_at);
      if (!sameInstant(item.effective_from, event.occurred_at)) return false;
      const after = event.metadata?.after;
      const fields = ["branch_id", "role", "job_title", "work_area"] as const;
      const state = { branch_id: item.branch?.id ?? null, role: item.role, job_title: item.job_title, work_area: item.work_area };
      const supplied = fields.filter((field) => after && field in after);
      return supplied.length > 0 && supplied.every((field) => after?.[field] === state[field]);
    })) : undefined;
    if (assignment) represented.add(assignment.id);
    return {
      key: `event-${primary.id}`, date: primary.occurred_at,
      kind: assignmentEventTypes.has(primary.type) && events.length > 1 ? "assignment_changed" : primary.type,
      assignment: null, event: primary, events, period: assignment ?? null,
    };
  });
  return [
    ...sortedAssignments.value.filter((assignment) => !represented.has(assignment.id)).map((assignment) => ({
      key: `assignment-${assignment.id}`, date: assignment.effective_from, kind: "assignment", assignment,
      event: null, events: [] as AdminStaffLifecycleEvent[], period: null,
    })),
    ...eventEntries,
  ].sort((a, b) => (Date.parse(b.date ?? "") || 0) - (Date.parse(a.date ?? "") || 0));
});
const eventLabels: Record<string, string> = {
  account_created: "Bắt đầu công tác", assignment_changed: "Thay đổi phân công",
  branch_transferred: "Chuyển chi nhánh", branch_changed: "Chuyển chi nhánh", role_changed: "Thay đổi vai trò",
  job_title_changed: "Thay đổi chức danh", employment_status_changed: "Thay đổi trạng thái làm việc",
  trashed: "Đưa vào thùng rác", restored: "Khôi phục nhân viên",
};
function eventTitle(event: AdminStaffLifecycleEvent): string { return eventLabels[event.type] ?? event.description ?? "Cập nhật hồ sơ nhân viên"; }
function branchLabel(value: unknown): string {
  if (value == null) return "Toàn hệ thống";
  const id = Number(value);
  const known = [staff.value?.branch, ...(staff.value?.history?.assignments?.map((item) => item.branch) ?? []), ...branchOptions.value]
    .find((branch) => branch?.id === id);
  return known?.name ?? `Chi nhánh #${id}`;
}
function eventValue(field: string, value: unknown): string {
  if (field === "branch_id") return branchLabel(value);
  if (field === "role") return roleLabels[value as AdminStaffRole] ?? String(value ?? "—");
  if (field === "work_area") return workAreaLabels[value as AdminStaffWorkArea] ?? String(value ?? "—");
  if (field === "employment_status") return value === "working" ? "Đang làm việc" : value === "left" ? "Đã nghỉ việc" : String(value ?? "—");
  return String(value || "—");
}
function eventChanges(event: AdminStaffLifecycleEvent): string[] {
  const metadata = event.metadata;
  if (!metadata) return [];
  const labels: Record<string, string> = { branch_id: "Chi nhánh", role: "Vai trò", job_title: "Chức danh", work_area: "Khu vực làm việc", employment_status: "Trạng thái công tác" };
  const change = (field: string, before: unknown, after: unknown) => `${labels[field]}: ${eventValue(field, before)} → ${eventValue(field, after)}`;
  if (metadata.before && metadata.after) {
    return ["branch_id", "role", "job_title", "work_area", "employment_status"]
      .filter((field) => metadata.before?.[field as keyof typeof metadata.before] !== metadata.after?.[field as keyof typeof metadata.after])
      .map((field) => change(field, metadata.before?.[field as keyof typeof metadata.before], metadata.after?.[field as keyof typeof metadata.after]));
  }
  if ("from" in metadata || "to" in metadata) {
    const field = ["branch_transferred", "branch_changed"].includes(event.type) ? "branch_id" : event.type === "role_changed" ? "role" : event.type === "work_area_changed" ? "work_area" : event.type === "employment_status_changed" ? "employment_status" : "job_title";
    return [change(field, metadata.from, metadata.to)];
  }
  return [];
}
</script>

<template>
  <section class="staff-detail min-h-full min-w-0 pb-8" aria-label="Chi tiết nhân viên" data-testid="staff-detail-page">
    <div v-if="detailQuery.isPending.value" data-testid="detail-loading" class="space-y-4 p-4"><BaseSkeleton class="h-64 w-full rounded-3xl" /><BaseSkeleton class="h-72 w-full rounded-3xl" /></div>
    <div v-else-if="detailQuery.isError.value" data-testid="detail-error" class="detail-error">
      <AlertTriangle class="size-6" />
      <h1>{{ isNotFound ? 'Không tìm thấy nhân viên' : isForbidden ? 'Bạn không có quyền xem hồ sơ này' : 'Không thể tải hồ sơ nhân viên' }}</h1>
      <p>{{ isNotFound ? 'Hồ sơ có thể đã được chuyển vào thùng rác hoặc không tồn tại.' : isForbidden ? 'Vui lòng liên hệ quản trị viên nếu bạn cần quyền truy cập.' : 'Kết nối có thể đang gián đoạn. Hãy thử tải lại.' }}</p>
      <button v-if="!isNotFound && !isForbidden" type="button" class="primary-button" @click="detailQuery.refetch()">Thử lại</button>
      <RouterLink to="/admin/staff">Danh sách nhân viên</RouterLink>
    </div>
    <div v-else-if="staff" class="profile-workspace">
      <header class="profile-header" :data-employment-state="staff.status" :class="{ 'profile-header-left': staff.status === 'left' }">
        <div class="profile-topline">
          <RouterLink to="/admin/staff" class="back-link"><ArrowLeft class="size-4" /> Danh sách nhân viên</RouterLink>
          <span class="eyebrow">Mizuki / Hồ sơ nhân sự</span>
        </div>
        <div class="profile-composition">
          <div class="identity-zone">
            <span class="identity-monogram" aria-hidden="true">{{ initials(staff.name) }}</span>
            <div class="portrait-column">
              <div class="staff-portrait">
                <img v-if="avatarUrl" :key="avatarUrl" :src="avatarUrl" :alt="`Ảnh đại diện ${staff.name}`" data-testid="detail-avatar" @error="handleAvatarError" />
                <span v-else data-testid="detail-avatar-fallback">{{ initials(staff.name) }}</span>
              </div>
              <span class="portrait-caption">MIZUKI STAFF</span>
            </div>
            <div class="identity-copy">
              <p class="eyebrow">Hồ sơ nhân viên</p>
              <h1>{{ staff.name }}</h1>
              <p class="identity-role">{{ staff.role_label }}</p>
              <p v-if="staff.job_title?.trim()" class="identity-job">{{ staff.job_title }}</p>
              <div class="identity-footnote">
                <button v-if="staff.code" type="button" class="code-copy" data-testid="copy-detail-code" :aria-label="`Sao chép mã nhân viên ${staff.code}`" title="Sao chép mã nhân viên" @click="copyValue('code', staff.code)">
                  {{ staff.code }} <Check v-if="copiedField === 'code'" class="size-3.5" /><Clipboard v-else class="size-3.5" />
                </button>
                <span v-if="copiedField === 'code'" role="status" class="copy-feedback">Đã sao chép</span>
                <span v-else-if="staff.employment_started_at">Gia nhập {{ formatDate(staff.employment_started_at) }}</span>
              </div>
            </div>
          </div>
          <aside class="context-zone" aria-label="Phân công và thao tác">
            <span data-testid="detail-status" class="employment-state" :class="staff.status === 'working' ? 'is-working' : staff.status === 'left' ? 'is-left' : 'is-unknown'"><i aria-hidden="true"></i>{{ staff.status_label || 'Chưa có trạng thái công tác' }}</span>
            <div class="context-branch"><Building2 class="size-5" /><div><p class="eyebrow">{{ staff.branch ? 'Chi nhánh hiện tại' : 'Phạm vi quản trị' }}</p><p>{{ staff.branch?.name ?? 'Toàn hệ thống' }}</p></div></div>
            <p class="context-area"><MapPinned class="size-4" />{{ workAreaLabels[workArea(staff)] }}</p>
            <div class="profile-actions">
              <button v-if="canEditProfile" type="button" data-testid="edit-profile" class="primary-button" @click="openProfile"><Pencil class="size-4" />Chỉnh sửa hồ sơ</button>
              <BasePopover v-if="actionAllowed('change_employment_status') || actionAllowed('trash') || actionAllowed('restore')" v-model="actionMenuOpen" align="end" class="w-60 p-2"><template #trigger><button type="button" aria-label="Mở menu thao tác nhân viên" data-testid="staff-actions-menu" class="grid size-10 place-items-center rounded-xl bg-surface-subtle text-muted-foreground ring-1 ring-black/[0.04] hover:bg-primary-50 hover:text-primary-900"><Ellipsis class="size-5" /></button></template><div class="grid gap-1"><button v-if="actionAllowed('change_employment_status')" type="button" data-testid="change-status" class="detail-menu-item" @click="actionMenuOpen = false; statusError = ''; statusOpen = true"><RotateCcw class="size-4" />{{ staff.status === 'working' ? 'Đã nghỉ việc' : 'Khôi phục trạng thái làm việc' }}</button><button v-if="actionAllowed('restore')" type="button" class="detail-menu-item" @click="actionMenuOpen = false; submitRestore()"><RefreshCw class="size-4" />Khôi phục nhân viên</button><button v-if="actionAllowed('trash')" type="button" data-testid="trash-staff" class="detail-menu-item text-rose-700 hover:bg-rose-50" @click="actionMenuOpen = false; trashError = ''; trashOpen = true"><Trash2 class="size-4" />Đưa vào thùng rác</button></div></BasePopover>
              <button v-if="actionAllowed('change_assignment')" type="button" data-testid="change-assignment" class="assignment-link" @click="openAssignment">Thay đổi phân công <ArrowDown class="size-3.5 -rotate-90" /></button>
            </div>
          </aside>
        </div>
        <div ref="tabRail" role="tablist" aria-label="Nội dung hồ sơ nhân viên" class="staff-tabs">
          <button v-for="(tab, index) in tabs" :id="`staff-tab-${tab.key}`" :key="tab.key" type="button" role="tab" :aria-selected="activeTab === tab.key" :aria-controls="`staff-panel-${tab.key}`" :tabindex="activeTab === tab.key ? 0 : -1" :data-testid="`tab-${tab.key}`" @click="activeTab = tab.key" @keydown="navigateTabs($event, index)"><span class="tab-index" aria-hidden="true">0{{ index + 1 }}</span>{{ tab.label }}</button>
        </div>
      </header>
      <p v-if="successMessage" role="status" data-testid="success-message" class="success-notice"><Check class="size-4" />{{ successMessage }}</p>
      <section :id="`staff-panel-${activeTab}`" :key="activeTab" role="tabpanel" :aria-labelledby="`staff-tab-${activeTab}`" tabindex="0" class="profile-content">
        <div v-if="activeTab === 'information'" data-testid="information-tab" class="information-layout">
          <aside class="metadata-rail">
            <section aria-labelledby="contact-title">
              <p class="section-index">01 / Kết nối</p><h2 id="contact-title">Liên hệ</h2>
              <dl class="contact-list">
                <div v-for="field in (['email', 'phone'] as const)" :key="field" class="info-row">
                  <dt>{{ field === 'email' ? 'Email' : 'Số điện thoại' }}</dt>
                  <dd><span>{{ staff[field] || 'Chưa cập nhật' }}</span><button v-if="staff[field]" type="button" :aria-label="field === 'email' ? 'Sao chép email' : 'Sao chép số điện thoại'" :title="field === 'email' ? 'Sao chép email' : 'Sao chép số điện thoại'" @click="copyValue(field, staff[field])"><Check v-if="copiedField === field" /><Clipboard v-else /></button></dd>
                  <span v-if="copiedField === field" role="status" class="copy-feedback">Đã sao chép</span>
                </div>
              </dl>
            </section>
            <section class="account-section" aria-labelledby="account-title">
              <p class="section-index">02 / Hồ sơ hệ thống</p><h2 id="account-title">Tài khoản</h2>
              <dl><div class="info-row"><dt>Ngày tạo tài khoản</dt><dd>{{ formatDate(staff.created_at, true) }}</dd></div><div class="info-row"><dt>Cập nhật gần nhất</dt><dd>{{ formatDate(staff.updated_at, true) }}</dd></div></dl>
            </section>
          </aside>
          <section class="employment-panel" aria-labelledby="employment-title">
            <div class="section-intro"><div><p class="section-index">03 / Hành trình tại Mizuki</p><h2 id="employment-title">Thông tin công tác</h2></div><BriefcaseBusiness class="size-5" /></div>
            <div class="assignment-statement"><span class="eyebrow">Phân công hiện tại</span><h3>{{ staff.branch?.name ?? 'Toàn hệ thống' }}</h3><p>{{ workAreaDescription(staff) }}</p></div>
            <dl class="employment-details"><div class="info-row"><dt>Vai trò</dt><dd>{{ staff.role_label }}</dd></div><div class="info-row"><dt>Khu vực làm việc</dt><dd>{{ workAreaLabels[workArea(staff)] }}</dd></div><div v-if="staff.job_title" class="info-row employment-title"><dt>Chức danh</dt><dd>{{ staff.job_title }}</dd></div></dl>
            <div class="employment-dates"><div><CalendarClock class="size-4" /><p>Bắt đầu công tác</p><strong>{{ formatDate(staff.employment_started_at) }}</strong></div><div><p>Phân công hiện tại từ</p><strong>{{ formatDate(staff.current_assignment?.effective_from) }}</strong></div><div v-if="staff.employment_ended_at"><p>Kết thúc công tác</p><strong>{{ formatDate(staff.employment_ended_at) }}</strong></div></div>
          </section>
        </div>
        <div v-else-if="activeTab === 'work'" data-testid="work-tab" class="work-layout" :data-area="workArea(staff)">
          <template v-if="staff.role === 'technician'">
            <section class="work-intro" data-testid="clinic-expertise">
              <p class="section-index">Không gian chuyên môn</p>
              <div class="work-heading"><span class="work-icon"><Stethoscope /></span><h2>Chuyên môn &amp; dịch vụ phụ trách</h2></div>
              <p class="work-description">Quản lý các nhóm nghiệp vụ và dịch vụ mà nhân viên được phân công phụ trách.</p>
              <button type="button" class="primary-button deferred-action" disabled title="Chưa có tích hợp Clinic Services" aria-describedby="services-deferred">Quản lý dịch vụ</button>
              <p id="services-deferred" class="workspace-helper">Chức năng sẽ khả dụng khi danh mục Clinic Services được kết nối. Hiện chưa hỗ trợ cập nhật dịch vụ.</p>
            </section>
            <div class="service-foundation">
              <section class="expertise-empty"><p class="section-index">01 / Danh mục chuyên môn</p><h3>Nhóm nghiệp vụ</h3><p>Các nhóm sẽ được cung cấp từ danh mục Clinic Services sau khi tích hợp.</p><span class="deferred-label">Đang chờ kết nối danh mục</span></section>
              <section class="service-empty"><div><p class="section-index">02 / Phân công dịch vụ</p><h3>Dịch vụ phụ trách</h3><p>Dịch vụ được phân công sẽ xuất hiện tại đây khi dữ liệu chuyên môn sẵn sàng.</p></div></section>
            </div>
          </template>
          <section v-else-if="staff.role === 'cashier' || staff.role === 'sales_staff'" data-testid="retail-scope" class="scope-note"><Store /><p class="section-index">Trải nghiệm khách hàng</p><h2>Phạm vi bán hàng</h2><p>{{ staff.role === 'cashier' ? 'Tiếp nhận thanh toán và hỗ trợ giao dịch tại điểm bán.' : 'Tư vấn sản phẩm và hỗ trợ khách hàng trong quá trình mua sắm.' }}</p></section>
          <section v-else-if="staff.role === 'branch_manager'" data-testid="management-scope" class="scope-note"><Building2 /><p class="section-index">Điều phối vận hành</p><h2>Phạm vi quản lý</h2><p>Kết nối đội ngũ, điều phối công việc và theo dõi hoạt động của chi nhánh.</p></section>
          <section v-else data-testid="system-scope" class="scope-note"><Network /><p class="section-index">Quản trị hệ thống</p><h2>Phạm vi hệ thống</h2><p>Quản trị chính sách và vận hành xuyên suốt toàn bộ hệ thống Mizuki.</p></section>
        </div>
        <div v-else data-testid="history-tab" class="career-layout">
          <div class="career-intro"><p class="section-index">Hành trình nhân sự</p><h2>Hành trình công tác.</h2><p>Quá trình công tác, những thay đổi và phân công tại Mizuki.</p></div>
          <div class="career-timeline">
            <article v-for="entry in careerTimeline" :key="entry.key" class="career-event" :data-kind="entry.kind" :data-testid="entry.assignment ? 'assignment-history' : 'lifecycle-event'">
              <div class="career-date"><time>{{ formatDate(entry.date) }}</time><span>{{ entry.assignment ? 'Phân công' : 'Dấu mốc' }}</span></div>
              <div class="career-marker" aria-hidden="true"><BriefcaseBusiness v-if="entry.assignment" class="size-3" /><History v-else class="size-3" /></div>
              <div class="career-body">
                <template v-if="entry.assignment"><h3>{{ entry.assignment.branch?.name ?? 'Toàn hệ thống' }}</h3><p>{{ entry.assignment.role_label }}<span v-if="entry.assignment.work_area"> · {{ workAreaLabels[entry.assignment.work_area] }}</span></p><p v-if="entry.assignment.job_title">{{ entry.assignment.job_title }}</p><span class="career-period">{{ entry.assignment.effective_to ? 'Đến ' + formatDate(entry.assignment.effective_to) : 'Hiện tại' }}</span><p v-if="entry.assignment.reason" class="career-reason">Lý do: {{ entry.assignment.reason }}</p></template>
                <template v-else-if="entry.event"><h3>{{ entry.kind === 'assignment_changed' ? 'Thay đổi phân công' : eventTitle(entry.event) }}</h3><p v-for="change in [...new Set(entry.events.flatMap(eventChanges))]" :key="change" class="career-change">{{ change }}</p><span v-if="entry.period" class="career-period">{{ entry.period.effective_to ? 'Đến ' + formatDate(entry.period.effective_to) : 'Hiện tại' }}</span><p v-if="entry.event.metadata?.reason || entry.period?.reason" class="career-reason">Lý do: {{ entry.event.metadata?.reason || entry.period?.reason }}</p><p v-if="entry.event.actor" class="career-actor">Người thực hiện: {{ entry.event.actor.name }}</p></template>
              </div>
            </article>
            <p v-if="!sortedAssignments.length" class="empty-history">Chưa có dữ liệu phân công.</p>
            <p v-if="!sortedEvents.length" class="empty-history">Chưa có dấu mốc vòng đời nhân viên.</p>
          </div>
        </div>
      </section>
    </div>

    <BaseDialog v-model="profileDialogOpen" title="Chỉnh sửa hồ sơ" description="Thông tin cá nhân và liên hệ của nhân viên." class="max-w-xl [scrollbar-width:none]" data-testid="profile-dialog">
      <form data-testid="profile-edit-form" class="profile-edit-form" novalidate @submit.prevent="saveProfile">
        <div v-if="staff" class="edit-avatar-area">
          <div class="staff-portrait edit-portrait"><img v-if="avatarUrl" :key="avatarUrl" :src="avatarUrl" :alt="`Ảnh đại diện ${staff.name}`" data-testid="profile-avatar" @error="handleAvatarError" /><span v-else data-testid="profile-avatar-fallback">{{ initials(staff.name) }}</span></div>
          <div class="avatar-actions-area"><p class="field-label">Ảnh đại diện</p>
            <input ref="avatarInput" data-testid="avatar-file" type="file" accept="image/jpeg,image/png,image/webp" hidden :disabled="profileLocked" @change="selectAvatar" />
            <div class="avatar-actions"><button type="button" data-testid="change-avatar" class="secondary-button" :disabled="profileLocked" @click="chooseAvatar"><Camera class="size-4" />Thay ảnh</button><button v-if="hasStoredAvatar" type="button" data-testid="remove-avatar" class="secondary-button" :disabled="profileLocked" @click="avatarRemoveConfirm = true; avatarError = ''; avatarMessage = ''">Xóa ảnh</button></div>
            <p class="workspace-helper">JPEG, PNG hoặc WebP · Tối đa 5 MB. Ảnh tự động cập nhật sau khi chọn.</p>
          </div>
        </div>
        <p v-if="avatarBusy" role="status" data-testid="avatar-progress" class="workspace-helper">{{ avatarPhase === 'removing' ? 'Đang xóa ảnh…' : 'Đang cập nhật ảnh…' }}</p>
        <div v-if="avatarRemoveConfirm" class="avatar-remove-confirm" role="group" aria-label="Xác nhận xóa ảnh đại diện">
          <p>Xóa ảnh đại diện hiện tại? Hồ sơ sẽ hiển thị chữ viết tắt.</p><div class="avatar-actions"><button type="button" data-testid="confirm-remove-avatar" class="danger-button" :disabled="profileLocked" @click="saveAvatar(true)">{{ avatarPhase === 'removing' ? 'Đang xóa…' : 'Xác nhận xóa ảnh' }}</button><button type="button" data-testid="cancel-remove-avatar" class="secondary-button" :disabled="profileLocked" @click="avatarRemoveConfirm = false">Giữ ảnh</button></div>
        </div>
        <p v-if="avatarError" role="alert" data-testid="avatar-error" class="field-error">{{ avatarError }}</p>
        <p v-if="avatarMessage" role="status" data-testid="avatar-success" class="copy-feedback">{{ avatarMessage }}</p>
<label v-for="field in (['name', 'email', 'phone'] as const)" :key="field" class="field-label"><span>{{ field === 'name' ? 'Họ và tên' : field === 'email' ? 'Email' : 'Số điện thoại' }}</span><input v-model="profileForm[field]" :data-testid="`profile-${field}`" :type="field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text'" :maxlength="field === 'phone' ? 20 : 255" :aria-invalid="Boolean(profileErrors[field])" :aria-describedby="profileErrors[field] ? `profile-error-${field}` : undefined" :disabled="profileLocked" class="field-control" /><small v-if="profileErrors[field]" :id="`profile-error-${field}`" class="field-error">{{ profileErrors[field] }}</small></label>
        <p v-if="profileError" role="alert" class="field-error">{{ profileError }}</p>
        <div class="edit-footer"><button type="button" class="secondary-button" :disabled="profileLocked" @click="profileDialogOpen = false">Hủy</button><button type="submit" data-testid="save-profile" class="primary-button" :disabled="!canSaveProfile">{{ profileBusy ? 'Đang lưu…' : 'Lưu thay đổi' }}</button></div>
      </form>
    </BaseDialog>

    <BaseDialog v-model="assignmentOpen" title="Thay đổi phân công" description="Cập nhật vai trò, chi nhánh và phạm vi công việc trong một quy trình có kiểm tra." class="max-w-2xl [scrollbar-width:none]" data-testid="assignment-dialog">
      <div class="step-track" aria-label="Tiến trình thay đổi phân công"><span v-for="(label, index) in ['Phân công mới', 'Xác nhận']" :key="label" :class="assignmentStep >= index + 1 && 'is-active'" :aria-current="assignmentStep === index + 1 ? 'step' : undefined">{{ index + 1 }}. {{ label }}</span></div>
      <form v-if="assignmentStep === 1" class="mt-5 grid gap-4 sm:grid-cols-2" @submit.prevent="runPreflight">
        <label class="field-label"><span>Vai trò</span><span class="select-wrap"><select v-model="assignmentForm.role" :disabled="assignmentBusy" data-testid="assignment-role" class="field-control"><option v-for="option in availableRoles" :key="option.value" :value="option.value">{{ option.label }}</option></select><ChevronDown aria-hidden="true" /></span></label>
        <div v-if="assignmentForm.role === 'super_admin'" class="field-label"><span>Phạm vi quản trị</span><p class="readonly-context" data-testid="assignment-system-scope">Toàn hệ thống</p></div>
        <label v-else class="field-label"><span>Chi nhánh</span><span class="select-wrap"><select v-model="assignmentForm.branch_id" :disabled="assignmentBusy" data-testid="assignment-branch" class="field-control"><option value="">Chọn chi nhánh</option><option v-for="branch in branchOptions" :key="branch.id" :value="String(branch.id)">{{ branch.name }}</option></select><ChevronDown aria-hidden="true" /></span><small v-if="assignmentErrors.branch_id" class="field-error">{{ assignmentErrors.branch_id }}</small></label>
        <label class="field-label"><span>Chức danh</span><input v-model="assignmentForm.job_title" :disabled="assignmentBusy" data-testid="assignment-job-title" maxlength="255" class="field-control" placeholder="Ví dụ: Tư vấn viên da liễu" /></label>
        <div class="field-label"><span>Khu vực làm việc</span><p data-testid="assignment-work-area" class="readonly-context">{{ workAreaLabels[workAreaByRole[assignmentForm.role]] }}</p></div>
        <div class="field-label sm:col-span-2"><span>Thời điểm áp dụng</span><p class="immediate-context">Có hiệu lực ngay sau khi xác nhận</p></div>
        <label class="field-label sm:col-span-2"><span>Lý do</span><textarea v-model="assignmentForm.reason" :disabled="assignmentBusy" data-testid="assignment-reason" maxlength="1000" rows="3" class="field-control resize-none" placeholder="Ghi lại bối cảnh thay đổi phân công"></textarea></label>
        <p v-if="assignmentError" role="alert" class="field-error sm:col-span-2">{{ assignmentError }}</p><div class="sm:col-span-2 flex justify-end"><button type="submit" data-testid="run-preflight" class="primary-button" :disabled="assignmentBusy">{{ assignmentBusy ? 'Đang kiểm tra…' : 'Tiếp tục' }}</button></div>
      </form>
      <div v-else-if="!preflight?.can_transfer" class="mt-5">
        <div data-testid="preflight-blockers" class="grid gap-3" role="alert"><h2 class="font-semibold">Cần xử lý trách nhiệm trước khi tiếp tục</h2><article v-for="blocker in preflight?.blockers" :key="blocker.type" class="rounded-2xl bg-amber-50 p-5 text-amber-950"><div class="flex items-center justify-between gap-3"><h3 class="font-semibold">{{ blockerTitle(blocker.type) }}</h3><strong>{{ blocker.count }}</strong></div><p class="mt-2 text-body-sm">{{ blocker.message }}</p><p class="mt-1 text-body-sm">{{ blockerGuidance(blocker.type) }}</p></article></div>
        <button type="button" class="secondary-button mt-5" @click="assignmentStep = 1; preflight = null">Quay lại chỉnh sửa</button>
      </div>
      <div v-else class="mt-5" data-testid="assignment-review">
        <p data-testid="preflight-clear" class="preflight-summary" role="status"><Check class="size-4" />Đã kiểm tra — Không có trách nhiệm cần xử lý</p>
        <div class="comparison-grid"><article><p class="eyebrow">Hiện tại</p><h2>{{ staff?.branch?.name ?? 'Toàn hệ thống' }}</h2><p>{{ staff?.role_label }}</p><p>{{ staff ? workAreaLabels[workArea(staff)] : '—' }}</p><p>{{ staff?.job_title || 'Không có chức danh' }}</p></article><ArrowDown class="mx-auto size-5 text-primary-700 sm:rotate-[-90deg]" /><article class="is-new"><p class="eyebrow">Phân công mới</p><h2>{{ selectedBranch?.name ?? 'Toàn hệ thống' }}</h2><p>{{ roleLabels[assignmentForm.role] }}</p><p>{{ workAreaLabels[workAreaByRole[assignmentForm.role]] }}</p><p>{{ assignmentForm.job_title || 'Không có chức danh' }}</p></article></div>
        <dl class="mt-4 grid gap-2 text-body-sm"><div><dt class="inline text-muted-foreground">Thời điểm áp dụng: </dt><dd class="inline font-medium">Có hiệu lực ngay sau khi xác nhận</dd></div><div><dt class="inline text-muted-foreground">Lý do: </dt><dd class="inline font-medium">{{ assignmentForm.reason || 'Không có' }}</dd></div></dl><p v-if="assignmentChangedSignificantly" class="mt-4 rounded-xl bg-amber-50 p-3 text-body-sm text-amber-900">Vai trò hoặc phạm vi chi nhánh sẽ thay đổi. Hãy kiểm tra kỹ trước khi xác nhận.</p><p v-if="assignmentError" role="alert" class="mt-3 field-error">{{ assignmentError }}</p><div class="mt-5 flex flex-wrap justify-between gap-2"><button type="button" class="secondary-button" :disabled="assignmentBusy" @click="assignmentStep = 1; preflight = null">Chỉnh sửa</button><button type="button" data-testid="confirm-assignment" class="primary-button" :disabled="assignmentBusy" @click="submitAssignment">{{ assignmentBusy ? 'Đang cập nhật…' : 'Xác nhận thay đổi' }}</button></div>
      </div>
    </BaseDialog>

    <BaseDialog v-model="statusOpen" :title="targetStatus === 'left' ? 'Xác nhận nhân viên nghỉ việc' : 'Đưa nhân viên trở lại làm việc'" description="Trạng thái làm việc được quản lý độc lập với thùng rác." data-testid="status-dialog"><p class="text-body-sm leading-6 text-muted-foreground">{{ targetStatus === 'left' ? 'Hồ sơ và toàn bộ lịch sử nghiệp vụ vẫn được giữ nguyên. Nhân viên sẽ không còn ở trạng thái đang làm việc.' : 'Nhân viên sẽ trở lại trạng thái đang làm việc và nhận một kỳ phân công hiện tại.' }}</p><p v-if="statusError" role="alert" class="mt-3 field-error">{{ statusError }}</p><template #footer><button type="button" class="secondary-button" @click="statusOpen = false">Hủy</button><button type="button" data-testid="confirm-status" class="primary-button" :disabled="statusBusy" @click="submitStatus">{{ statusBusy ? 'Đang cập nhật…' : 'Xác nhận' }}</button></template></BaseDialog>

    <BaseDialog v-model="trashOpen" title="Đưa nhân viên vào thùng rác?" description="Đây không phải là thao tác đánh dấu nghỉ việc." data-testid="trash-dialog"><div class="rounded-2xl bg-rose-50 p-4 text-body-sm leading-6 text-rose-900"><p>Nhân viên sẽ biến mất khỏi danh sách vận hành thông thường.</p><p class="mt-1">Các hồ sơ và lịch sử nghiệp vụ liên quan vẫn được giữ lại.</p></div><p v-if="trashError" role="alert" class="mt-3 field-error">{{ trashError }}</p><template #footer><button type="button" class="secondary-button" @click="trashOpen = false">Hủy</button><button type="button" data-testid="confirm-trash" class="danger-button" :disabled="trashBusy" @click="submitTrash">{{ trashBusy ? 'Đang xử lý…' : 'Đưa vào thùng rác' }}</button></template></BaseDialog>

  </section>
</template>

<style scoped>
.staff-detail { --ink: #233d34; --sage: #e8ede5; --paper: #fafbf8; --line: #dce3da; padding: .35rem .35rem 3rem; color: var(--ink); }
.profile-workspace { border-radius: 24px; background: var(--paper); box-shadow: 0 12px 48px #233d3408; }
.profile-header { background: var(--sage); border-radius: 24px 24px 0 0; }
.profile-topline { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 22px 32px 8px; }
.back-link { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 550; color: #5a6c60; min-height: 32px; }
.back-link:hover { color: #163c2c; }
.profile-composition { display: grid; grid-template-columns: minmax(0, 1fr) minmax(270px, 29%); }
.identity-zone { position: relative; isolation: isolate; display: flex; align-items: center; gap: 26px; min-width: 0; padding: 36px 30px 40px 32px; overflow: hidden; }
.identity-monogram { position: absolute; pointer-events: none; user-select: none; z-index: -1; right: 8px; bottom: -70px; color: #d9e2d6; font-size: clamp(160px, 20vw, 290px); letter-spacing: -.1em; line-height: 1; font-weight: 650; }
.portrait-column { flex: none; width: 118px; text-align: center; }
.staff-portrait { position: relative; display: grid; place-items: center; height: 118px; width: 118px; border-radius: 50%; border: 6px solid var(--paper); background: #cedbc8; color: #38523b; font-size: 38px; letter-spacing: -.06em; font-weight: 550; box-shadow: 0 8px 20px #293f3110; overflow: hidden; }
.staff-portrait img { width: 100%; height: 100%; object-fit: cover; }
.portrait-caption { display: block; margin-top: 14px; font-size: 8px; letter-spacing: .21em; color: #677664; }
.identity-copy { min-width: 0; position: relative; }
.identity-copy h1 { font-size: clamp(28px, 2.8vw, 44px); line-height: 1.14; letter-spacing: -.045em; font-weight: 550; overflow-wrap: anywhere; margin: 9px 0 14px; max-width: 650px; }
.identity-role { font-size: 15px; font-weight: 600; }
.identity-job { font-size: 13px; color: #63735f; margin-top: 4px; }
.identity-footnote { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 16px; margin-top: 20px; font-size: 11px; color: #65715f; }
.code-copy { display: inline-flex; align-items: center; gap: 7px; min-height: 28px; font-size: 11px; font-weight: 600; letter-spacing: .04em; }
.code-copy:hover { color: #143b28; }
.copy-feedback { color: #26774c; font-size: 11px; font-weight: 600; }
.context-zone { margin: 26px 0; padding: 4px 30px; border-left: 1px solid #ccd6c9; display: flex; flex-direction: column; justify-content: center; min-width: 0; }
.employment-state { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600; }
.employment-state i { width: 6px; height: 6px; background: currentColor; border-radius: 50%; }
.is-working { color: #357455; } .is-left { color: #a45d54; }
.is-unknown { color: #687365; }
.context-branch { display: flex; gap: 10px; align-items: flex-start; margin-top: 22px; }
.context-branch > svg { margin-top: 2px; flex: none; }
.context-branch p:last-child { margin-top: 5px; font-size: 15px; font-weight: 550; line-height: 1.4; }
.context-area { display: flex; gap: 8px; align-items: center; font-size: 12px; color: #667562; margin: 10px 0 22px; }
.profile-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.profile-actions .primary-button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; flex: 1; white-space: nowrap; padding-inline: 12px; font-size: 12px; }
.assignment-link { display: inline-flex; gap: 6px; align-items: center; min-height: 30px; font-size: 11px; color: #4e6555; padding: 0 2px; }
.assignment-link:hover { text-decoration: underline; text-underline-offset: 4px; }
.staff-tabs { position: relative; z-index: 1; display: flex; overflow-x: auto; gap: 30px; padding: 0 32px; border-bottom: 1px solid #d3ddcf; scrollbar-width: none; }
.staff-tabs button { position: relative; flex-shrink: 0; display: flex; align-items: center; gap: 9px; padding: 19px 0; color: #788372; font-size: 13px; font-weight: 550; border-bottom: 2px solid transparent; transition: color 150ms, border-color 150ms; }
.staff-tabs button[aria-selected="true"] { color: #204c36; border-bottom-color: #204c36; }
.staff-tabs button:hover { color: #204c36; }
.tab-index { font-size: 9px; font-variant-numeric: tabular-nums; opacity: .65; }
.staff-tabs button:focus-visible, .staff-detail button:focus-visible, .staff-detail a:focus-visible, .profile-content:focus-visible { outline: 2px solid #478863; outline-offset: 3px; border-radius: 3px; }
.profile-content { padding: 36px 32px 42px; animation: panel-enter 180ms ease-out; min-width: 0; }
@keyframes panel-enter { from { opacity: .3; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
.information-layout { display: grid; grid-template-columns: minmax(200px, .8fr) minmax(0, 1.65fr); gap: 40px; }
.section-index, .eyebrow { font-size: 9px; text-transform: uppercase; letter-spacing: .1em; color: #76806c; font-weight: 600; }
.metadata-rail h2 { font-size: 18px; font-weight: 550; letter-spacing: -.025em; margin-top: 8px; }
.metadata-rail dl { display: grid; gap: 22px; margin-top: 22px; }
.account-section { border-top: 1px solid var(--line); margin-top: 34px; padding-top: 26px; }
.info-row { display: grid; gap: 7px; min-width: 0; }
.info-row dt { font-size: 11px; color: #7b8276; }
.info-row dd { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 500; min-width: 0; overflow-wrap: anywhere; }
.info-row dd > span { min-width: 0; }
.info-row dd button { display: grid; place-items: center; width: 28px; height: 28px; flex: none; color: #83917b; border-radius: 6px; }
.info-row dd button:hover { background: var(--sage); }
.info-row dd svg { width: 13px; height: 13px; }
.employment-panel { background: #f0f2eb; border-radius: 2px 18px 18px 18px; padding: 28px; min-width: 0; }
.section-intro { display: flex; justify-content: space-between; gap: 16px; align-items: center; }
.section-intro h2 { margin-top: 8px; font-size: 21px; font-weight: 550; letter-spacing: -.03em; }
.section-intro > svg { color: #839077; }
.assignment-statement { margin: 28px 0; padding-left: 15px; border-left: 2px solid #8b9f7c; }
.assignment-statement h3 { font-size: 23px; letter-spacing: -.035em; line-height: 1.3; font-weight: 500; margin: 8px 0; }
.assignment-statement > p { font-size: 12px; line-height: 1.7; color: #77806e; max-width: 390px; }
.employment-details { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; padding-bottom: 25px; }
.employment-title { grid-column: 1 / -1; }
.employment-dates { display: flex; flex-wrap: wrap; gap: 20px 35px; border-top: 1px solid #dbe1d3; padding-top: 20px; }
.employment-dates > div { position: relative; } .employment-dates svg { display: none; }
.employment-dates p { font-size: 10px; color: #7d8376; } .employment-dates strong { display: block; font-size: 12px; font-weight: 550; margin-top: 6px; }
.work-layout { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); gap: 40px; }
.work-intro { padding: 8px 10px 8px 0; min-width: 0; }
.work-heading { display: flex; gap: 14px; align-items: center; margin-top: 24px; }
.work-heading h2 { font-size: 34px; letter-spacing: -.035em; line-height: 1.15; }
.work-icon { display: grid; place-items: center; padding: 12px; background: var(--sage); border-radius: 12px; }
.work-icon svg { width: 22px; height: 22px; }
.work-description { margin-top: 20px; font-size: 14px; line-height: 1.8; color: #788271; }
.work-intro dl { display: grid; gap: 23px; margin-top: 28px; padding-top: 26px; border-top: 1px solid var(--line); }
.expertise-empty, .scope-note { position: relative; padding: 30px; background: #e9eee6; border-radius: 2px 20px 20px 20px; min-width: 0; }
.expertise-mark, .scope-note > svg { display: inline-grid; place-items: center; width: 44px; height: 44px; color: #6c8664; margin-bottom: 32px; }
.expertise-empty h2, .scope-note h2 { font-size: 29px; line-height: 1.18; letter-spacing: -.035em; font-weight: 500; margin-top: 12px; }
.expertise-empty > p:not(.section-index), .scope-note > p:not(.section-index) { margin-top: 18px; color: #73806c; font-size: 12px; line-height: 1.8; }
.deferred-label { display: block; margin-top: 28px; padding-top: 18px; border-top: 1px solid #d2decd; font-size: 10px; color: #7f8977; }
.work-layout[data-area="retail"] .scope-note { background: #f1ede3; }
.work-layout[data-area="system"] .scope-note { background: #e7ecee; }
.career-layout { display: grid; grid-template-columns: minmax(160px, .65fr) minmax(0, 1.8fr); gap: 32px; }
.career-intro h2 { font-size: 31px; line-height: 1.15; letter-spacing: -.035em; margin-top: 15px; font-weight: 500; }
.career-intro > p:last-child { font-size: 12px; line-height: 1.8; color: #7e8577; max-width: 200px; margin-top: 18px; }
.career-event { display: grid; grid-template-columns: 90px 28px minmax(0, 1fr); gap: 14px; position: relative; min-width: 0; }
.career-date { padding-top: 5px; font-size: 10px; line-height: 1.6; color: #65715e; font-variant-numeric: tabular-nums; }
.career-date span { display: block; font-size: 9px; color: #97a08e; margin-top: 6px; }
.career-marker { position: relative; display: flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 50%; background: #e8eee2; color: #6d835e; }
.career-marker::after { content: ""; position: absolute; top: 31px; left: 12px; width: 1px; height: calc(100% - 32px); background: #dce3d5; }
.career-event::before { content: ""; position: absolute; left: 117px; top: 30px; bottom: 4px; width: 1px; background: #dce3d5; pointer-events: none; }
.career-event:last-child::before { display: none; }
.career-event[data-kind="employment_status_changed"] .career-marker, .career-event[data-kind="trashed"] .career-marker { background: #f2e8e0; color: #aa795e; }
.career-event[data-kind="role_changed"] .career-marker { background: #e3ebef; color: #628192; }
.career-body { padding: 2px 0 30px; }
.career-body h3 { font-size: 15px; font-weight: 600; letter-spacing: -.015em; }
.career-body > p { font-size: 12px; line-height: 1.7; color: #6c7863; margin-top: 5px; overflow-wrap: anywhere; }
.career-body .career-change { color: #315542; }
.career-body .career-reason { font-style: italic; color: #86917c; margin-top: 12px; }
.career-body .career-actor { font-size: 10px; color: #909886; }
.career-period { display: inline-block; margin-top: 8px; font-size: 10px; color: #89947f; }
.empty-history { font-size: 12px; color: #88907f; padding: 15px 0; }
.success-notice { display: flex; gap: 8px; align-items: center; padding: 13px 32px; background: #e3efe4; color: #306144; font-size: 12px; }
.detail-error { display: grid; justify-items: center; gap: 20px; padding: 50px 24px; text-align: center; }
.detail-error h1 { font-size: 24px; } .detail-error p { font-size: 14px; }
.profile-edit-form { display: grid; gap: 16px; }
.edit-intro { display: flex; align-items: center; gap: 12px; background: #edf1e9; padding: 18px; border-radius: 12px; font-size: 13px; color: #66765e; }
.edit-footer { display: flex; justify-content: flex-end; gap: 10px; padding-top: 12px; border-top: 1px solid #e1e7dc; }
.detail-menu-item { display: flex; min-height: 2.5rem; width: 100%; align-items: center; gap: .625rem; border-radius: .625rem; padding: 0 .75rem; text-align: left; font-size: .8125rem; font-weight: 550; }
.detail-menu-item:hover { background: var(--primary-50); }
.step-track { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
.step-track span { display: grid; height: .35rem; overflow: hidden; border-radius: 999px; background: var(--surface-subtle); color: transparent; font-size: 0; }
.step-track span.is-active { background: var(--primary-600); }
.field-label { display: grid; align-content: start; gap: .45rem; color: var(--foreground); font-size: .8125rem; font-weight: 600; }
.field-label small { color: var(--muted-foreground); font-size: .6875rem; font-weight: 400; }
.field-control { width: 100%; min-height: 2.75rem; border: 1px solid var(--border); border-radius: .75rem; background: var(--surface); padding: .65rem .75rem; color: var(--foreground); font-size: .8125rem; font-weight: 400; outline: none; }
.field-control:focus { border-color: var(--primary-500); box-shadow: 0 0 0 3px rgba(39, 93, 70, .1); }
.field-control:disabled { background: var(--surface-subtle); color: var(--muted-foreground); }
.field-error { color: var(--destructive, #b42318); font-size: .75rem; font-weight: 500; }
.primary-button, .secondary-button, .danger-button { min-height: 2.625rem; border-radius: .75rem; padding: 0 1rem; font-size: .8125rem; font-weight: 650; transition: background-color 150ms, transform 150ms; }
.primary-button { background: var(--primary-700); color: white; box-shadow: 0 4px 12px rgba(39, 93, 70, .14); }
.primary-button:hover:not(:disabled) { background: var(--primary-800); transform: translateY(-1px); }
.secondary-button { background: var(--surface-subtle); color: var(--foreground); }
.secondary-button:hover { background: var(--primary-50); }
.danger-button { background: #b42318; color: white; }
.danger-button:hover:not(:disabled) { background: #912018; }
.primary-button:disabled, .danger-button:disabled { cursor: wait; opacity: .65; }
.comparison-grid { display: grid; align-items: center; gap: 1rem; }
.comparison-grid article { min-width: 0; border-radius: 1rem; background: var(--surface-subtle); padding: 1rem; }
.comparison-grid article.is-new { background: var(--primary-50); }
.comparison-grid h2 { margin-top: .4rem; font-weight: 650; }
.comparison-grid article > p:not(.eyebrow) { margin-top: .25rem; color: var(--muted-foreground); font-size: .8125rem; }

.step-track span { height: auto; padding: 10px 0; color: #819077; background: transparent; border-bottom: 2px solid #e3e8df; font-size: 10px; border-radius: 0; }
.step-track span.is-active { color: #2e6547; background: transparent; border-color: #719b78; }
@media (min-width: 640px) { .comparison-grid { grid-template-columns: 1fr auto 1fr; } }
@media (max-width: 1100px) {
  .profile-composition { grid-template-columns: minmax(0, 1fr) 235px; }
  .identity-zone { gap: 18px; padding: 28px 22px; }
  .portrait-column, .staff-portrait { width: 90px; } .staff-portrait { height: 90px; }
  .context-zone { padding-inline: 20px; }
  .profile-topline, .staff-tabs { padding-inline: 24px; }
  .profile-content { padding: 28px 24px; }
  .information-layout { gap: 26px; grid-template-columns: minmax(180px, .8fr) minmax(0, 1.5fr); }
  .employment-panel { padding: 23px; }
  .career-layout { grid-template-columns: 1fr; } .career-intro br { display: none; }
  .career-intro > p:last-child { max-width: none; margin-top: 10px; }
}
@media (max-width: 767px) {
  .profile-topline { padding: 16px 20px 4px; } .profile-topline > .eyebrow { display: none; }
  .profile-composition { grid-template-columns: 1fr; }
  .identity-zone { padding: 24px 20px; gap: 18px; } .identity-copy h1 { font-size: 28px; }
  .identity-footnote { margin-top: 12px; }
  .context-zone { margin: 0 20px 10px; padding: 18px 0 8px; border-left: 0; border-top: 1px solid #d1dbc9; display: grid; grid-template-columns: 1fr auto; gap: 10px 16px; }
  .context-branch { margin: 0; grid-column: 1; grid-row: 1; } .context-branch > svg { display: none; }
  .context-branch p:last-child { font-size: 14px; }
  .employment-state { grid-column: 2; grid-row: 1; font-size: 10px; align-self: center; }
  .context-area { margin: 0; font-size: 11px; }
  .profile-actions { grid-column: 1 / -1; margin-top: 7px; }
  .profile-actions .primary-button { flex: none; }
  .assignment-link { margin-left: auto; }
  .staff-tabs { padding-inline: 20px; gap: 24px; } .staff-tabs button { font-size: 12px; padding-block: 17px; } .tab-index { display: none; }
  .information-layout, .work-layout { grid-template-columns: 1fr; gap: 28px; }
  .employment-panel { grid-row: 1; }
  .metadata-rail { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; }
  .account-section { margin: 0; padding: 0 0 0 22px; border-top: 0; border-left: 1px solid var(--line); }
  .profile-content { padding: 24px 20px 30px; }
  .expertise-empty h2, .scope-note h2 { font-size: 26px; }
}
@media (max-width: 440px) {
  .staff-detail { padding: 0 0 60px; }
  .portrait-column, .staff-portrait { width: 72px; } .staff-portrait { height: 72px; border-width: 4px; font-size: 27px; }
  .portrait-caption { font-size: 6px; margin-top: 10px; }
  .identity-copy h1 { font-size: 25px; } .identity-role { font-size: 12px; } .identity-job { font-size: 11px; }
  .identity-monogram { font-size: 190px; bottom: -45px; }
  .profile-actions .primary-button { font-size: 11px; }
  .assignment-link { margin-left: 0; width: 100%; padding-top: 5px; }
  .staff-tabs { gap: 20px; } .staff-tabs button { font-size: 11px; }
  .metadata-rail { grid-template-columns: 1fr; }
  .account-section { border-left: 0; padding: 22px 0 0; border-top: 1px solid var(--line); }
  .employment-panel { padding: 22px 18px; }
  .employment-details { gap: 18px 12px; }
  .employment-dates { gap: 18px; }
  .career-event { grid-template-columns: 64px 22px minmax(0, 1fr); gap: 9px; }
  .career-event::before { left: 83px; } .career-marker { width: 22px; height: 22px; }
  .career-date { font-size: 9px; } .career-body h3 { font-size: 13px; }
}
/* Local readability refinements retain the accepted editorial hierarchy. */
.portrait-caption { font-size: 10px; letter-spacing: .12em; }
.section-index, .eyebrow, .tab-index { font-size: 11px; }
.identity-footnote, .code-copy, .copy-feedback, .assignment-link, .info-row dt,
.employment-dates p, .career-date, .career-date span, .career-period,
.career-body .career-actor, .deferred-label { font-size: 12px; }
.assignment-statement > p, .career-intro > p:last-child, .career-body > p,
.empty-history, .expertise-empty > p:not(.section-index), .scope-note > p:not(.section-index) { font-size: 13px; }
.step-track span, .field-label small { font-size: 12px; }
.work-heading h2 { font-size: clamp(26px, 2.4vw, 34px); }
.work-icon { flex: none; }
.work-layout > .scope-note:only-child { grid-column: 1 / -1; max-width: 780px; width: 100%; }
.service-foundation { display: grid; gap: 24px; min-width: 0; }
.service-foundation h3 { font-size: 21px; font-weight: 550; letter-spacing: -.025em; }
.service-foundation .expertise-mark { margin-bottom: 18px; }
.service-empty { display: flex; align-items: flex-start; gap: 16px; padding: 0 8px 16px; }
.service-empty > svg { flex: none; color: #6c8664; margin-top: 4px; }
.service-empty p, .workspace-helper { font-size: 13px; line-height: 1.7; color: #65745e; margin-top: 8px; }
.deferred-action { margin-top: 26px; }
.deferred-action:disabled { cursor: default; opacity: .7; }
.edit-avatar-area { display: flex; gap: 18px; align-items: center; padding-bottom: 14px; border-bottom: 1px solid #e1e7dc; }
.edit-portrait { width: 76px; height: 76px; flex: none; font-size: 25px; border-width: 3px; }
.avatar-actions-area { min-width: 0; }
.avatar-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.avatar-actions button { display: inline-flex; align-items: center; justify-content: center; gap: 7px; }
.avatar-actions button:disabled { opacity: .6; cursor: wait; }
.edit-footer .primary-button:disabled { background: #e1e6dd; color: #737e6c; box-shadow: none; cursor: not-allowed; opacity: 1; transform: none; }
.avatar-remove-confirm { padding: 14px; border: 1px solid #ead2d4; background: #faf1f1; border-radius: 12px; color: #78454d; font-size: 13px; }
.select-wrap { display: block; position: relative; }
.select-wrap select { appearance: none; padding-right: 48px; }
.select-wrap > svg { position: absolute; right: 18px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; pointer-events: none; color: #697861; }
.readonly-context { padding: .65rem .75rem; min-height: 2.75rem; border: 1px solid #e1e7dc; border-radius: .75rem; background: #f0f3ed; font-weight: 500; }
.immediate-context { font-size: 13px; font-weight: 400; color: #65745e; }
.preflight-summary { display: flex; align-items: center; gap: 8px; padding: 12px 14px; margin-bottom: 18px; border-radius: 12px; background: #edf4ec; color: #306144; font-size: 13px; }
.preflight-summary svg { flex: none; }
@media (max-width: 440px) {
  .portrait-caption { font-size: 9px; letter-spacing: .06em; }
  .identity-role, .identity-job, .employment-state, .context-area { font-size: 12px; }
  .profile-actions .primary-button, .staff-tabs button { font-size: 12px; }
  .staff-tabs { gap: 16px; padding-inline: 16px; }
  .career-event { grid-template-columns: 76px 22px minmax(0, 1fr); }
  .career-event::before { left: 95px; }
  .career-date { font-size: 12px; }
  .edit-avatar-area { gap: 14px; }
}
.profile-header-left { --sage: #f2e8e6; color: #513d40; }
.profile-header-left .identity-monogram { color: #e7d8d7; }
.profile-header-left .staff-portrait { background: #e6d5d4; color: #714b52; }
.profile-header-left .is-left { color: #904955; }
.profile-header-left .context-zone, .profile-header-left .staff-tabs { border-color: #dfcccd; }
.profile-header-left .staff-tabs button[aria-selected="true"] { color: #75434c; border-color: #75434c; }
.profile-header-left .identity-job, .profile-header-left .context-area,
.profile-header-left .eyebrow, .profile-header-left .portrait-caption,
.profile-header-left .identity-footnote, .profile-header-left .assignment-link,
.profile-header-left .back-link, .profile-header-left .staff-tabs button { color: #756064; }
.section-index, .eyebrow, .info-row dt, .employment-dates p { color: #626e5d; }
.assignment-statement > p, .work-description, .career-intro > p:last-child { color: #65715e; }
.service-foundation .expertise-empty { background: transparent; border-radius: 0; padding: 6px 0 24px; border-bottom: 1px solid #ccd7c6; }
.service-foundation { border-left: 1px solid #d6dfd0; padding-left: 30px; gap: 22px; }
.service-foundation h3 { margin-top: 12px; }
.service-foundation .deferred-label { border: 0; padding: 0; margin-top: 16px; color: #66775c; }
.service-empty { padding: 0; }
.career-event { grid-template-columns: 80px 28px minmax(0, 1fr); }
.career-event::before { left: 107px; background: #bccbb4; }
.career-body h3 { font-size: 16px; font-weight: 650; }
.career-date, .career-date span, .career-period, .career-body .career-actor { color: #65725d; }
.career-body .career-reason { color: #707c67; }
@media (max-width: 767px) { .service-foundation { border-left: 0; border-top: 1px solid #d6dfd0; padding: 24px 0 0; } }
@media (max-width: 440px) {
  .career-event { grid-template-columns: 76px 22px minmax(0, 1fr); }
  .career-event::before { left: 95px; }
  .career-body h3 { font-size: 15px; }
}
@media (prefers-reduced-motion: reduce) { .profile-content { animation: none; } .staff-detail * { transition: none; } }
</style>
