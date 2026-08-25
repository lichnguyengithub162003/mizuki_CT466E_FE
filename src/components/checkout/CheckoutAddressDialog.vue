<script setup lang="ts">
import { MapPin, Pencil, Plus, Star, Trash2 } from '@lucide/vue'
import { computed, nextTick, reactive, ref, watch } from 'vue'
import BaseDialog from '@/components/common/BaseDialog.vue'
import {
  useLocationDistrictsQuery,
  useLocationProvincesQuery,
  useLocationWardsQuery,
} from '@/queries/locations/locationQueries'
import type { CheckoutAddress, CheckoutAddressDraft } from '@/types/customer'
import type { CustomerAddressFormErrors } from '@/types/addresses'

type AddressErrors = CustomerAddressFormErrors

const props = withDefaults(
  defineProps<{
    addresses: readonly CheckoutAddress[]
    selectedId?: string
    startInForm?: boolean
    loading?: boolean
    saving?: boolean
    errorMessage?: string
    serverErrors?: CustomerAddressFormErrors
    deletingId?: string
  }>(),
  {
    startInForm: false,
    selectedId: '',
    loading: false,
    saving: false,
    errorMessage: '',
    deletingId: '',
  },
)

const emit = defineEmits<{
  continue: [address: CheckoutAddressDraft]
  select: [id: string]
  edit: [address: CheckoutAddress]
  setDefault: [id: string]
  delete: [id: string]
  resetError: []
}>()

const open = defineModel<boolean>({ default: false })
const draft = defineModel<CheckoutAddressDraft>('draft', { required: true })
const view = ref<'list' | 'form'>(props.startInForm || props.addresses.length === 0 ? 'form' : 'list')
const selectedAddressId = ref(props.addresses[0]?.id ?? '')
const errors = reactive<AddressErrors>({})

const formActive = computed(() => open.value && view.value === 'form')
const selectedProvinceId = computed(() => draft.value.ghn_province_id)
const selectedDistrictId = computed(() => draft.value.ghn_district_id)

const provincesQuery = useLocationProvincesQuery(formActive)
const districtsQuery = useLocationDistrictsQuery(selectedProvinceId, formActive)
const wardsQuery = useLocationWardsQuery(selectedDistrictId, formActive)

const provinceOptions = computed(() => provincesQuery.data.value ?? [])
const districtOptions = computed(() =>
  selectedProvinceId.value === null ? [] : (districtsQuery.data.value ?? []),
)
const wardOptions = computed(() =>
  selectedDistrictId.value === null ? [] : (wardsQuery.data.value ?? []),
)
const detailEnabled = computed(
  () => Boolean(
    draft.value.ghn_province_id !== null
    && draft.value.ghn_district_id !== null
    && draft.value.ghn_ward_code,
  ),
)
const provinceLoading = computed(() => formActive.value && provincesQuery.isPending.value)
const districtLoading = computed(() =>
  selectedProvinceId.value !== null && districtsQuery.isPending.value,
)
const wardLoading = computed(() =>
  selectedDistrictId.value !== null && wardsQuery.isPending.value,
)

watch(open, (isOpen) => {
  if (!isOpen) return
  view.value = props.startInForm || props.addresses.length === 0 ? 'form' : 'list'
  selectedAddressId.value = props.addresses.find((address) => address.id === props.selectedId)?.id
    ?? props.addresses.find((address) => address.isDefault)?.id
    ?? props.addresses[0]?.id
    ?? ''
  clearErrors()
})

watch(() => props.addresses, (addresses) => {
  if (addresses.some((address) => address.id === selectedAddressId.value)) return
  selectedAddressId.value = addresses.find((address) => address.isDefault)?.id
    ?? addresses[0]?.id
    ?? ''
})

watch(() => props.serverErrors, async (serverErrors) => {
  clearErrors()
  if (!serverErrors || Object.keys(serverErrors).length === 0) return
  Object.assign(errors, serverErrors)
  await nextTick()
  const firstInvalid = document.querySelector<HTMLElement>(
    '[data-address-form] [aria-invalid="true"]',
  )
  firstInvalid?.focus()
})

function clearErrors(): void {
  Object.keys(errors).forEach((key) => {
    delete errors[key as keyof AddressErrors]
  })
}

