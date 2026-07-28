import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, nextTick } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { useForm } from 'vee-validate'
import FormCheckbox from '@/components/form/FormCheckbox.vue'
import FormFoundationDemo from '@/components/form/FormFoundationDemo.vue'
import FormRadioGroup from '@/components/form/FormRadioGroup.vue'
import FormSelect from '@/components/form/FormSelect.vue'
import type { ServerValidationSource } from '@/types/forms'
import {
  applyServerValidationErrors,
  focusFirstInvalidField,
  normalizeFieldPath,
} from '@/utils/forms'

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
  vi.useRealTimers()
})

function mountDemo(): VueWrapper {
  return mount(FormFoundationDemo, { attachTo: document.body })
}

async function submit(wrapper: VueWrapper): Promise<void> {
  await wrapper.get('form').trigger('submit')
  await flushPromises()
  await vi.waitFor(() => {
    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
  })
  await nextTick()
}

async function fillInvalidValues(wrapper: VueWrapper): Promise<void> {
  await wrapper.get('input[name="fullName"]').setValue('A')
  await wrapper.get('input[name="email"]').setValue('abc')
  await wrapper.get('input[name="password"]').setValue('123')
  await wrapper.get('input[name="confirmPassword"]').setValue('456')
}

async function fillValidValues(wrapper: VueWrapper): Promise<void> {
  await wrapper.get('input[name="fullName"]').setValue('Nguyễn Văn An')
  await wrapper.get('input[name="email"]').setValue('an@example.com')
  await wrapper.get('input[name="phone"]').setValue('0901234567')
  await wrapper.get('input[name="password"]').setValue('Password123')
  await wrapper.get('input[name="confirmPassword"]').setValue('Password123')
  await wrapper.get('select[name="branch"]').setValue('can-tho')
  await wrapper.get('textarea').setValue('Nội dung kiểm thử biểu mẫu')
}

describe('Form foundation demo', () => {
  it('renders all primary fields and actions', () => {
    const wrapper = mountDemo()

    expect(wrapper.find('input[name="fullName"]').exists()).toBe(true)
    expect(wrapper.find('input[name="email"]').exists()).toBe(true)
    expect(wrapper.find('input[name="phone"]').exists()).toBe(true)
    expect(wrapper.find('input[name="password"]').exists()).toBe(true)
    expect(wrapper.find('input[name="confirmPassword"]').exists()).toBe(true)
    expect(wrapper.find('select[name="branch"]').exists()).toBe(true)
    expect(wrapper.findAll('[role="radio"]')).toHaveLength(2)
    expect(wrapper.find('[role="switch"]').exists()).toBe(true)
    expect(wrapper.find('textarea').exists()).toBe(true)
    expect(wrapper.text()).toContain('Mô phỏng lỗi máy chủ')
  })

  it('shows required errors after an empty submit', async () => {
    const wrapper = mountDemo()
    await submit(wrapper)

    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Họ và tên là bắt buộc.')
    expect(wrapper.text()).toContain('Email là bắt buộc.')
    expect(wrapper.text()).toContain('Mật khẩu là bắt buộc.')
    expect(wrapper.text()).toContain('Vui lòng chọn chi nhánh.')
  })

  it('focuses the first invalid field after an empty submit', async () => {
    const wrapper = mountDemo()
    await submit(wrapper)

    expect(document.activeElement).toBe(wrapper.get('input[name="fullName"]').element)
  })

  it('focuses a field from its error-summary link', async () => {
    const wrapper = mountDemo()
    await submit(wrapper)

    const emailErrorLink = wrapper
      .findAll('a')
      .find((candidate) => candidate.text().includes('Email: Email là bắt buộc.'))
    await emailErrorLink?.trigger('click')

    expect(document.activeElement).toBe(wrapper.get('input[name="email"]').element)
  })

  it('rejects an invalid email', async () => {
    const wrapper = mountDemo()
    await fillInvalidValues(wrapper)
    await submit(wrapper)

    expect(wrapper.text()).toContain('Email chưa đúng định dạng.')
  })

  it('rejects a password shorter than eight characters', async () => {
    const wrapper = mountDemo()
    await fillInvalidValues(wrapper)
    await submit(wrapper)

    expect(wrapper.text()).toContain('Mật khẩu phải có ít nhất 8 ký tự.')
  })

  it('rejects a mismatched password confirmation', async () => {
    const wrapper = mountDemo()
    await fillInvalidValues(wrapper)
    await submit(wrapper)

    expect(wrapper.text()).toContain('Mật khẩu xác nhận không khớp.')
  })

  it('submits valid values and shows success feedback', async () => {
    vi.useFakeTimers()
    const wrapper = mountDemo()
    await fillValidValues(wrapper)

    await wrapper.get('form').trigger('submit')
    await flushPromises()
    await vi.waitFor(() => {
      expect(wrapper.get('form').attributes('data-successful-submissions')).toBe('1')
      expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined()
    })

    await vi.advanceTimersByTimeAsync(300)
    await flushPromises()

    expect(wrapper.get('form').attributes('data-successful-submissions')).toBe('1')
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Biểu mẫu hợp lệ')
    })
  })

  it('blocks a second submit while the first is running', async () => {
    vi.useFakeTimers()
    const wrapper = mountDemo()
    await fillValidValues(wrapper)

    const form = wrapper.get('form')
    await form.trigger('submit')
    await form.trigger('submit')
    await flushPromises()

    await vi.waitFor(() => {
      expect(form.attributes('data-successful-submissions')).toBe('1')
    })
    await vi.advanceTimersByTimeAsync(300)
  })

  it('maps simulated email and branch errors', async () => {
    const wrapper = mountDemo()
    const button = wrapper
      .findAll('button')
      .find((candidate) => candidate.text() === 'Mô phỏng lỗi máy chủ')

    await button?.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Email này đã được sử dụng.')
    expect(wrapper.text()).toContain('Chi nhánh đã chọn không còn khả dụng.')
    expect(document.activeElement).toBe(wrapper.get('input[name="email"]').element)
  })

  it('shows the form-level server message in the summary', async () => {
    const wrapper = mountDemo()
    const button = wrapper
      .findAll('button')
      .find((candidate) => candidate.text() === 'Mô phỏng lỗi máy chủ')

    await button?.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain(
      'Không thể xử lý biểu mẫu. Vui lòng kiểm tra lại thông tin.',
    )
  })

  it('resets values and previous feedback', async () => {
    const wrapper = mountDemo()
    await wrapper.get('input[name="fullName"]').setValue('Dữ liệu tạm')
    await submit(wrapper)

    const resetButton = wrapper
      .findAll('button')
      .find((candidate) => candidate.text() === 'Đặt lại')
    await resetButton?.trigger('click')

    expect(wrapper.get<HTMLInputElement>('input[name="fullName"]').element.value).toBe('')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('sets aria-invalid and links the field error after validation', async () => {
    const wrapper = mountDemo()
    await submit(wrapper)

    const email = wrapper.get('input[name="email"]')
    expect(email.attributes('aria-invalid')).toBe('true')
    expect(email.attributes('aria-describedby')).toContain('form-field-email-error')
    expect(wrapper.find('#form-field-email-error').exists()).toBe(true)
  })

  it('does not issue a network request', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open')
    const wrapper = mountDemo()

    await submit(wrapper)
    const button = wrapper
      .findAll('button')
      .find((candidate) => candidate.text() === 'Mô phỏng lỗi máy chủ')
    await button?.trigger('click')

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(xhrSpy).not.toHaveBeenCalled()
  })
})

