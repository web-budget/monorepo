export interface PageMetadata {
  size: number
  number: number
  totalElements: number
  totalPages: number
}

export interface PagedResponse<T> {
  content: T[]
  page: PageMetadata
}

export interface PageQuery {
  filter?: string
  status?: string
  page?: number
  size?: number
  sort?: string
}

export interface ProblemDetail {
  type?: string
  title?: string
  status?: number
  detail?: string
  instance?: string
  error?: string
  parameters?: Record<string, unknown>
}

export type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE'

export type Role = 'ADMINISTRATION' | 'DASHBOARDS' | 'FINANCIAL' | 'REGISTRATION'

export type UserStatus = 'PENDING' | 'APPROVED' | 'BLOCKED'

export type UserStatusFilter = UserStatus | 'ALL'

export interface LoginRequest {
  email: string
  password: string
  totpCode?: string
  trustDevice?: boolean
}

export type LoginOutcome =
  | { kind: 'authenticated'; session: SessionResponse }
  | { kind: 'needs_enrollment' }
  | { kind: 'needs_totp' }

export interface RegisterRequest {
  name: string
  email: string
  password: string
  defaultLanguage?: Language
}

export interface TotpEnrollRequest {
  email: string
  password: string
}

export interface TotpEnrollResponse {
  secretKey: string
  qrCodeDataUri: string
}

export interface TotpVerifyRequest {
  email: string
  password: string
  code: string
}

export interface GoogleLinkRequest {
  linkToken: string
  password: string
  totpCode?: string
}

export interface TrustedDeviceView {
  id: string
  label: string
  createdOn: string
  lastUsedOn: string
  expiresOn: string
}

export interface AuthConfigResponse {
  googleAuthEnabled: boolean
}

export interface SessionResponse {
  name: string
  email: string
  status: UserStatus
  language: Language
  roles: Role[]
}

export interface ActivateAccountForm {
  token: string
  email: string
}

export interface ForgotPasswordForm {
  email: string
}

export interface RecoverPasswordForm {
  token: string
  email: string
  password: string
}

export type WalletType = 'BANK_ACCOUNT' | 'PERSONAL' | 'INVESTMENT'

export interface WalletCreateForm {
  name: string
  type: WalletType
  description?: string | null
  bank?: string | null
  agency?: string | null
  number?: string | null
}

export interface WalletUpdateForm {
  name: string
  active: boolean
  description?: string | null
  bank?: string | null
  agency?: string | null
  number?: string | null
}

export interface WalletView {
  id: string
  name: string
  type: WalletType
  currentBalance: number
  active: boolean
  description: string | null
  bank: string | null
  number: string | null
  agency: string | null
}

export interface WalletListView {
  id: string
  name: string
  type: WalletType
  bank: string | null
  active: boolean
}

export type CardType = 'CREDIT' | 'DEBIT'

export interface CardCreateForm {
  name: string
  lastFourDigits: string
  invoicePaymentDay?: number | null
  type: CardType
  wallet?: string | null
  flag?: string | null
}

export interface CardUpdateForm {
  name: string
  lastFourDigits: string
  invoicePaymentDay?: number | null
  wallet?: string | null
  flag?: string | null
  active: boolean
}

export interface CardView {
  id: string
  name: string
  lastFourDigits: string
  type: CardType
  active: boolean
  flag: string | null
  wallet: WalletListView | null
  invoicePaymentDay: number | null
}

export interface CardListView {
  id: string
  name: string
  type: CardType
  active: boolean
  flag: string | null
}

export interface CostCenterCreateForm {
  name: string
  description?: string | null
  incomeBudget?: number | null
  expenseBudget?: number | null
  parentCostCenter?: string | null
}

export interface CostCenterUpdateForm {
  name: string
  active: boolean
  description?: string | null
  incomeBudget?: number | null
  expenseBudget?: number | null
  parentCostCenter?: string | null
}

export interface CostCenterListView {
  id: string
  name: string
  fullName: string
  active: boolean
  incomeBudget: number | null
  expenseBudget: number | null
}

export interface CostCenterView {
  id: string
  name: string
  active: boolean
  description: string | null
  incomeBudget: number | null
  expenseBudget: number | null
  parentCostCenter: CostCenterListView | null
}

export type ClassificationType = 'INCOME' | 'EXPENSE'

export interface ClassificationCreateForm {
  name: string
  type: ClassificationType
  budget?: number | null
  description?: string | null
}

export interface ClassificationUpdateForm {
  name: string
  budget?: number | null
  description?: string | null
  active: boolean
}

export interface ClassificationView {
  id: string
  name: string
  type: ClassificationType
  active: boolean
  budget: number | null
  description: string | null
}

export interface ClassificationListView {
  id: string
  name: string
  type: ClassificationType
  active: boolean
  budget: number | null
}

export type FinancialPeriodStatus = 'ACTIVE' | 'ENDED' | 'ACCOUNTED'

export type FinancialPeriodStatusFilter = 'OPEN' | 'ALL' | 'ACCOUNTED'

export interface FinancialPeriodCreateForm {
  name: string
  startingAt: string
  endingAt: string
  revenuesGoal?: number | null
  expensesGoal?: number | null
}

export interface FinancialPeriodUpdateForm {
  name: string
  revenuesGoal?: number | null
  expensesGoal?: number | null
}

export interface FinancialPeriodView {
  id: string
  name: string
  startingAt: string
  endingAt: string
  status: FinancialPeriodStatus
  revenuesGoal: number | null
  expensesGoal: number | null
}

export interface FinancialPeriodListView {
  id: string
  name: string
  startingAt: string
  endingAt: string
  status: FinancialPeriodStatus
}

export type Language = 'PT_BR' | 'EN_US'

export interface UserCreateForm {
  name: string
  email: string
  password: string
  defaultLanguage: Language
  roles: string[]
  sendActivationEmail: boolean
}

export interface UserUpdateForm {
  active: boolean
  name: string
  defaultLanguage: Language
  roles: string[]
}

export interface UserPasswordForm {
  temporary: boolean
  password: string
}

export interface UserView {
  id: string
  active: boolean
  name: string
  email: string
  defaultLanguage: Language
  authorities: string[]
  status: UserStatus
  totpEnabled: boolean
}