function updateField<Key extends keyof CheckoutAddressDraft>(
  key: Key,
  value: CheckoutAddressDraft[Key],
): void {
  draft.value = { ...draft.value, [key]: value }
  delete errors[key as keyof AddressErrors]
}

function handleTextInput(key: 'fullName' | 'phone' | 'detail', event: Event): void {
  const target = event.target
  if (target instanceof HTMLInputElement) updateField(key, target.value)
}

function handleProvince(event: Event): void {
  const target = event.target
  if (!(target instanceof HTMLSelectElement)) return
  const provinceId = target.value ? Number(target.value) : null
  const province = provinceOptions.value.find(
    (option) => option.ghn_province_id === provinceId,
  )
  draft.value = {
    ...draft.value,
    ghn_province_id: provinceId,
    ghn_district_id: null,
    ghn_ward_code: '',
    provinceName: province?.name ?? '',
    districtName: '',
    wardName: '',
  }
  delete errors.province
  delete errors.district
  delete errors.ward
}

function handleDistrict(event: Event): void {
  const target = event.target
  if (!(target instanceof HTMLSelectElement)) return
  const districtId = target.value ? Number(target.value) : null
  const district = districtOptions.value.find(
    (option) => option.ghn_district_id === districtId,
  )
  draft.value = {
    ...draft.value,
    ghn_district_id: districtId,
    ghn_ward_code: '',
    districtName: district?.name ?? '',
    wardName: '',
  }
  delete errors.district
  delete errors.ward
}

function handleWard(event: Event): void {
  const target = event.target
  if (!(target instanceof HTMLSelectElement)) return
  const ward = wardOptions.value.find(
    (option) => option.ghn_ward_code === target.value,
  )
  draft.value = {
    ...draft.value,
    ghn_ward_code: target.value,
    wardName: ward?.name ?? '',
  }
  delete errors.ward
}

function validate(): boolean {
  clearErrors()
  const normalizedPhone = draft.value.phone.replace(/\s+/g, '')
  if (draft.value.fullName.trim().length < 2) errors.fullName = 'Vui lòng nhập họ và tên.'
  if (!/^(?:0|\+84)(?:3|5|7|8|9)\d{8}$/.test(normalizedPhone)) {
    errors.phone = 'Số điện thoại Việt Nam chưa hợp lệ.'
  }
  if (draft.value.ghn_province_id === null) errors.province = 'Vui lòng chọn Tỉnh/Thành phố.'
  if (draft.value.ghn_district_id === null) errors.district = 'Vui lòng chọn Quận/Huyện.'
  if (!draft.value.ghn_ward_code) errors.ward = 'Vui lòng chọn Phường/Xã.'
  if (draft.value.detail.trim().length < 5) errors.detail = 'Vui lòng nhập số nhà và tên đường.'
  return Object.keys(errors).length === 0
}

async function submitAddress(): Promise<void> {
  if (props.saving) return
  if (!validate()) {
    await nextTick()
    const firstInvalid = document.querySelector<HTMLElement>('[data-address-form] [aria-invalid="true"]')
    firstInvalid?.focus()
    return
  }

  emit('continue', {
    ...draft.value,
    fullName: draft.value.fullName.trim(),
    phone: draft.value.phone.replace(/\s+/g, ''),
    detail: draft.value.detail.trim(),
  })
}

function confirmSelection(): void {
  if (!selectedAddressId.value) return
  emit('select', selectedAddressId.value)
  open.value = false
}

function editAddress(address: CheckoutAddress): void {
  if (props.saving) return
  emit('resetError')
  draft.value = { ...address }
  view.value = 'form'
  emit('edit', address)
}

function startNewAddress(): void {
  if (props.saving) return
  emit('resetError')
  draft.value = {
    fullName: '',
    phone: '',
    ghn_province_id: null,
    ghn_district_id: null,
    ghn_ward_code: '',
    provinceName: '',
    districtName: '',
    wardName: '',
    detail: '',
    isDefault: props.addresses.length === 0,
  }
  view.value = 'form'
}

function fullAddress(address: CheckoutAddress): string {
  return [
    address.detail,
    address.hamlet,
    address.wardName,
    address.districtName,
    address.provinceName,
  ].filter(Boolean).join(', ')
}

function queryErrorMessage(error: unknown): string {
  if (
    typeof error === 'object'
    && error !== null
    && 'message' in error
    && typeof error.message === 'string'
  ) {
    return error.message
  }

  return 'Không thể tải dữ liệu địa giới. Vui lòng thử lại.'
}
</script>

