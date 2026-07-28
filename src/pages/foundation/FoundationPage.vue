<script setup lang="ts">
import { ref } from 'vue'
import { Bell, Heart, Mail, Search, ShoppingBag } from '@lucide/vue'
import BaseAlert from '@/components/common/BaseAlert.vue'
import BaseBadge from '@/components/common/BaseBadge.vue'
import BaseBottomSheet from '@/components/common/BaseBottomSheet.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseCard from '@/components/common/BaseCard.vue'
import BaseCheckbox from '@/components/common/BaseCheckbox.vue'
import BaseDialog from '@/components/common/BaseDialog.vue'
import BaseDrawer from '@/components/common/BaseDrawer.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BasePagination from '@/components/common/BasePagination.vue'
import BasePopover from '@/components/common/BasePopover.vue'
import BaseRadioGroup from '@/components/common/BaseRadioGroup.vue'
import BaseSeparator from '@/components/common/BaseSeparator.vue'
import BaseSkeleton from '@/components/common/BaseSkeleton.vue'
import BaseSpinner from '@/components/common/BaseSpinner.vue'
import BaseSwitch from '@/components/common/BaseSwitch.vue'
import BaseTextarea from '@/components/common/BaseTextarea.vue'
import BaseToastProvider from '@/components/common/BaseToastProvider.vue'
import BaseTooltip from '@/components/common/BaseTooltip.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import { ROUTE_PATHS } from '@/constants/routes'

const primaryScale = [
  { label: '50', className: 'bg-primary-50 text-primary-950' },
  { label: '100', className: 'bg-primary-100 text-primary-950' },
  { label: '200', className: 'bg-primary-200 text-primary-950' },
  { label: '300', className: 'bg-primary-300 text-primary-950' },
  { label: '400', className: 'bg-primary-400 text-primary-950' },
  { label: '500', className: 'bg-primary-500 text-primary-950' },
  { label: '600', className: 'bg-primary-600 text-primary-foreground' },
  { label: '700', className: 'bg-primary-700 text-primary-foreground' },
  { label: '800', className: 'bg-primary-800 text-primary-foreground' },
  { label: '900', className: 'bg-primary-900 text-primary-foreground' },
  { label: '950', className: 'bg-primary-950 text-primary-foreground' },
] as const

const semanticColors = [
  { label: 'Thành công', className: 'bg-success text-success-foreground' },
  { label: 'Cảnh báo', className: 'bg-warning text-warning-foreground' },
  { label: 'Lỗi', className: 'bg-destructive text-destructive-foreground' },
  { label: 'Thông tin', className: 'bg-info text-info-foreground' },
  { label: 'Cao cấp', className: 'bg-luxury text-luxury-foreground' },
] as const

const radiusSamples = [
  { label: 'XS · 6px', className: 'rounded-xs' },
  { label: 'SM · 8px', className: 'rounded-sm' },
  { label: 'MD · 12px', className: 'rounded-md' },
  { label: 'LG · 16px', className: 'rounded-lg' },
  { label: 'XL · 20px', className: 'rounded-xl' },
  { label: '2XL · 24px', className: 'rounded-2xl' },
  { label: 'Pill', className: 'rounded-pill' },
] as const

const shadowSamples = [
  { label: 'XS', className: 'shadow-xs' },
  { label: 'SM', className: 'shadow-sm' },
  { label: 'MD', className: 'shadow-md' },
  { label: 'LG', className: 'shadow-lg' },
] as const

const spacingSamples = [
  { label: '4', className: 'w-1' },
  { label: '8', className: 'w-2' },
  { label: '16', className: 'w-4' },
  { label: '24', className: 'w-6' },
  { label: '32', className: 'w-8' },
  { label: '48', className: 'w-12' },
  { label: '64', className: 'w-16' },
  { label: '80', className: 'w-20' },
  { label: '96', className: 'w-24' },
] as const

const inputValue = ref('')
const textareaValue = ref('')
const checkboxValue = ref<boolean | 'indeterminate'>(false)
const radioValue = ref('standard')
const switchValue = ref(false)
const showAlert = ref(true)
const dialogOpen = ref(false)
const drawerOpen = ref(false)
const leftDrawerOpen = ref(false)
const bottomSheetOpen = ref(false)
const currentPage = ref(3)

