<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import {
  ArrowLeft, ArrowUpRight, Building2, Camera, Eye, EyeOff,
  LockKeyhole, Mail, Phone, RefreshCw, Trash2,
  UserRound,
} from '@lucide/vue'
import BaseDialog from '@/components/common/BaseDialog.vue'
import BaseSkeleton from '@/components/common/BaseSkeleton.vue'
import { useToast } from '@/components/common/toast'
import {
  changeProfilePassword, getProfile, promoteProfileAvatar,
  removeProfileAvatar, stageProfileAvatar, updateProfile,
} from '@/api/profileApi'
import { getCurrentUser } from '@/api/auth/authApi'
import { useAuthStore } from '@/stores/auth'
import type { ApplicationError } from '@/types/errors'
import type { AvatarUploadResult, Profile, StaffProfile } from '@/types/profile'

const auth = useAuthStore()
const router = useRouter()
const { toast } = useToast()
const profile = ref<Profile | null>(null)
const loading = ref(true)
const loadError = ref('')
const staff = computed<StaffProfile | null>(() =>
  profile.value && profile.value.role !== 'customer' ? profile.value : null,
)
const systemScope = computed(() =>
  staff.value?.role === 'super_admin' && staff.value.branch_id === null && staff.value.current_assignment === null,
)
const branchName = computed(() =>
  staff.value?.current_assignment?.branch?.name || staff.value?.branch?.name ||
  (staff.value?.current_assignment || staff.value?.branch_id ? 'Chưa xác định chi nhánh' : 'Chưa có chi nhánh được phân công'),
)
const backTo = computed(() => auth.isAdmin ? '/admin/dashboard' : '/home')
const avatarUrl = computed(() => profile.value?.avatar_rendition_url || profile.value?.avatar || null)
const avatarFailed = ref(false)
watch(avatarUrl, () => { avatarFailed.value = false })

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'M'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toLocaleUpperCase('vi-VN')
  return `${parts[0]![0]}${parts.at(-1)![0]}`.toLocaleUpperCase('vi-VN')
}

function errorOf(error: unknown, fallback: string): string {
  // Server messages may contain SQL, paths or stack details. Field validation is
  // rendered separately and is the only API message safe to show verbatim.
  if (applicationError(error)?.kind === 'validation') return fallback
  if (import.meta.env.DEV) console.error('[Profile]', error)
  return fallback
}

function applicationError(error: unknown): ApplicationError | null {
  if (typeof error === 'object' && error !== null && 'name' in error && error.name === 'ApplicationError') {
    return error as ApplicationError
  }
  return null
}

function handleUnauthorized(error: unknown): boolean {
  if (applicationError(error)?.kind !== 'unauthorized') return false
  const wasStaff = auth.role !== 'customer'
  auth.clearSession()
  void router.replace({ path: wasStaff ? '/admin/login' : '/login', query: { redirect: '/profile' } })
  return true
}

async function loadProfile(): Promise<void> {
  loading.value = true
  loadError.value = ''
  try {
    profile.value = await getProfile()
  } catch (error) {
    if (!handleUnauthorized(error)) loadError.value = errorOf(error, 'Không thể tải hồ sơ. Vui lòng thử lại.')
  } finally {
    loading.value = false
  }
}

async function afterMutation(updated: Profile, message: string): Promise<void> {
  profile.value = updated
  const [freshProfile, freshSession] = await Promise.allSettled([getProfile(), getCurrentUser()])
  if (freshProfile.status === 'fulfilled') profile.value = freshProfile.value
  if (freshSession.status === 'fulfilled') auth.user = freshSession.value
  if (freshProfile.status === 'rejected' || freshSession.status === 'rejected') {
    const failure = freshProfile.status === 'rejected' ? freshProfile.reason : freshSession.status === 'rejected' ? freshSession.reason : null
    if (!handleUnauthorized(failure)) toast({ title: 'Đã lưu, nhưng chưa đồng bộ đầy đủ hồ sơ. Hãy tải lại trang để kiểm tra.', variant: 'warning' })
    return
  }
  toast({ title: message, variant: 'success' })
}

