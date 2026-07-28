<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import BaseAlert from '@/components/common/BaseAlert.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import FormActions from '@/components/form/FormActions.vue'
import FormErrorSummary from '@/components/form/FormErrorSummary.vue'
import FormInput from '@/components/form/FormInput.vue'
import FormRadioGroup from '@/components/form/FormRadioGroup.vue'
import FormSelect from '@/components/form/FormSelect.vue'
import FormSwitch from '@/components/form/FormSwitch.vue'
import FormTextarea from '@/components/form/FormTextarea.vue'
import type { ApplicationError } from '@/types/errors'
import {
  branchOptions,
  contactMethodOptions,
  demoFormFieldLabels,
  demoFormFieldNames,
  demoFormInitialValues,
  demoFormSchema,
  type DemoFormValues,
} from '@/types/forms/demoForm'
import { applyServerValidationErrors, focusFirstInvalidField } from '@/utils/forms'

const DEMO_SUBMIT_DELAY_MS = 300

const formError = ref<string>()
const successVisible = ref(false)
const successfulSubmissions = ref(0)
const submissionLocked = ref(false)

const {
  errors,
  handleSubmit,
  isSubmitting,
  resetForm,
  setFieldError,
  validate,
} = useForm<DemoFormValues>({
  validationSchema: toTypedSchema(demoFormSchema),
  initialValues: demoFormInitialValues,
})
const submitting = computed(() => isSubmitting.value || submissionLocked.value)

function focusErrors(fieldNames: readonly string[]): void {
  void nextTick(() => focusFirstInvalidField(fieldNames))
}

const executeSubmit = handleSubmit(
  async () => {
    formError.value = undefined
    successVisible.value = false
    successfulSubmissions.value += 1
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, DEMO_SUBMIT_DELAY_MS)
    })
    successVisible.value = true
  },
)

async function submitForm(event: Event): Promise<void> {
  event.preventDefault()
  if (submissionLocked.value || isSubmitting.value) return

  submissionLocked.value = true
  try {
    const result = await validate()
    if (!result.valid) {
      formError.value = undefined
      successVisible.value = false
      focusErrors(demoFormFieldNames.filter((field) => field in result.errors))
      return
    }
    await executeSubmit()
  } finally {
    submissionLocked.value = false
  }
}

function resetDemo(): void {
  resetForm({ values: demoFormInitialValues })
  formError.value = undefined
  successVisible.value = false
}

function simulateServerErrors(): void {
  successVisible.value = false
  const error: ApplicationError = {
    name: 'ApplicationError',
    kind: 'validation',
    message: 'Không thể xử lý biểu mẫu. Vui lòng kiểm tra lại thông tin.',
    status: 422,
    validationErrors: {
      email: ['Email này đã được sử dụng.'],
      branch: ['Chi nhánh đã chọn không còn khả dụng.'],
    },
    cause: 'foundation-demo',
  }
  const result = applyServerValidationErrors(error, demoFormFieldNames, setFieldError)
  formError.value = result.formError
  focusErrors(Object.keys(result.fieldErrors))
}
</script>

<template>
  <form
    class="grid gap-6"
    novalidate
    data-testid="form-foundation-demo"
    :data-successful-submissions="successfulSubmissions"
    @submit="submitForm"
  >
    <FormErrorSummary
      :errors="errors"
      :form-error="formError"
      :labels="demoFormFieldLabels"
    />

    <BaseAlert
      v-if="successVisible"
      variant="success"
      title="Biểu mẫu hợp lệ"
      description="Thông tin demo đã được xử lý tại chỗ và không được gửi ra ngoài."
      dismissible
      @dismiss="successVisible = false"
    />

    <div class="grid gap-6 lg:grid-cols-2">
      <FormInput
        name="fullName"
        label="Họ và tên"
        placeholder="Nguyễn Văn An"
        autocomplete="name"
        required
      />
      <FormInput
        name="email"
        label="Email"
        type="email"
        inputmode="email"
        placeholder="an@example.com"
        autocomplete="email"
        required
      />
      <FormInput
        name="phone"
        label="Số điện thoại"
        type="tel"
        inputmode="tel"
        placeholder="0901234567"
        autocomplete="tel"
        description="Không bắt buộc; hỗ trợ đầu số 0 hoặc +84."
      />
      <FormSelect
        name="branch"
        label="Chi nhánh"
        placeholder="Chọn chi nhánh"
        :options="branchOptions"
        required
      />
      <FormInput
        name="password"
        label="Mật khẩu"
        type="password"
        autocomplete="new-password"
        description="Tối thiểu 8 ký tự; chỉ tồn tại trong bộ nhớ của form demo."
        required
      />
      <FormInput
        name="confirmPassword"
        label="Xác nhận mật khẩu"
        type="password"
        autocomplete="new-password"
        required
      />
    </div>

    <FormRadioGroup
      name="contactMethod"
      label="Phương thức liên hệ"
      :options="contactMethodOptions"
      orientation="horizontal"
      required
    />

    <FormSwitch
      name="marketingConsent"
      label="Đồng ý nhận thông tin khuyến mãi"
      description="Có thể thay đổi lựa chọn này bất cứ lúc nào."
    />

    <FormTextarea
      name="notes"
      label="Ghi chú"
      placeholder="Nội dung cần Mizuki lưu ý..."
      :maxlength="500"
      show-character-count
    />

    <FormActions
      :submitting="submitting"
      submit-label="Gửi biểu mẫu"
      submitting-label="Đang xử lý…"
      cancel-label="Đặt lại"
      class="border-t border-border pt-6"
      @cancel="resetDemo"
    >
      <template #before>
        <BaseButton
          type="button"
          variant="secondary"
          :disabled="submitting"
          class="w-full sm:mr-auto sm:w-auto"
          @click="simulateServerErrors"
        >
          Mô phỏng lỗi máy chủ
        </BaseButton>
      </template>
    </FormActions>
  </form>
</template>