<template>
  <BaseDialog
    v-model="open"
    :title="draft.id ? 'Cập nhật địa chỉ' : 'Địa chỉ nhận hàng'"
    description="Địa chỉ được lưu vào tài khoản và dùng cho đơn hàng này."
    close-label="Đóng thêm địa chỉ"
    class="max-w-2xl"
  >
    <div data-address-dialog>
      <div v-if="view === 'list'" class="grid gap-3" data-address-list>
        <p v-if="props.loading" class="rounded-xl bg-muted p-4 text-body-sm text-text-secondary" role="status" data-address-loading>
          Đang tải địa chỉ đã lưu...
        </p>
        <p v-else-if="props.errorMessage" class="rounded-xl bg-destructive/10 p-4 text-body-sm text-destructive" role="alert" data-address-error>
          {{ props.errorMessage }}
        </p>
        <div
          v-for="address in props.addresses"
          :key="address.id"
          class="rounded-2xl border border-primary-100 p-4 has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50"
        >
          <label class="flex cursor-pointer items-start gap-3">
            <input
              v-model="selectedAddressId"
              type="radio"
              name="checkout-address"
              :value="address.id"
              class="mt-1 size-4 accent-primary"
            />
            <span class="min-w-0 flex-1">
              <strong class="text-body-md text-primary-950">{{ address.fullName }}</strong>
              <span class="ml-2 text-body-sm text-text-secondary">{{ address.phone }}</span>
              <span class="mt-1 block text-body-sm leading-5 text-text-secondary">{{ fullAddress(address) }}</span>
              <span v-if="address.isDefault" class="mt-2 inline-flex rounded-full bg-primary-100 px-2 py-1 text-caption font-semibold text-primary-800">
                Mặc định
              </span>
            </span>
          </label>
          <div class="mt-2 flex flex-wrap gap-2 pl-7">
            <button
              type="button"
              class="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-caption font-semibold text-primary-800 hover:bg-primary-50"
              :disabled="props.saving"
              :aria-label="`Sửa địa chỉ của ${address.fullName}`"
              @click="editAddress(address)"
            >
              <Pencil class="size-3.5" aria-hidden="true" />
              Sửa
            </button>
            <button
              v-if="!address.isDefault"
              type="button"
              class="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-caption font-semibold text-primary-800 hover:bg-primary-50"
              :disabled="props.saving"
              :aria-label="`Đặt địa chỉ của ${address.fullName} làm mặc định`"
              @click="emit('setDefault', address.id)"
            >
              <Star class="size-3.5" aria-hidden="true" />
              Đặt mặc định
            </button>
            <button
              type="button"
              class="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-caption font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50"
              :disabled="props.saving"
              :aria-label="`Xóa địa chỉ của ${address.fullName}`"
              @click="emit('delete', address.id)"
            >
              <Trash2 class="size-3.5" aria-hidden="true" />
              {{ props.deletingId === address.id ? 'Đang xóa...' : 'Xóa' }}
            </button>
          </div>
        </div>
        <button
          type="button"
          class="motion-interactive inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-primary-200 text-body-sm font-semibold text-primary-900 hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          :disabled="props.saving"
          @click="startNewAddress"
        >
          <Plus class="size-4" aria-hidden="true" />
          Thêm địa chỉ khác
        </button>
        <button
          type="button"
          class="motion-interactive min-h-11 rounded-xl bg-primary px-4 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          :disabled="!selectedAddressId"
          @click="confirmSelection"
        >
          Dùng địa chỉ này
        </button>
      </div>

      <form v-else class="grid gap-4" data-address-form novalidate @submit.prevent="submitAddress">
        <p v-if="props.errorMessage" class="rounded-xl bg-destructive/10 p-3 text-body-sm text-destructive" role="alert" data-address-mutation-error>
          {{ props.errorMessage }}
        </p>
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="grid gap-1.5 text-body-sm font-semibold text-primary-950">
            Họ và tên
            <input
              id="checkout-full-name"
              :value="draft.fullName"
              type="text"
              autocomplete="name"
              required
              class="h-11 rounded-xl border border-input px-3 font-normal outline-none focus:border-primary-600 focus:ring-2 focus:ring-ring/20"
              :aria-invalid="Boolean(errors.fullName)"
              :aria-describedby="errors.fullName ? 'checkout-full-name-error' : undefined"
              @input="handleTextInput('fullName', $event)"
            />
            <span v-if="errors.fullName" id="checkout-full-name-error" class="text-caption text-destructive">{{ errors.fullName }}</span>
          </label>
          <label class="grid gap-1.5 text-body-sm font-semibold text-primary-950">
            Số điện thoại
            <input
              id="checkout-phone"
              :value="draft.phone"
              type="tel"
              inputmode="tel"
              autocomplete="tel"
              required
              class="h-11 rounded-xl border border-input px-3 font-normal outline-none focus:border-primary-600 focus:ring-2 focus:ring-ring/20"
              :aria-invalid="Boolean(errors.phone)"
              :aria-describedby="errors.phone ? 'checkout-phone-error' : undefined"
              @input="handleTextInput('phone', $event)"
            />
            <span v-if="errors.phone" id="checkout-phone-error" class="text-caption text-destructive">{{ errors.phone }}</span>
          </label>
        </div>

        <div class="grid gap-4 sm:grid-cols-3">
          <div class="grid content-start gap-1.5 text-body-sm font-semibold text-primary-950">
            <label for="checkout-province">Tỉnh/Thành phố</label>
            <select
              id="checkout-province"
              :value="draft.ghn_province_id ?? ''"
              :disabled="provinceLoading || provincesQuery.isError.value || provinceOptions.length === 0"
              required
              class="h-11 min-w-0 rounded-xl border border-input bg-white px-3 font-normal disabled:bg-muted"
              :aria-invalid="Boolean(errors.province)"
              :aria-describedby="errors.province ? 'checkout-province-error' : undefined"
              @change="handleProvince"
            >
              <option value="">{{ provinceLoading ? 'Đang tải tỉnh/thành...' : 'Chọn tỉnh/thành' }}</option>
              <option
                v-for="option in provinceOptions"
                :key="option.ghn_province_id"
                :value="option.ghn_province_id"
              >
                {{ option.name }}
              </option>
            </select>
            <p v-if="provinceLoading" class="text-caption font-normal text-text-secondary" role="status" data-location-loading="province">
              Đang tải tỉnh/thành...
            </p>
            <div v-else-if="provincesQuery.isError.value" class="grid gap-1 text-caption font-normal text-destructive" role="alert" data-location-error="province">
              <span>{{ queryErrorMessage(provincesQuery.error.value) }}</span>
              <button type="button" class="justify-self-start font-semibold underline underline-offset-2" @click="provincesQuery.refetch()">
                Thử tải lại tỉnh/thành
              </button>
            </div>
            <p v-else-if="provinceOptions.length === 0" class="text-caption font-normal text-text-secondary" data-location-empty="province">
              Chưa có dữ liệu tỉnh/thành.
            </p>
            <span v-if="errors.province" id="checkout-province-error" class="text-caption font-normal text-destructive">{{ errors.province }}</span>
          </div>

          <div class="grid content-start gap-1.5 text-body-sm font-semibold text-primary-950">
            <label for="checkout-district">Quận/Huyện</label>
            <select
              id="checkout-district"
              :value="draft.ghn_district_id ?? ''"
              :disabled="draft.ghn_province_id === null || districtLoading || districtsQuery.isError.value || districtOptions.length === 0"
              required
              class="h-11 min-w-0 rounded-xl border border-input bg-white px-3 font-normal disabled:bg-muted"
              :aria-invalid="Boolean(errors.district)"
              :aria-describedby="errors.district ? 'checkout-district-error' : undefined"
              @change="handleDistrict"
            >
              <option value="">{{ districtLoading ? 'Đang tải quận/huyện...' : 'Chọn quận/huyện' }}</option>
              <option
                v-for="option in districtOptions"
                :key="option.ghn_district_id"
                :value="option.ghn_district_id"
              >
                {{ option.name }}
              </option>
            </select>
            <p v-if="districtLoading" class="text-caption font-normal text-text-secondary" role="status" data-location-loading="district">
              Đang tải quận/huyện...
            </p>
            <div v-else-if="draft.ghn_province_id !== null && districtsQuery.isError.value" class="grid gap-1 text-caption font-normal text-destructive" role="alert" data-location-error="district">
              <span>{{ queryErrorMessage(districtsQuery.error.value) }}</span>
              <button type="button" class="justify-self-start font-semibold underline underline-offset-2" @click="districtsQuery.refetch()">
                Thử tải lại quận/huyện
              </button>
            </div>
            <p v-else-if="draft.ghn_province_id !== null && districtOptions.length === 0" class="text-caption font-normal text-text-secondary" data-location-empty="district">
              Chưa có dữ liệu quận/huyện.
            </p>
            <span v-if="errors.district" id="checkout-district-error" class="text-caption font-normal text-destructive">{{ errors.district }}</span>
          </div>

          <div class="grid content-start gap-1.5 text-body-sm font-semibold text-primary-950">
            <label for="checkout-ward">Phường/Xã</label>
            <select
              id="checkout-ward"
              :value="draft.ghn_ward_code"
              :disabled="draft.ghn_district_id === null || wardLoading || wardsQuery.isError.value || wardOptions.length === 0"
              required
              class="h-11 min-w-0 rounded-xl border border-input bg-white px-3 font-normal disabled:bg-muted"
              :aria-invalid="Boolean(errors.ward)"
              :aria-describedby="errors.ward ? 'checkout-ward-error' : undefined"
              @change="handleWard"
            >
              <option value="">{{ wardLoading ? 'Đang tải phường/xã...' : 'Chọn phường/xã' }}</option>
              <option
                v-for="option in wardOptions"
                :key="option.ghn_ward_code"
                :value="option.ghn_ward_code"
              >
                {{ option.name }}
              </option>
            </select>
            <p v-if="wardLoading" class="text-caption font-normal text-text-secondary" role="status" data-location-loading="ward">
              Đang tải phường/xã...
            </p>
            <div v-else-if="draft.ghn_district_id !== null && wardsQuery.isError.value" class="grid gap-1 text-caption font-normal text-destructive" role="alert" data-location-error="ward">
              <span>{{ queryErrorMessage(wardsQuery.error.value) }}</span>
              <button type="button" class="justify-self-start font-semibold underline underline-offset-2" @click="wardsQuery.refetch()">
                Thử tải lại phường/xã
              </button>
            </div>
            <p v-else-if="draft.ghn_district_id !== null && wardOptions.length === 0" class="text-caption font-normal text-text-secondary" data-location-empty="ward">
              Chưa có dữ liệu phường/xã.
            </p>
            <span v-if="errors.ward" id="checkout-ward-error" class="text-caption font-normal text-destructive">{{ errors.ward }}</span>
          </div>
        </div>

        <label class="grid gap-1.5 text-body-sm font-semibold text-primary-950">
          Số nhà, tên đường
          <span class="relative">
            <MapPin class="pointer-events-none absolute left-3 top-3 size-4 text-primary-600" aria-hidden="true" />
            <input
              id="checkout-address-detail"
              :value="draft.detail"
              type="text"
              autocomplete="street-address"
              :disabled="!detailEnabled"
              required
              class="h-11 w-full rounded-xl border border-input pl-10 pr-3 font-normal outline-none focus:border-primary-600 focus:ring-2 focus:ring-ring/20 disabled:bg-muted"
              :aria-invalid="Boolean(errors.detail)"
              :aria-describedby="errors.detail ? 'checkout-detail-error' : undefined"
              @input="handleTextInput('detail', $event)"
            />
          </span>
          <span v-if="errors.detail" id="checkout-detail-error" class="text-caption text-destructive">{{ errors.detail }}</span>
        </label>

        <label class="inline-flex min-h-11 items-center gap-3 text-body-sm font-medium">
          <input
            type="checkbox"
            class="size-5 accent-primary"
            :checked="draft.isDefault"
            @change="updateField('isDefault', ($event.target as HTMLInputElement).checked)"
          />
          Đặt làm địa chỉ mặc định
        </label>

        <div class="flex flex-col-reverse gap-2 border-t border-primary-100 pt-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            class="motion-interactive min-h-11 rounded-xl border border-primary-200 px-5 font-semibold text-primary-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            @click="open = false"
          >
            Hủy
          </button>
          <button
            type="submit"
            class="motion-interactive min-h-11 rounded-xl bg-primary px-5 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            :disabled="props.saving"
          >
            {{ props.saving ? 'Đang lưu...' : (draft.id ? 'Lưu thay đổi' : 'Lưu địa chỉ') }}
          </button>
        </div>
      </form>
    </div>
  </BaseDialog>
</template>