const editOpen = ref(false)
const editBusy = ref(false)
const editDialog = computed({
  get: () => editOpen.value,
  // Escape and backdrop clicks must not silently discard an edited form.
  set: (value: boolean) => { if (!editBusy.value && (value || !editDirty.value)) editOpen.value = value },
})
const editForm = reactive({ name: '', phone: '' })
const editErrors = reactive<Record<string, string>>({})
const editError = ref('')
const editValidation = computed(() => ({
  name: !editForm.name.trim() ? 'Vui lòng nhập họ và tên.' : editForm.name.trim().length > 255 ? 'Họ và tên không được vượt quá 255 ký tự.' : '',
  phone: editForm.phone.trim().length > 20 ? 'Số điện thoại không được vượt quá 20 ký tự.' : '',
}))
const editDirty = computed(() => profile.value && (
  editForm.name.trim() !== profile.value.name || editForm.phone.trim() !== (profile.value.phone ?? '')
))
watch(() => editForm.name, () => { delete editErrors.name })
watch(() => editForm.phone, () => { delete editErrors.phone })
function openEdit(): void {
  if (!profile.value) return
  editForm.name = profile.value.name
  editForm.phone = profile.value.phone ?? ''
  Object.keys(editErrors).forEach((key) => delete editErrors[key])
  editError.value = ''
  editOpen.value = true
}
async function saveEdit(): Promise<void> {
  if (editBusy.value || !editDirty.value) return
  for (const [field, message] of Object.entries(editValidation.value)) {
    if (message) editErrors[field] = message
  }
  if (Object.values(editValidation.value).some(Boolean)) return
  editBusy.value = true
  editError.value = ''
  try {
    const updated = await updateProfile({ name: editForm.name.trim(), phone: editForm.phone.trim() || null })
    editOpen.value = false
    await afterMutation(updated, 'Thông tin cá nhân đã được cập nhật')
  } catch (error) {
    if (handleUnauthorized(error)) return
    editError.value = errorOf(error, 'Không thể cập nhật hồ sơ.')
    for (const [field, messages] of Object.entries(applicationError(error)?.validationErrors ?? {})) {
      editErrors[field] = messages[0] ?? editError.value
    }
  } finally {
    editBusy.value = false
  }
}

const avatarInput = ref<HTMLInputElement | null>(null)
const avatarMenuRoot = ref<HTMLElement | null>(null)
const avatarMenuOpen = ref(false)
const avatarPhase = ref<'idle' | 'uploading' | 'saving'>('idle')
const localPreview = ref<string | null>(null)
let avatarRun = 0
function clearAvatarPreview(): void {
  if (localPreview.value) URL.revokeObjectURL(localPreview.value)
  localPreview.value = null
  if (avatarInput.value) avatarInput.value.value = ''
}
function resetAvatar(): void {
  avatarRun += 1
  clearAvatarPreview()
}
function closeAvatarMenuOnOutside(event: PointerEvent): void {
  if (avatarMenuOpen.value && !avatarMenuRoot.value?.contains(event.target as Node)) avatarMenuOpen.value = false
}
function closeAvatarMenuOnEscape(event: KeyboardEvent): void {
  if (event.key === 'Escape') avatarMenuOpen.value = false
}
onMounted(() => {
  document.addEventListener('pointerdown', closeAvatarMenuOnOutside)
  document.addEventListener('keydown', closeAvatarMenuOnEscape)
  void loadProfile()
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', closeAvatarMenuOnOutside)
  document.removeEventListener('keydown', closeAvatarMenuOnEscape)
  resetAvatar()
})
function chooseAvatar(): void {
  avatarMenuOpen.value = false
  if (avatarPhase.value !== 'saving') avatarInput.value?.click()
}
function selectAvatar(event: Event): void {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  ;(event.target as HTMLInputElement).value = ''
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    toast({ title: 'Chọn ảnh JPEG, PNG hoặc WebP.', variant: 'error' })
    return
  }
  if (file.size <= 0 || file.size > 8 * 1024 * 1024) {
    toast({ title: 'Ảnh phải có dung lượng lớn hơn 0 và không quá 8 MB.', variant: 'error' })
    return
  }
  if (avatarPhase.value === 'saving') return
  resetAvatar()
  localPreview.value = URL.createObjectURL(file)
  void replaceAvatar(file, avatarRun)
}
async function replaceAvatar(file: File, run: number): Promise<void> {
  avatarPhase.value = 'uploading'
  try {
    const result: AvatarUploadResult = await stageProfileAvatar(file)
    if (run !== avatarRun) return
    avatarPhase.value = 'saving'
    const updated = await promoteProfileAvatar(result.upload_token)
    if (run !== avatarRun) return
    clearAvatarPreview()
    await afterMutation(updated, 'Ảnh đại diện đã được cập nhật')
  } catch (error) {
    if (run !== avatarRun) return
    if (handleUnauthorized(error)) {
      clearAvatarPreview()
      return
    }
    clearAvatarPreview()
    toast({ title: errorOf(error, 'Không thể cập nhật ảnh đại diện. Vui lòng thử lại.'), variant: 'error' })
  } finally {
    if (run === avatarRun) avatarPhase.value = 'idle'
  }
}