describe('Form utilities', () => {
  it.each([
    ['evidence[0]', 'evidence.0'],
    ['evidence.0', 'evidence.0'],
    ['items[0].quantity', 'items.0.quantity'],
    ['items.0.quantity', 'items.0.quantity'],
    ['user[email]', 'user.email'],
  ])('normalizes %s to %s', (source, expected) => {
    expect(normalizeFieldPath(source)).toBe(expected)
  })

  it('maps known fields and moves unknown fields to form feedback', () => {
    const error: ServerValidationSource = {
      message: 'Dữ liệu chưa hợp lệ.',
      validationErrors: {
        email: 'Email đã tồn tại.',
        'evidence[0]': ['Tệp không hợp lệ.'],
      },
    }
    const mapped: Record<string, string | undefined> = {}

    const result = applyServerValidationErrors(error, ['email'] as const, (field, message) => {
      mapped[field] = message
    })

    expect(mapped.email).toBe('Email đã tồn tại.')
    expect(result.formError).toContain('Dữ liệu chưa hợp lệ.')
    expect(result.formError).toContain('Tệp không hợp lệ.')
  })

  it('focuses an existing field and does not throw for a missing field', () => {
    const input = document.createElement('input')
    input.id = 'form-field-email'
    document.body.append(input)

    expect(focusFirstInvalidField(['email'])).toBe(input)
    expect(document.activeElement).toBe(input)
    expect(() => focusFirstInvalidField(['missing'])).not.toThrow()
  })
})

describe('Form control bindings', () => {
  const BindingHarness = defineComponent({
    components: { FormCheckbox, FormRadioGroup, FormSelect },
    setup() {
      const { values } = useForm({
        initialValues: {
          consent: false,
          contact: 'email',
          branch: '',
        },
      })
      const contactOptions = [
        { value: 'email', label: 'Email' },
        { value: 'phone', label: 'Điện thoại' },
      ]
      const branchOptions = [
        { value: 'can-tho', label: 'Mizuki Cần Thơ' },
        { value: 'ninh-kieu', label: 'Mizuki Ninh Kiều' },
      ]
      return { values, contactOptions, branchOptions }
    },
    template: `
      <FormCheckbox name="consent" label="Đồng ý" />
      <FormRadioGroup name="contact" label="Liên hệ" :options="contactOptions" />
      <FormSelect name="branch" label="Chi nhánh" :options="branchOptions" />
      <output data-testid="consent">{{ String(values.consent) }}</output>
      <output data-testid="contact">{{ values.contact }}</output>
      <output data-testid="branch">{{ values.branch }}</output>
    `,
  })

  it('updates a boolean checkbox field', async () => {
    const wrapper = mount(BindingHarness)
    await wrapper.get('[role="checkbox"]').trigger('click')
    expect(wrapper.get('[data-testid="consent"]').text()).toBe('true')
  })

  it('updates a radio field', async () => {
    const wrapper = mount(BindingHarness)
    await wrapper.findAll('[role="radio"]')[1]?.trigger('click')
    expect(wrapper.get('[data-testid="contact"]').text()).toBe('phone')
  })

  it('updates a select field', async () => {
    const wrapper = mount(BindingHarness)
    await wrapper.get('select[name="branch"]').setValue('ninh-kieu')
    expect(wrapper.get('[data-testid="branch"]').text()).toBe('ninh-kieu')
  })
})
