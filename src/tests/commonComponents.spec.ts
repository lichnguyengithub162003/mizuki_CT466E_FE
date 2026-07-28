import { describe, expect, it } from 'vitest'
import { defineComponent, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseCheckbox from '@/components/common/BaseCheckbox.vue'
import BaseBottomSheet from '@/components/common/BaseBottomSheet.vue'
import BaseDialog from '@/components/common/BaseDialog.vue'
import BaseDrawer from '@/components/common/BaseDrawer.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BasePagination from '@/components/common/BasePagination.vue'
import BaseSkeleton from '@/components/common/BaseSkeleton.vue'
import BaseSwitch from '@/components/common/BaseSwitch.vue'
import BaseToastProvider from '@/components/common/BaseToastProvider.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'

describe('BaseButton', () => {
  it('applies variants and prevents interaction while loading or disabled', async () => {
    const primary = mount(BaseButton, { slots: { default: 'Tiếp tục' } })
    const destructive = mount(BaseButton, {
      props: { variant: 'destructive' },
      slots: { default: 'Xóa' },
    })
    const loading = mount(BaseButton, {
      props: { loading: true },
      slots: { default: 'Đang lưu' },
    })
    const disabled = mount(BaseButton, {
      props: { disabled: true },
      slots: { default: 'Không khả dụng' },
    })

    expect(primary.classes()).toContain('bg-primary')
    expect(primary.classes()).toContain('motion-interactive')
    expect(destructive.classes()).toContain('bg-destructive')
    expect(loading.attributes('disabled')).toBeDefined()
    expect(loading.attributes('aria-busy')).toBe('true')
    expect(disabled.attributes('disabled')).toBeDefined()

    await loading.trigger('click')
    expect(loading.emitted('click')).toBeUndefined()
  })
})

describe('BaseInput', () => {
  it('updates its typed model and links error feedback with ARIA', async () => {
    const wrapper = mount(BaseInput, {
      props: {
        label: 'Email',
        modelValue: '',
        error: 'Email không hợp lệ.',
        'onUpdate:modelValue': (value) => wrapper.setProps({ modelValue: value }),
      },
    })

    const input = wrapper.get('input')
    await input.setValue('mizuki@example.com')

    expect(wrapper.props('modelValue')).toBe('mizuki@example.com')
    expect(wrapper.get('label').text()).toContain('Email')
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(input.attributes('aria-describedby')).toContain('-error')
    expect(wrapper.text()).toContain('Email không hợp lệ.')
  })
})

describe('selection controls', () => {
  it('supports checkbox and switch interaction', async () => {
    const checkbox = mount(BaseCheckbox, {
      props: { label: 'Nhận ưu đãi' },
    })
    const switchControl = mount(BaseSwitch, {
      props: { label: 'Thông báo đơn hàng' },
    })

    await checkbox.get('[role="checkbox"]').trigger('click')
    await switchControl.get('[role="switch"]').trigger('click')

    expect(checkbox.emitted('update:modelValue')?.[0]).toEqual([true])
    expect(switchControl.emitted('update:modelValue')?.[0]).toEqual([true])
    expect(checkbox.get('[role="checkbox"]').classes()).toContain('motion-state-colors')
    expect(switchControl.get('[role="switch"]').classes()).toContain('motion-state-colors')
  })
})

describe('BaseDialog', () => {
  it('opens from its trigger and closes from its accessible close action', async () => {
    const wrapper = mount(BaseDialog, {
      attachTo: document.body,
      props: {
        title: 'Xác nhận thay đổi',
        description: 'Kiểm tra hộp thoại.',
      },
      slots: {
        trigger: '<button type="button">Mở dialog</button>',
        default: '<p>Nội dung xác nhận</p>',
      },
    })

    await wrapper.get('button').trigger('click')
    await nextTick()

    const dialog = document.body.querySelector('[role="dialog"]')
    expect(dialog?.textContent).toContain('Xác nhận thay đổi')
    expect(dialog?.classList.contains('motion-dialog')).toBe(true)

    const closeButton = document.body.querySelector<HTMLButtonElement>(
      'button[aria-label="Đóng hộp thoại"]',
    )
    closeButton?.click()
    await nextTick()

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([false])
  })
})

describe('drawer and bottom sheet', () => {
  it('keeps accessible open and close behavior with directional motion classes', async () => {
    const drawer = mount(BaseDrawer, {
      attachTo: document.body,
      props: {
        title: 'Bộ lọc',
        description: 'Lọc kết quả.',
        side: 'left',
      },
      slots: {
        trigger: '<button type="button">Mở drawer trái</button>',
      },
    })

    await drawer.get('button').trigger('click')
    await nextTick()
    const drawerDialog = document.body.querySelector('.motion-drawer-left[role="dialog"]')
    expect(drawerDialog?.classList.contains('motion-drawer-left')).toBe(true)

    document.body
      .querySelector<HTMLButtonElement>('button[aria-label="Đóng ngăn bên"]')
      ?.click()
    await nextTick()
    expect(drawer.emitted('update:modelValue')?.at(-1)).toEqual([false])

    const sheet = mount(BaseBottomSheet, {
      attachTo: document.body,
      props: {
        title: 'Chọn phương thức',
        description: 'Chọn một phương thức.',
      },
      slots: {
        trigger: '<button type="button">Mở bảng dưới</button>',
      },
    })

    await sheet.get('button').trigger('click')
    await nextTick()
    const sheetDialog = document.body.querySelector('.motion-sheet[role="dialog"]')
    expect(sheetDialog?.classList.contains('motion-sheet')).toBe(true)

    document.body
      .querySelector<HTMLButtonElement>('button[aria-label="Đóng bảng dưới"]')
      ?.click()
    await nextTick()
    expect(sheet.emitted('update:modelValue')?.at(-1)).toEqual([false])
  })
})

describe('BasePagination', () => {
  it('emits the next valid page and disables unavailable navigation', async () => {
    const wrapper = mount(BasePagination, {
      props: {
        currentPage: 2,
        totalPages: 4,
      },
    })

    await wrapper.get('button[aria-label="Trang sau"]').trigger('click')

    expect(wrapper.emitted('update:currentPage')?.[0]).toEqual([3])
    expect(wrapper.emitted('change')?.[0]).toEqual([3])

    await wrapper.setProps({ currentPage: 4 })
    expect(wrapper.get('button[aria-label="Trang sau"]').attributes('disabled')).toBeDefined()
  })
})

describe('BaseToastProvider', () => {
  it('creates and dismisses a typed toast', async () => {
    const ToastHarness = defineComponent({
      components: { BaseToastProvider },
      template: `
        <BaseToastProvider v-slot="{ toast }">
          <button
            type="button"
            @click="toast({ title: 'Đã lưu', description: 'Thay đổi đã được lưu.', variant: 'success', duration: 0 })"
          >
            Hiện toast
          </button>
        </BaseToastProvider>
      `,
    })
    const wrapper = mount(ToastHarness)

    await wrapper.get('button').trigger('click')
    expect(wrapper.text()).toContain('Đã lưu')
    expect(wrapper.text()).toContain('Thay đổi đã được lưu.')

    await wrapper.get('button[aria-label="Đóng thông báo"]').trigger('click')
    expect(wrapper.text()).not.toContain('Thay đổi đã được lưu.')
  })
})

describe('shared states', () => {
  it('renders empty and error states with their actions', async () => {
    const emptyState = mount(EmptyState, {
      props: {
        title: 'Chưa có dữ liệu',
        description: 'Nội dung sẽ xuất hiện tại đây.',
      },
      slots: {
        action: '<button type="button">Khám phá</button>',
      },
    })
    const errorState = mount(ErrorState, {
      props: {
        title: 'Không tải được dữ liệu',
        description: 'Vui lòng thử lại.',
      },
    })

    expect(emptyState.text()).toContain('Chưa có dữ liệu')
    expect(emptyState.get('button').text()).toBe('Khám phá')
    expect(errorState.attributes('role')).toBe('alert')

    await errorState.get('button').trigger('click')
    expect(errorState.emitted('retry')).toHaveLength(1)
  })

  it('uses the reusable reduced-motion-aware skeleton class', () => {
    const skeleton = mount(BaseSkeleton)

    expect(skeleton.classes()).toContain('motion-skeleton')
    expect(skeleton.classes()).not.toContain('animate-pulse')
  })
})