const removeOpen = ref(false)
const removeBusy = ref(false)
const removeDialog = computed({
  get: () => removeOpen.value,
  set: (value: boolean) => { if (!removeBusy.value) removeOpen.value = value },
})
async function removeAvatar(): Promise<void> {
  if (removeBusy.value || !profile.value?.avatar) return
  removeBusy.value = true
  try {
    const updated = await removeProfileAvatar()
    removeOpen.value = false
    await afterMutation(updated, 'Đã xóa ảnh đại diện')
  } catch (error) {
    if (!handleUnauthorized(error)) toast({ title: errorOf(error, 'Không thể xóa ảnh đại diện.'), variant: 'error' })
  } finally {
    removeBusy.value = false
  }
}

const passwordOpen = ref(false)
const passwordBusy = ref(false)
const passwordDialog = computed({
  get: () => passwordOpen.value,
  set: (value: boolean) => { if (!passwordBusy.value) passwordOpen.value = value },
})
const passwordForm = reactive({ current_password: '', password: '', password_confirmation: '' })
const showPassword = reactive({ current_password: false, password: false, password_confirmation: false })
const passwordErrors = reactive<Record<string, string>>({})
const passwordError = ref('')
const passwordValidation = computed(() => ({
  current_password: !passwordForm.current_password ? 'Nhập mật khẩu hiện tại.' : '',
  password: passwordForm.password.length < 8 ? 'Mật khẩu mới cần ít nhất 8 ký tự.' : '',
  password_confirmation: passwordForm.password_confirmation !== passwordForm.password ? 'Mật khẩu xác nhận chưa khớp.' : '',
}))
function clearPassword(): void {
  passwordForm.current_password = ''
  passwordForm.password = ''
  passwordForm.password_confirmation = ''
  showPassword.current_password = false
  showPassword.password = false
  showPassword.password_confirmation = false
  Object.keys(passwordErrors).forEach((key) => delete passwordErrors[key])
  passwordError.value = ''
}
watch(passwordOpen, (open) => { if (!open) clearPassword() })
async function savePassword(): Promise<void> {
  if (passwordBusy.value) return
  for (const [field, message] of Object.entries(passwordValidation.value)) {
    if (message) passwordErrors[field] = message
  }
  if (Object.values(passwordValidation.value).some(Boolean)) return
  passwordBusy.value = true
  passwordError.value = ''
  try {
    await changeProfilePassword({ ...passwordForm })
    passwordOpen.value = false
    toast({ title: 'Đổi mật khẩu thành công', variant: 'success', description: 'Các phiên đăng nhập khác vẫn có thể còn hiệu lực.' })
  } catch (error) {
    if (handleUnauthorized(error)) return
    passwordError.value = errorOf(error, 'Không thể đổi mật khẩu.')
    for (const [field, messages] of Object.entries(applicationError(error)?.validationErrors ?? {})) {
      passwordErrors[field] = messages[0] ?? passwordError.value
    }
  } finally {
    passwordBusy.value = false
  }
}

function workAreaLabel(value: string | null): string {
  if (!value) return 'Chưa xác định'
  return ({ clinic: 'Clinic', retail: 'Bán hàng', management: 'Quản lý', system: 'Toàn hệ thống' } as Record<string, string>)[value] ?? value
}
function dateLabel(value: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}
</script>