const radioOptions = [
  { value: 'standard', label: 'Giao tiêu chuẩn', description: 'Nhận hàng trong 3–5 ngày.' },
  { value: 'express', label: 'Giao nhanh', description: 'Nhận hàng trong ngày.' },
] as const
</script>

<template>
  <BaseToastProvider v-slot="{ toast }">
    <main class="min-h-svh overflow-x-clip bg-background text-foreground">
    <header class="bg-primary text-primary-foreground">
      <div class="app-container section-spacing">
        <p class="text-caption uppercase tracking-[0.2em] text-primary-foreground/80">
          F2b.2 · Apple-inspired motion refinement
        </p>
        <h1 class="text-display-xl mt-4 max-w-3xl text-primary-foreground">Mizuki foundation</h1>
        <p class="text-body-lg mt-5 max-w-2xl text-primary-foreground/85">
          Trang kiểm tra trực quan cho design tokens, common components và motion tái sử dụng của Mizuki.
        </p>
      </div>
    </header>

    <div class="content-container">
      <section class="section-spacing" data-token-section="typography">
        <div class="mb-8 max-w-2xl">
          <p class="text-caption uppercase tracking-[0.16em] text-muted-foreground">Typography</p>
          <h2 class="text-heading-1 mt-2">Phân cấp rõ ràng, thoáng và dễ đọc</h2>
        </div>
        <div class="grid gap-6 rounded-xl border border-border bg-surface p-6 shadow-xs md:p-8">
          <p class="text-display-xl">Display XL</p>
          <p class="text-display-lg">Display Large</p>
          <p class="text-heading-1">Heading 1</p>
          <p class="text-heading-2">Heading 2</p>
          <p class="text-heading-3">Heading 3</p>
          <p class="text-heading-4">Heading 4</p>
          <div class="grid gap-3 border-t border-border pt-6 md:grid-cols-3">
            <p class="text-body-lg">Body Large · Nội dung nổi bật</p>
            <p class="text-body-md">Body Medium · Nội dung mặc định</p>
            <p class="text-body-sm">Body Small · Thông tin bổ trợ</p>
          </div>
          <p class="text-caption text-muted-foreground">Caption · Nhãn và chú thích ngắn</p>
        </div>
      </section>

      <section class="section-spacing border-t border-border" data-token-section="colors">
        <div class="mb-8">
          <p class="text-caption uppercase tracking-[0.16em] text-muted-foreground">Màu sắc</p>
          <h2 class="text-heading-2 mt-2">Primary scale và semantic colors</h2>
        </div>

        <div class="grid grid-cols-2 overflow-hidden rounded-xl border border-border sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-11">
          <div
            v-for="color in primaryScale"
            :key="color.label"
            :class="['flex min-h-24 items-end p-3 text-caption font-semibold', color.className]"
          >
            {{ color.label }}
          </div>
        </div>

        <div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div
            v-for="color in semanticColors"
            :key="color.label"
            :class="['rounded-lg px-5 py-6 text-body-md font-semibold', color.className]"
          >
            {{ color.label }}
          </div>
        </div>
      </section>

      <section class="section-spacing border-t border-border" data-token-section="surfaces">
        <div class="mb-8">
          <p class="text-caption uppercase tracking-[0.16em] text-muted-foreground">Neutral surfaces</p>
          <h2 class="text-heading-2 mt-2">Nền và phân cấp nội dung</h2>
        </div>
        <div class="grid overflow-hidden rounded-xl border border-border md:grid-cols-3">
          <div class="min-h-40 bg-background p-6">
            <p class="text-heading-4">Background</p>
            <p class="text-body-sm mt-2 text-muted-foreground">#FAFAF7</p>
          </div>
          <div class="min-h-40 bg-surface p-6">
            <p class="text-heading-4">Surface</p>
            <p class="text-body-sm mt-2 text-muted-foreground">#FFFFFF</p>
          </div>
          <div class="min-h-40 bg-surface-subtle p-6">
            <p class="text-heading-4">Surface subtle</p>
            <p class="text-body-sm mt-2 text-muted-foreground">#F5F6F3</p>
          </div>
        </div>
      </section>

      <section class="section-spacing border-t border-border" data-token-section="shape">
        <div class="grid gap-12 lg:grid-cols-2">
          <div>
            <p class="text-caption uppercase tracking-[0.16em] text-muted-foreground">Radius</p>
            <h2 class="text-heading-2 mt-2">Bo góc có hệ thống</h2>
            <div class="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div
                v-for="radius in radiusSamples"
                :key="radius.label"
                :class="['grid min-h-24 place-items-center border border-primary-200 bg-primary-50 p-3 text-caption', radius.className]"
              >
                {{ radius.label }}
              </div>
            </div>
          </div>

          <div>
            <p class="text-caption uppercase tracking-[0.16em] text-muted-foreground">Shadow</p>
            <h2 class="text-heading-2 mt-2">Độ nổi nhẹ và tiết chế</h2>
            <div class="mt-8 grid grid-cols-2 gap-5">
              <div
                v-for="shadow in shadowSamples"
                :key="shadow.label"
                :class="['grid min-h-28 place-items-center rounded-lg border border-border bg-surface text-caption', shadow.className]"
              >
                {{ shadow.label }}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="section-spacing border-t border-border" data-token-section="spacing">
        <p class="text-caption uppercase tracking-[0.16em] text-muted-foreground">Spacing</p>
        <h2 class="text-heading-2 mt-2">Nhịp 4px nhất quán</h2>
        <div class="mt-8 grid gap-4">
          <div v-for="space in spacingSamples" :key="space.label" class="flex min-w-0 items-center gap-4">
            <span class="w-10 shrink-0 text-caption text-muted-foreground">{{ space.label }}px</span>
            <span :class="['h-4 max-w-full rounded-pill bg-primary-400', space.className]"></span>
          </div>
        </div>
      </section>

      <section class="section-spacing border-t border-border" data-token-section="layout">
        <p class="text-caption uppercase tracking-[0.16em] text-muted-foreground">Layout</p>
        <h2 class="text-heading-2 mt-2">Container responsive</h2>
        <div class="mt-8 grid gap-4 md:grid-cols-3">
          <article class="rounded-lg border border-border bg-surface p-6 shadow-xs">
            <p class="text-heading-4">App</p>
            <p class="text-body-sm mt-2 text-muted-foreground">Tối đa 1440px</p>
          </article>
          <article class="rounded-lg border border-border bg-surface p-6 shadow-xs">
            <p class="text-heading-4">Content</p>
            <p class="text-body-sm mt-2 text-muted-foreground">Tối đa 1280px</p>
          </article>
          <article class="rounded-lg border border-border bg-surface p-6 shadow-xs">
            <p class="text-heading-4">Readable</p>
            <p class="text-body-sm mt-2 text-muted-foreground">Tối đa 760px</p>
          </article>
        </div>
        <p class="text-body-md mt-6 text-muted-foreground">
          Padding ngang: mobile 16px · tablet 20px · laptop 24px · desktop 32px.
          Section spacing: 40px · 56px · 80px.
        </p>
      </section>

      <section class="section-spacing border-t border-border" data-token-section="responsive">
        <div class="rounded-2xl bg-primary-50 p-6 md:p-10">
          <p class="text-caption uppercase tracking-[0.16em] text-primary-700">Responsive baseline</p>
          <h2 class="text-heading-2 mt-2">Desktop-first, co giãn có chủ đích</h2>
          <p class="text-body-lg mt-4 max-w-3xl text-text-secondary">
            Breakpoints chuẩn: 640, 768, 1024, 1280 và 1536px. Trang này dùng grid co giãn,
            container có padding theo viewport và không tạo overflow ngang ở 390px.
          </p>
        </div>
      </section>

      <section class="section-spacing border-t border-border" data-component-section="buttons">
        <p class="text-caption uppercase tracking-[0.16em] text-muted-foreground">Common components</p>
        <h2 class="text-heading-2 mt-2">Nút thao tác</h2>
        <p class="text-body-md mt-3 max-w-3xl text-muted-foreground">
          Hover, state change và overlay motion được cung cấp sẵn từ common component foundation.
        </p>
        <div class="mt-8 flex flex-wrap items-center gap-3">
          <BaseButton>Tiếp tục</BaseButton>
          <BaseButton variant="secondary">Lưu nháp</BaseButton>
          <BaseButton variant="outline">Xem chi tiết</BaseButton>
          <BaseButton variant="ghost">Bỏ qua</BaseButton>
          <BaseButton variant="destructive">Xóa</BaseButton>
          <BaseButton loading>Đang lưu</BaseButton>
          <BaseButton disabled>Không khả dụng</BaseButton>
          <BaseButton size="icon" aria-label="Giỏ hàng">
            <ShoppingBag class="size-5" aria-hidden="true" />
          </BaseButton>
        </div>
        <div class="mt-4 flex flex-wrap items-center gap-3">
          <BaseButton size="sm">Cỡ nhỏ</BaseButton>
          <BaseButton size="md">Cỡ vừa</BaseButton>
          <BaseButton size="lg">Cỡ lớn</BaseButton>
          <BaseButton variant="outline">
            <template #icon><Heart class="size-4" /></template>
            Yêu thích
          </BaseButton>
        </div>
      </section>

      <section class="section-spacing border-t border-border" data-component-section="fields">
        <h2 class="text-heading-2">Nhập liệu</h2>
        <div class="mt-8 grid gap-6 lg:grid-cols-2">
          <BaseInput
            v-model="inputValue"
            label="Email"
            type="email"
            placeholder="ban@example.com"
            description="Chúng tôi sẽ gửi xác nhận đến địa chỉ này."
            required
          >
            <template #prefix><Mail class="size-4" /></template>
          </BaseInput>
          <BaseInput
            label="Mã ưu đãi"
            model-value=""
            error="Mã ưu đãi không hợp lệ."
            placeholder="Nhập mã ưu đãi"
          >
            <template #prefix><Search class="size-4" /></template>
          </BaseInput>
          <BaseTextarea
            v-model="textareaValue"
            class="lg:col-span-2"
            label="Ghi chú đơn hàng"
            placeholder="Nhập hướng dẫn giao hàng..."
            :max-length="160"
            show-character-count
          />
        </div>
      </section>

      <section class="section-spacing border-t border-border" data-component-section="selection">
        <h2 class="text-heading-2">Lựa chọn</h2>
        <div class="mt-8 grid gap-8 rounded-xl border border-border bg-surface p-6 lg:grid-cols-3">
          <BaseCheckbox
            v-model="checkboxValue"
            label="Nhận thông tin ưu đãi"
            description="Có thể tắt bất cứ lúc nào."
          />
          <BaseRadioGroup
            v-model="radioValue"
            label="Phương thức giao hàng"
            :options="radioOptions"
          />
          <BaseSwitch
            v-model="switchValue"
            label="Thông báo đơn hàng"
            description="Nhận cập nhật trạng thái qua ứng dụng."
          />
        </div>
      </section>

      <section class="section-spacing border-t border-border" data-component-section="badges-cards">
        <h2 class="text-heading-2">Badge và card</h2>
        <div class="mt-8 flex flex-wrap gap-3">
          <BaseBadge>Mặc định</BaseBadge>
          <BaseBadge variant="success">Đã giao</BaseBadge>
          <BaseBadge variant="warning">Chờ xác nhận</BaseBadge>
          <BaseBadge variant="error">Đã hủy</BaseBadge>
          <BaseBadge variant="info">Đang giao</BaseBadge>
          <BaseBadge variant="outline" size="sm">Mới</BaseBadge>
        </div>
        <div class="mt-8 grid gap-6 md:grid-cols-2">
          <BaseCard>
            <template #title>Chăm sóc da chuyên sâu</template>
            <template #description>Lộ trình được cá nhân hóa theo tình trạng da.</template>
            <p class="text-body-md text-text-secondary">
              Nội dung card sử dụng surface, border và khoảng cách foundation.
            </p>
            <template #footer>
              <BaseButton size="sm">Đặt lịch</BaseButton>
            </template>
          </BaseCard>
          <BaseCard>
            <template #header>
              <div class="flex items-center justify-between gap-4">
                <h3 class="text-heading-4">Đơn hàng MZ-1024</h3>
                <BaseBadge variant="success">Hoàn tất</BaseBadge>
              </div>
            </template>
            <div class="grid gap-4">
              <p class="text-body-md">Ba sản phẩm chăm sóc da</p>
              <BaseSeparator />
              <p class="text-body-md font-semibold">Tổng cộng: 1.250.000 ₫</p>
            </div>
          </BaseCard>
        </div>
      </section>

      <section class="section-spacing border-t border-border" data-component-section="feedback">
        <h2 class="text-heading-2">Thông báo trạng thái</h2>
        <div class="mt-8 grid gap-4">
          <BaseAlert
            v-if="showAlert"
            title="Thông tin đã được cập nhật"
            description="Các thay đổi của bạn đã được lưu an toàn."
            dismissible
            @dismiss="showAlert = false"
          />
          <BaseAlert variant="success" title="Thanh toán thành công" />
          <BaseAlert variant="warning" title="Sản phẩm sắp hết hàng" />
          <BaseAlert
            variant="error"
            title="Không thể hoàn tất yêu cầu"
            description="Vui lòng kiểm tra thông tin và thử lại."
          />
        </div>
      </section>

      <section class="section-spacing border-t border-border" data-component-section="loading">
        <h2 class="text-heading-2">Loading và skeleton</h2>
        <div class="mt-8 grid gap-8 rounded-xl border border-border bg-surface p-6 md:grid-cols-2">
          <div class="flex items-center gap-5">
            <BaseSpinner size="sm" />
            <BaseSpinner size="md" />
            <BaseSpinner size="lg" />
          </div>
          <div class="grid gap-3">
            <div class="flex items-center gap-3">
              <BaseSkeleton shape="circle" class="size-12 shrink-0" />
              <div class="grid flex-1 gap-2">
                <BaseSkeleton shape="text" class="w-1/2" />
                <BaseSkeleton shape="text" class="w-4/5" />
              </div>
            </div>
            <BaseSkeleton class="h-24 w-full" />
          </div>
        </div>
      </section>

      <section class="section-spacing border-t border-border" data-component-section="states">
        <h2 class="text-heading-2">Empty và error state</h2>
        <div class="mt-8 grid gap-6 lg:grid-cols-2">
          <EmptyState
            title="Chưa có sản phẩm yêu thích"
            description="Lưu sản phẩm để dễ dàng tìm lại sau."
          >
            <template #action><BaseButton size="sm">Khám phá sản phẩm</BaseButton></template>
          </EmptyState>
          <ErrorState
            title="Không tải được dữ liệu"
            description="Kết nối đang gián đoạn. Vui lòng thử lại."
          />
        </div>
      </section>

      <section class="section-spacing border-t border-border" data-component-section="apple-motion">
        <p class="text-caption uppercase tracking-[0.16em] text-muted-foreground">Motion foundation</p>
        <h2 class="text-heading-2 mt-2">Apple-inspired motion</h2>
        <p class="text-body-md mt-3 max-w-3xl text-muted-foreground">
          Chuyển động từ tốn, có chiều sâu nhẹ và kết thúc mềm; không bounce, spring hoặc zoom phô trương.
        </p>

        <div class="mt-8 grid gap-5 rounded-xl border border-border bg-surface p-6 md:grid-cols-2">
          <div class="grid content-start gap-3">
            <p class="text-body-sm font-semibold">Phản hồi khi nhấn</p>
            <BaseButton class="w-fit">Nhấn nhẹ nhàng</BaseButton>
          </div>
          <div class="grid content-start gap-3">
            <p class="text-body-sm font-semibold">Skeleton pulse</p>
            <div class="grid gap-2">
              <BaseSkeleton shape="text" class="w-2/3" />
              <BaseSkeleton shape="text" class="w-full" />
            </div>
          </div>
        </div>

        <h3 class="text-heading-4 mt-8">Floating surfaces</h3>
        <div class="mt-4 flex flex-wrap items-center gap-4">
          <BaseTooltip content="Nhận thông báo mới">
            <BaseButton variant="outline" size="icon" aria-label="Thông báo">
              <Bell class="size-5" aria-hidden="true" />
            </BaseButton>
          </BaseTooltip>
          <BasePopover align="start">
            <template #trigger><BaseButton variant="outline">Xem hướng dẫn</BaseButton></template>
            <div class="grid gap-2">
              <h3 class="text-heading-4">Chọn chi nhánh</h3>
              <p class="text-body-sm text-muted-foreground">
                Tồn kho và lịch hẹn sẽ được hiển thị theo chi nhánh đã chọn.
              </p>
            </div>
          </BasePopover>
        </div>

        <h3 class="text-heading-4 mt-8">Overlay surfaces</h3>
        <div class="mt-4 flex flex-wrap gap-3">
          <BaseDialog
            v-model="dialogOpen"
            title="Xác nhận thay đổi"
            description="Thông tin mới sẽ được áp dụng ngay sau khi lưu."
          >
            <template #trigger><BaseButton>Mở dialog</BaseButton></template>
            <p class="text-body-md text-text-secondary">Kiểm tra focus trap, phím Escape và nút đóng.</p>
            <template #footer>
              <BaseButton variant="outline" @click="dialogOpen = false">Hủy</BaseButton>
              <BaseButton @click="dialogOpen = false">Xác nhận</BaseButton>
            </template>
          </BaseDialog>
          <BaseDrawer
            v-model="drawerOpen"
            title="Bộ lọc sản phẩm"
            description="Tinh chỉnh kết quả theo nhu cầu."
          >
            <template #trigger><BaseButton variant="outline">Mở drawer</BaseButton></template>
            <div class="grid gap-4">
              <BaseCheckbox label="Còn hàng" />
              <BaseCheckbox label="Đang khuyến mãi" />
            </div>
            <template #footer><BaseButton class="w-full" @click="drawerOpen = false">Áp dụng</BaseButton></template>
          </BaseDrawer>
          <BaseDrawer
            v-model="leftDrawerOpen"
            title="Danh mục"
            description="Drawer trái dùng cùng motion foundation."
            side="left"
          >
            <template #trigger><BaseButton variant="outline">Mở drawer trái</BaseButton></template>
            <p class="text-body-md text-text-secondary">Nội dung điều hướng mẫu không chứa nghiệp vụ.</p>
            <template #footer>
              <BaseButton class="w-full" @click="leftDrawerOpen = false">Đóng</BaseButton>
            </template>
          </BaseDrawer>
          <BaseBottomSheet
            v-model="bottomSheetOpen"
            title="Chọn phương thức"
            description="Bottom sheet thích hợp cho thao tác trên mobile."
          >
            <template #trigger><BaseButton variant="outline">Mở bottom sheet</BaseButton></template>
            <BaseRadioGroup
              v-model="radioValue"
              label="Phương thức giao hàng"
              :options="radioOptions"
            />
            <template #footer>
              <BaseButton class="w-full" @click="bottomSheetOpen = false">Hoàn tất</BaseButton>
            </template>
          </BaseBottomSheet>
          <BaseButton
            variant="outline"
            @click="
              toast({
                title: 'Motion đã sẵn sàng',
                description: 'Toast vào và rời khỏi màn hình nhẹ nhàng.',
                variant: 'info',
              })
            "
          >
            Xem toast motion
          </BaseButton>
        </div>

        <div class="mt-8 rounded-lg bg-primary-50 p-5">
          <p class="text-body-sm font-semibold text-primary-900">Reduced motion</p>
          <p class="text-body-sm mt-1 text-primary-800">
            Khi hệ điều hành yêu cầu giảm chuyển động, scale, slide và pulse được tắt nhưng mọi thao tác vẫn hoạt động.
          </p>
        </div>
      </section>

      <section class="section-spacing border-t border-border" data-component-section="toast-pagination">
        <h2 class="text-heading-2">Toast và pagination</h2>
        <div class="mt-8 grid gap-8 rounded-xl border border-border bg-surface p-6 md:grid-cols-2 md:items-center">
          <BaseButton
            class="w-fit"
            @click="
              toast({
                title: 'Đã thêm vào giỏ hàng',
                description: 'Sản phẩm đã sẵn sàng để thanh toán.',
                variant: 'success',
              })
            "
          >
            Hiện toast
          </BaseButton>
          <BasePagination v-model:current-page="currentPage" :total-pages="8" />
        </div>
      </section>

      <nav class="section-spacing flex flex-wrap gap-3 border-t border-border" aria-label="Kiểm tra router">
        <RouterLink
          :to="ROUTE_PATHS.forbidden"
          class="rounded-md bg-primary px-5 py-3 text-body-md font-semibold text-primary-foreground transition-colors duration-(--duration-fast) ease-(--ease-standard) hover:bg-primary-800 focus-visible:outline-ring"
        >
          Mở trang không có quyền
        </RouterLink>
        <RouterLink
          :to="ROUTE_PATHS.notFoundExample"
          class="rounded-md border border-border bg-surface px-5 py-3 text-body-md font-semibold text-foreground transition-colors duration-(--duration-fast) ease-(--ease-standard) hover:bg-surface-subtle focus-visible:outline-ring"
        >
          Kiểm tra trang 404
        </RouterLink>
      </nav>
    </div>
    </main>
  </BaseToastProvider>
</template>
