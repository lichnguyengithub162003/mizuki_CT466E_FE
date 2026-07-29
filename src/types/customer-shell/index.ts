export interface CustomerBranch {
  readonly id: string
  readonly name: string
  readonly address: string
  readonly note: string
}

export type CustomerNavigationKey =
  | 'home'
  | 'products'
  | 'skincare'
  | 'makeup'
  | 'haircare'
  | 'services'
  | 'promotions'
  | 'categories'
  | 'favorites'
  | 'cart'
  | 'account'

export const CUSTOMER_BRANCHES: readonly CustomerBranch[] = [
  {
    id: 'can-tho',
    name: 'Mizuki Cần Thơ',
    address: 'Khu vực trung tâm Cần Thơ',
    note: 'Xem tồn kho và ưu đãi demo tại chi nhánh này',
  },
  {
    id: 'ninh-kieu',
    name: 'Mizuki Ninh Kiều',
    address: 'Khu vực Ninh Kiều',
    note: 'Thông tin địa điểm dùng để trình diễn giao diện',
  },
  {
    id: 'cai-rang',
    name: 'Mizuki Cái Răng',
    address: 'Khu vực Cái Răng',
    note: 'Thông tin địa điểm dùng để trình diễn giao diện',
  },
] as const

export const DEFAULT_CUSTOMER_BRANCH = CUSTOMER_BRANCHES[0]