<template>
  <div class="profile-page" data-testid="profile-page">
    <div class="profile-frame">
      <div class="profile-breadcrumb">
        <RouterLink :to="backTo" class="back-link"><ArrowLeft :size="16" aria-hidden="true" /> Quay lại</RouterLink>
        <span class="breadcrumb-divider" aria-hidden="true">/</span>
        <span>Hồ sơ cá nhân</span>
      </div>

      <div v-if="loading" class="profile-loading" role="status" aria-label="Đang tải hồ sơ" data-testid="profile-loading">
        <BaseSkeleton class="h-56 w-full rounded-[28px]" />
        <div class="profile-skeleton-grid"><BaseSkeleton class="h-80 w-full rounded-3xl" /><BaseSkeleton class="h-80 w-full rounded-3xl" /></div>
      </div>

      <section v-else-if="loadError" class="profile-error-state" role="alert" data-testid="profile-error">
        <span class="error-icon"><UserRound :size="27" aria-hidden="true" /></span>
        <h2>Chưa thể mở hồ sơ</h2><p>{{ loadError }}</p>
        <button type="button" class="button-primary" @click="loadProfile"><RefreshCw :size="16" aria-hidden="true" /> Thử lại</button>
      </section>

      <template v-else-if="profile">
        <header class="profile-hero" :class="{ 'profile-hero--menu-open': avatarMenuOpen }">
          <div class="hero-kicker"><span class="kicker-line" /> HỒ SƠ CỦA TÔI <span class="kicker-line" /></div>
          <div class="hero-main">
            <div ref="avatarMenuRoot" class="portrait-wrap">
              <input ref="avatarInput" class="sr-only" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Chọn ảnh đại diện" data-testid="profile-avatar-file" @change="selectAvatar" />
              <button type="button" class="portrait" data-testid="profile-avatar" aria-label="Tùy chọn ảnh đại diện" aria-haspopup="menu" :aria-expanded="avatarMenuOpen" :aria-busy="avatarPhase !== 'idle'" :disabled="avatarPhase === 'saving'" @click="avatarMenuOpen = !avatarMenuOpen">
                <img v-if="avatarUrl && !avatarFailed" :src="avatarUrl" :alt="`Ảnh đại diện ${profile.name}`" @error="avatarFailed = true" />
                <img v-else-if="localPreview" :src="localPreview" alt="Xem trước ảnh được chọn" />
                <span v-else data-testid="profile-avatar-fallback">{{ initials(profile.name) }}</span>
                <span v-if="localPreview && avatarUrl && !avatarFailed" class="portrait-preview"><img :src="localPreview" alt="Xem trước ảnh được chọn" /></span>
                <span class="portrait-edit"><Camera :size="17" aria-hidden="true" /></span>
              </button>
              <div v-if="avatarMenuOpen" class="avatar-menu" role="menu" aria-label="Tùy chọn ảnh đại diện" data-testid="profile-avatar-menu">
                <button type="button" role="menuitem" data-testid="profile-avatar-replace" @click="chooseAvatar"><Camera :size="16" aria-hidden="true" /> Thay ảnh đại diện</button>
                <button v-if="profile.avatar" type="button" role="menuitem" class="avatar-menu-remove" :disabled="avatarPhase !== 'idle'" data-testid="profile-avatar-remove-open" @click="avatarMenuOpen = false; removeOpen = true"><Trash2 :size="16" aria-hidden="true" /> Xóa ảnh đại diện</button>
              </div>
              <p v-if="avatarPhase !== 'idle'" class="portrait-progress" role="status">{{ avatarPhase === 'uploading' ? 'Đang tải ảnh…' : 'Đang lưu ảnh…' }}</p>
            </div>
            <div class="hero-identity">
              <h1 class="profile-name">{{ profile.name }}</h1>
              <p v-if="staff?.staff_code" class="hero-staff-code">Mã nhân viên <span>{{ staff.staff_code }}</span></p>
            </div>
          </div>
        </header>

        <div class="profile-content" :class="{ 'profile-content--solo': !staff }">
          <section class="personal-section" aria-labelledby="personal-heading">
            <div class="section-heading"><div><p class="section-kicker">01 / THÔNG TIN CÁ NHÂN</p><h2 id="personal-heading">Thông tin liên hệ</h2><p>Những thông tin bạn có thể quản lý cho tài khoản của mình.</p></div><button type="button" class="text-action" data-testid="profile-edit-open" @click="openEdit">Chỉnh sửa <ArrowUpRight :size="16" aria-hidden="true" /></button></div>
            <div class="detail-list">
              <div class="detail-row"><div class="detail-icon"><UserRound :size="18" aria-hidden="true" /></div><div><span>Họ và tên</span><strong>{{ profile.name }}</strong></div></div>
              <div class="detail-row"><div class="detail-icon"><Mail :size="18" aria-hidden="true" /></div><div><span>Email · chỉ đọc</span><strong class="break-value">{{ profile.email }}</strong></div></div>
              <div class="detail-row"><div class="detail-icon"><Phone :size="18" aria-hidden="true" /></div><div><span>Số điện thoại</span><strong>{{ profile.phone || 'Chưa cập nhật' }}</strong></div></div>
            </div>
          </section>

          <section v-if="staff" class="employment-section" aria-labelledby="employment-heading">
            <div class="section-heading"><div><p class="section-kicker">02 / CÔNG VIỆC</p><h2 id="employment-heading">Thông tin công tác</h2><p>Được quản lý bởi hệ thống phân công nhân sự.</p></div></div>
            <div class="employment-grid">
              <div><span>Vai trò hệ thống</span><strong>{{ staff.role_label }}</strong></div>
              <div v-if="staff.employment_status_label"><span>Trạng thái công tác</span><strong>{{ staff.employment_status_label }}</strong></div>
              <div v-if="systemScope"><strong>Phạm vi quản trị: Toàn hệ thống</strong></div>
              <div v-else><span>Chi nhánh làm việc</span><strong>{{ branchName }}</strong></div>
              <div v-if="staff.job_title"><span>Chức danh công việc</span><strong>{{ staff.job_title }}</strong></div>
            </div>
            <div v-if="!systemScope && (!staff.current_assignment || staff.current_assignment.effective_from || staff.current_assignment.work_area)" class="assignment-note" data-testid="profile-assignment">
              <Building2 :size="18" aria-hidden="true" />
              <div v-if="staff.current_assignment"><strong>Phân công hiện tại</strong><p><span v-if="dateLabel(staff.current_assignment.effective_from)">Hiệu lực từ {{ dateLabel(staff.current_assignment.effective_from) }}</span><span v-if="dateLabel(staff.current_assignment.effective_from) && staff.current_assignment.work_area"> · </span><span v-if="staff.current_assignment.work_area">Khu vực {{ workAreaLabel(staff.current_assignment.work_area) }}</span></p></div>
              <div v-else><strong>Chưa có phân công hiện tại</strong><p>Thông tin phân công sẽ hiển thị tại đây khi được cập nhật.</p></div>
            </div>
          </section>
          <section class="security-section" aria-labelledby="security-heading"><div class="security-icon"><LockKeyhole :size="23" aria-hidden="true" /></div><div><p class="section-kicker">BẢO MẬT TÀI KHOẢN</p><h2 id="security-heading">Bảo mật tài khoản</h2><p>Bạn có thể đổi mật khẩu đăng nhập của mình tại đây.</p></div><button type="button" class="button-outline" data-testid="profile-password-open" @click="passwordOpen = true">Đổi mật khẩu <ArrowUpRight :size="16" aria-hidden="true" /></button></section>
        </div>
      </template>
    </div>
  </div>

  <BaseDialog v-model="editDialog" class="profile-edit-dialog" title="Chỉnh sửa thông tin" description="Bạn chỉ có thể cập nhật họ tên và số điện thoại." data-testid="profile-edit-dialog">
    <form class="dialog-form" novalidate @submit.prevent="saveEdit">
      <label class="field-label" for="self-name">Họ và tên<input id="self-name" v-model="editForm.name" maxlength="255" autocomplete="name" :aria-invalid="Boolean(editErrors.name)" :aria-describedby="editErrors.name ? 'self-name-error' : undefined" /></label><p v-if="editErrors.name" id="self-name-error" class="field-error" role="alert">{{ editErrors.name }}</p>
      <label class="field-label" for="self-phone">Số điện thoại<input id="self-phone" v-model="editForm.phone" type="tel" maxlength="20" autocomplete="tel" :aria-invalid="Boolean(editErrors.phone)" :aria-describedby="editErrors.phone ? 'self-phone-error' : undefined" /></label><p v-if="editErrors.phone" id="self-phone-error" class="field-error" role="alert">{{ editErrors.phone }}</p>
      <p v-if="editError" class="field-error" role="alert">{{ editError }}</p>
      <div class="dialog-actions"><button type="button" class="button-outline" :disabled="editBusy" @click="editOpen = false">{{ editDirty ? 'Bỏ thay đổi' : 'Đóng' }}</button><button type="submit" class="button-primary" :disabled="editBusy || !editDirty" data-testid="profile-edit-save">{{ editBusy ? 'Đang lưu…' : 'Lưu thay đổi' }}</button></div>
    </form>
  </BaseDialog>

  <BaseDialog v-model="removeDialog" title="Xóa ảnh đại diện?" description="Hồ sơ sẽ trở về ảnh chữ viết tắt của bạn." data-testid="profile-avatar-remove-dialog">
    <div class="dialog-actions"><button type="button" class="button-outline" :disabled="removeBusy" @click="removeDialog = false">Giữ ảnh</button><button type="button" class="button-danger" :disabled="removeBusy" data-testid="profile-avatar-remove-confirm" @click="removeAvatar"><Trash2 :size="16" aria-hidden="true" /> {{ removeBusy ? 'Đang xóa…' : 'Xóa ảnh' }}</button></div>
  </BaseDialog>

  <BaseDialog v-model="passwordDialog" title="Đổi mật khẩu" description="Mật khẩu mới cần ít nhất 8 ký tự. Phiên hiện tại vẫn hoạt động sau khi đổi." data-testid="profile-password-dialog">
    <form class="dialog-form" novalidate @submit.prevent="savePassword">
      <div v-for="field in (['current_password', 'password', 'password_confirmation'] as const)" :key="field" class="password-field"><label class="field-label" :for="`self-${field}`">{{ field === 'current_password' ? 'Mật khẩu hiện tại' : field === 'password' ? 'Mật khẩu mới' : 'Xác nhận mật khẩu mới' }}</label><div class="password-input"><input :id="`self-${field}`" v-model="passwordForm[field]" :type="showPassword[field] ? 'text' : 'password'" :autocomplete="field === 'current_password' ? 'current-password' : 'new-password'" :aria-invalid="Boolean(passwordErrors[field])" :aria-describedby="passwordErrors[field] ? `self-${field}-error` : undefined" /><button type="button" :aria-label="showPassword[field] ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'" @click="showPassword[field] = !showPassword[field]"><EyeOff v-if="showPassword[field]" :size="17" aria-hidden="true" /><Eye v-else :size="17" aria-hidden="true" /></button></div><p v-if="passwordErrors[field]" :id="`self-${field}-error`" class="field-error" role="alert">{{ passwordErrors[field] }}</p></div>
      <p v-if="passwordError" class="field-error" role="alert">{{ passwordError }}</p>
      <div class="dialog-actions"><button type="button" class="button-outline" :disabled="passwordBusy" @click="passwordDialog = false">Hủy</button><button type="submit" class="button-primary" :disabled="passwordBusy" data-testid="profile-password-save">{{ passwordBusy ? 'Đang cập nhật…' : 'Đổi mật khẩu' }}</button></div>
    </form>
  </BaseDialog>
</template>

<style scoped>
.profile-page { --ink: #20382e; --muted: #63756a; --line: #e1e9e2; --sage: #eaf2e9; min-height: 100%; color: var(--ink); background: #f3f6f2; overflow-x: clip; }
.profile-frame { width: min(1120px, 100%); margin: 0 auto; padding: 30px 32px 90px; }
.profile-breadcrumb { display: flex; align-items: center; gap: 11px; margin-bottom: 24px; font-size: 12px; font-weight: 600; color: var(--muted); }
.back-link { display: inline-flex; align-items: center; gap: 7px; color: #436c58; text-decoration: none; border-radius: 6px; }
.back-link:hover, .text-action:hover { color: #214b35; }
.breadcrumb-divider { color: #b3beb5; }
.profile-loading { display: grid; gap: 24px; }
.profile-skeleton-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.profile-error-state { min-height: 430px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; text-align: center; border-radius: 28px; background: white; }
.error-icon { display: grid; place-items: center; width: 64px; height: 64px; border-radius: 20px; color: #47725a; background: var(--sage); }
.profile-error-state h2 { margin-top: 18px; font-size: 24px; font-weight: 650; }.profile-error-state p { margin: 8px 0 22px; color: var(--muted); }
.profile-hero { position: relative; z-index: 1; padding: 26px 36px 30px; border: 1px solid #234b39; border-radius: 26px; background: linear-gradient(112deg, #285d4b 0%, #356d56 56%, #447a62 100%); box-shadow: 0 18px 36px #244b3920; overflow: hidden; color: #fff; }
.profile-hero--menu-open { overflow: visible; }
.profile-hero::after { content: ''; position: absolute; right: -45px; top: -95px; width: 220px; height: 220px; border: 1px solid #d5e7d329; border-radius: 50%; pointer-events: none; }
.hero-kicker { display: flex; align-items: center; gap: 10px; color: #d5e7d5; font-size: 10px; font-weight: 700; letter-spacing: .22em; }.kicker-line { width: 18px; height: 1px; background: #a8c9ac; }
.hero-main { position: relative; z-index: 1; display: flex; align-items: center; gap: 26px; margin-top: 19px; min-width: 0; }
.portrait-wrap { position: relative; flex: none; }
.portrait { position: relative; display: grid; place-items: center; width: 104px; height: 104px; padding: 0; border: 0; border-radius: 29px; background: #dceadb; box-shadow: 0 0 0 4px #ffffff47, 0 10px 26px #102d1d45; color: #315e42; font-size: 35px; font-weight: 600; cursor: pointer; }
.portrait img { width: 100%; height: 100%; object-fit: cover; border-radius: inherit; }
.portrait-preview { position: absolute; top: -11px; right: -13px; width: 38px; height: 38px; overflow: hidden; border: 2px solid #fff; border-radius: 11px; background: #e4ede3; box-shadow: 0 4px 12px #172b222a; }.portrait-preview img { display: block; width: 100%; height: 100%; object-fit: cover; }
.portrait-edit { position: absolute; right: -9px; bottom: -9px; display: grid; place-items: center; width: 35px; height: 35px; border: 2px solid #315d45; border-radius: 12px; color: #2e6043; background: white; box-shadow: 0 4px 14px #102d1d3d; pointer-events: none; }
.portrait-progress { position: absolute; top: calc(100% + 12px); left: 0; right: 0; margin: 0; color: #e4f2e6; font-size: 11px; text-align: center; white-space: nowrap; }
.hero-identity { min-width: 0; flex: 1; }
.profile-name { margin: 0; overflow-wrap: anywhere; color: #fffdf6; font-size: clamp(28px, 3.2vw, 40px); font-weight: 650; letter-spacing: -.045em; line-height: 1.12; }
.hero-staff-code { margin: 10px 0 0; color: #e1eee2; font-size: 12px; }.hero-staff-code span { margin-left: 7px; color: #fffdf6; font-weight: 650; letter-spacing: .025em; }
.avatar-menu { position: absolute; z-index: 5; top: calc(100% + 14px); left: 0; display: grid; gap: 3px; min-width: 210px; padding: 6px; border: 1px solid #dbe7dc; border-radius: 13px; background: #fff; box-shadow: 0 14px 32px #102d1d30; color: var(--ink); }
.avatar-menu button { display: flex; align-items: center; gap: 9px; min-height: 40px; padding: 0 10px; border-radius: 9px; color: #254d38; font-size: 12px; font-weight: 500; text-align: left; white-space: nowrap; }.avatar-menu button:hover { background: #edf5ed; }.avatar-menu .avatar-menu-remove { color: #9d3b43; }.avatar-menu .avatar-menu-remove:hover { background: #fff0f0; }
.button-primary, .button-outline, .button-danger { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 42px; padding: 0 16px; border-radius: 11px; font-size: 12px; font-weight: 650; transition: background .18s, transform .18s, color .18s; white-space: nowrap; }.button-primary { color: white; background: #37684b; }.button-primary:hover { background: #28583c; }.button-outline { color: #395b48; border: 1px solid #d9e3d9; background: white; }.button-outline:hover { background: #f0f6ef; }.button-danger { color: white; background: #a4474f; }.button-danger:hover { background: #873a40; }button:disabled { cursor: not-allowed; opacity: .55; }button:not(:disabled):active { transform: translateY(1px); }
.profile-content { display: grid; grid-template-columns: minmax(0, 1.08fr) minmax(0, .92fr); align-items: start; gap: 18px; margin-top: 20px; }.personal-section, .employment-section { min-width: 0; padding: 27px 28px; border: 1px solid var(--line); border-radius: 22px; background: #fff; box-shadow: 0 5px 20px #20382e0a; }
.section-heading { display: flex; align-items: start; justify-content: space-between; gap: 10px; }.section-kicker { margin: 0 0 7px; color: #547b5f; font-size: 10px; font-weight: 700; letter-spacing: .15em; }.section-heading h2, .security-section h2 { margin: 0; font-size: 21px; font-weight: 650; letter-spacing: -.025em; }.section-heading p:not(.section-kicker), .security-section p:not(.section-kicker) { margin: 7px 0 0; color: var(--muted); font-size: 12px; line-height: 1.6; }.text-action { display: inline-flex; align-items: center; gap: 3px; margin-top: 26px; color: #37664a; font-size: 12px; font-weight: 650; white-space: nowrap; }
.profile-content--solo { grid-template-columns: minmax(0, 1fr); max-width: 700px; margin-inline: auto; }
.detail-list { margin-top: 25px; }.detail-row { display: flex; align-items: center; gap: 14px; padding: 15px 0; border-top: 1px solid #edf0eb; }.detail-icon { display: grid; place-items: center; flex: none; width: 36px; height: 36px; border-radius: 11px; color: #60876a; background: #f1f6ef; }.detail-row > div:last-child { min-width: 0; }.detail-row span, .employment-grid span { display: block; color: #88958a; font-size: 11px; }.detail-row strong, .employment-grid strong { display: block; margin-top: 4px; color: #263e32; font-size: 13px; font-weight: 650; overflow-wrap: anywhere; }.break-value { word-break: break-word; }
.employment-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 22px 14px; margin-top: 29px; }.employment-grid > div { min-width: 0; border-left: 2px solid #dce9dc; padding-left: 11px; }.assignment-note { display: flex; gap: 12px; margin-top: 26px; padding: 14px; border-radius: 15px; color: #457158; background: #edf4eb; }.assignment-note > svg { flex: none; margin-top: 2px; }.assignment-note strong { display: block; font-size: 12px; }.assignment-note p { margin: 4px 0 0; color: #607669; font-size: 11px; line-height: 1.5; }
.security-section { grid-column: 1 / -1; display: flex; align-items: center; gap: 17px; min-width: 0; padding: 22px 28px; border: 1px solid var(--line); border-radius: 22px; background: #fff; box-shadow: 0 5px 20px #20382e0a; }.security-section > div:nth-child(2) { flex: 1; min-width: 0; }.security-icon { display: grid; place-items: center; flex: none; width: 49px; height: 49px; border-radius: 15px; color: #467257; background: #e4efe2; }
.dialog-form { display: grid; gap: 11px; }.field-label { display: grid; gap: 7px; color: #355644; font-size: 13px; font-weight: 500; }.field-label input, .password-input input { width: 100%; min-height: 44px; padding: 0 12px; border: 1px solid #dce5da; border-radius: 10px; color: #254232; background: #fbfcfa; font-size: 15px; font-weight: 400; outline: none; }.field-label input:focus, .password-input input:focus { border-color: #73a37f; box-shadow: 0 0 0 3px #91b79633; }.field-label input[aria-invalid="true"], .password-input input[aria-invalid="true"] { border-color: #bf6a6c; }.field-error { margin: -5px 0 4px; color: #a4474f; font-size: 12px; }.dialog-actions { display: flex; justify-content: flex-end; gap: 9px; margin-top: 11px; }.password-field { display: grid; gap: 6px; }.password-input { position: relative; }.password-input input { padding-right: 48px; }.password-input button { position: absolute; right: 5px; top: 5px; display: grid; place-items: center; width: 34px; height: 34px; border-radius: 7px; color: #6c8272; }.password-input button:hover { background: #eef4ed; }
:global(.profile-edit-dialog h2) { font-size: 20px; font-weight: 600; line-height: 1.3; }
button:focus-visible, a:focus-visible { outline: 2px solid #4a8762; outline-offset: 3px; }
@media (max-width: 1000px) { .profile-frame { padding: 24px 24px 70px; }.hero-main { flex-wrap: wrap; }.profile-content { grid-template-columns: 1fr; }.security-section { grid-column: auto; } }
@media (max-width: 640px) { .profile-frame { padding: 18px 16px 76px; }.profile-breadcrumb { margin-bottom: 17px; }.profile-hero { padding: 23px 21px 26px; border-radius: 22px; }.profile-hero::after { right: -155px; }.hero-main { gap: 17px; margin-top: 22px; }.portrait { width: 82px; height: 82px; border-radius: 24px; font-size: 28px; }.hero-identity { flex-basis: calc(100% - 110px); }.profile-name { font-size: clamp(25px, 7vw, 33px); }.hero-staff-code { margin-top: 7px; font-size: 11px; }.profile-content { gap: 12px; margin-top: 13px; }.personal-section, .employment-section { padding: 23px 20px; border-radius: 20px; }.section-heading h2, .security-section h2 { font-size: 19px; }.text-action { margin-top: 28px; }.employment-grid { gap: 20px 10px; }.security-section { display: grid; grid-template-columns: 42px 1fr; gap: 12px; padding: 21px; }.security-icon { width: 42px; height: 42px; }.security-section .button-outline { grid-column: 1 / -1; width: 100%; }.profile-skeleton-grid { grid-template-columns: 1fr; }.dialog-actions { flex-wrap: wrap; }.dialog-actions button { flex: 1; } }
@media (prefers-reduced-motion: reduce) { .button-primary, .button-outline, .button-danger { transition: none; } }
</style>
