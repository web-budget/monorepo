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
  dueDateNotices: boolean
  hasPassword: boolean
  googleLinked: boolean
  totpEnabled: boolean
  totpRequired: boolean
}

export interface PasswordChangeRequest {
  currentPassword: string
  newPassword: string
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
  lastEntryOn?: string | null
}

export interface WalletListView {
  id: string
  name: string
  type: WalletType
  currentBalance: number
  bank: string | null
  agency: string | null
  number: string | null
  active: boolean
}

export interface CardCreateForm {
  name: string
  lastFourDigits: string
  invoicePaymentDay: number
  wallet?: string | null
  flag?: string | null
}

export interface CardUpdateForm {
  name: string
  lastFourDigits: string
  invoicePaymentDay: number
  wallet?: string | null
  flag?: string | null
  active: boolean
}

export interface CardView {
  id: string
  name: string
  lastFourDigits: string
  active: boolean
  flag: string | null
  wallet: WalletListView | null
  invoicePaymentDay: number
}

export interface CardListView {
  id: string
  name: string
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
  description?: string | null
}

export interface ClassificationUpdateForm {
  name: string
  description?: string | null
  active: boolean
}

export interface ClassificationView {
  id: string
  name: string
  type: ClassificationType
  active: boolean
  description: string | null
}

export interface ClassificationListView {
  id: string
  name: string
  type: ClassificationType
  active: boolean
}

export type FinancialPeriodStatus = 'OPEN' | 'CLOSED'

export type FinancialPeriodStatusFilter = FinancialPeriodStatus | 'ALL'

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
  expired: boolean
  revenuesGoal: number | null
  expensesGoal: number | null
}

export interface FinancialPeriodListView {
  id: string
  name: string
  startingAt: string
  endingAt: string
  status: FinancialPeriodStatus
  expired: boolean
  revenuesGoal?: number | null
  expensesGoal?: number | null
}

export interface FinancialPeriodResultView {
  revenues: number
  expenses: number
  result: number
  recorded: boolean
  toPay: number
  overdueExpenses: number
}

export interface ClosingPeriodView {
  id: string
  name: string
  startingAt: string
  endingAt: string
}

export interface ClosingInvoiceView {
  id: string
  card: { id: string; name: string }
  value: number
}

export interface ClosingSummaryView {
  openMovements: { count: number; income: number; expense: number }
  openInvoices: ClosingInvoiceView[]
  emptyInvoices: ClosingInvoiceView[]
  nextOpenPeriod: ClosingPeriodView | null
  targetPeriods: ClosingPeriodView[]
  canClose: boolean
}

export interface PeriodResultView {
  id: string
  name: string
  financialPeriod: ClosingPeriodView
  revenues: number
  expenses: number
  result: number
}

export interface PeriodResultQuery {
  from?: string
  to?: string
  filter?: string
  page?: number
  size?: number
  sort?: string
}

export interface AccumulatedView {
  recorded: number
  provisional: number
  accumulated: number
  provisionalPeriods: { financialPeriod: ClosingPeriodView; result: number }[]
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

export type MovementType = 'INCOME' | 'EXPENSE'

export type MovementStatus = 'OPEN' | 'PAID'

export type MovementStatusFilter = MovementStatus | 'ALL'

export interface MovementClassificationView {
  id: string
  name: string
  type: ClassificationType
}

export interface MovementCostCenterView {
  id: string
  name: string
  fullName: string
}

export interface MovementFinancialPeriodView {
  id: string
  name: string
  status: FinancialPeriodStatus
  expired: boolean
}

export interface PaymentView {
  paidOn: string
  value: number
  discount: number
  valuePaid: number
  wallet: { id: string; name: string } | null
  card: { id: string; name: string } | null
}

export interface MovementView {
  id: string
  name: string
  type: MovementType
  value: number
  dueDate: string
  status: MovementStatus
  overdue: boolean
  classification: MovementClassificationView | null
  costCenter: MovementCostCenterView | null
  financialPeriod: MovementFinancialPeriodView
  description: string | null
  payment: PaymentView | null
  invoice?: { id: string; status: InvoiceStatus; card: { id: string; name: string } } | null
  recurringMovement?: { id: string; name: string; card: { id: string; name: string } | null } | null
}

export interface MovementListView {
  id: string
  name: string
  type: MovementType
  value: number
  dueDate: string
  status: MovementStatus
  overdue: boolean
  paymentMethod?: 'WALLET' | 'CARD'
  classification: MovementClassificationView
  costCenter: MovementCostCenterView
  financialPeriod: MovementFinancialPeriodView
}

export interface PaymentForm {
  wallet?: string | null
  card?: string | null
  paidOn?: string | null
  discount?: number | null
}

export interface MovementCreateForm {
  name: string
  type: MovementType
  value: number
  dueDate?: string | null
  financialPeriod: string
  classification: string
  costCenter: string
  description?: string | null
  payment?: PaymentForm | null
}

export interface MovementUpdateForm {
  name: string
  value: number
  dueDate?: string | null
  classification: string
  costCenter: string
  description?: string | null
}

export interface MovementQuery {
  filter?: string
  type?: MovementType
  statuses?: MovementStatus[]
  overdue?: boolean
  classification?: string
  costCenter?: string
  financialPeriods?: string[]
  invoicePayments?: boolean
  page?: number
  size?: number
  sort?: string
}

export type WalletEntryDirection = 'CREDIT' | 'DEBIT'

export type WalletEntryOrigin =
  'INCOME' | 'EXPENSE' | 'REVERSAL' | 'ADJUSTMENT' | 'TRANSFER' | 'INVOICE_PAYMENT'

export type WalletEntryDirectionFilter = WalletEntryDirection | 'ALL'

export interface WalletEntryView {
  id: string
  createdOn: string
  name: string
  direction: WalletEntryDirection
  origin: WalletEntryOrigin
  value: number
  previousBalance: number
  resultingBalance: number
  financialPeriod: { id: string; name: string } | null
  reference: { type: 'MOVEMENT' | 'TRANSFER'; id: string } | null
}

export interface StatementQuery {
  from?: string
  to?: string
  financialPeriod?: string
  origins?: WalletEntryOrigin[]
  direction?: WalletEntryDirection
  filter?: string
  minValue?: number
  maxValue?: number
  page?: number
  size?: number
  sort?: string
}

export interface AdjustmentForm {
  value: number
  name: string
}

export interface TransferForm {
  fromWallet: string
  toWallet: string
  value: number
  description: string | null
}

export interface TransferWalletView {
  id: string
  name: string
}

export interface TransferReferenceView {
  id: string
  createdOn: string
}

export interface TransferView {
  id: string
  createdOn: string
  value: number
  description: string | null
  fromWallet: TransferWalletView
  toWallet: TransferWalletView
  returnOf: TransferReferenceView | null
  returnedBy: TransferReferenceView | null
  returnable: boolean
}

export interface TransferQuery {
  wallet?: string
  from?: string
  to?: string
  filter?: string
  page?: number
  size?: number
  sort?: string
}

export type InvoiceStatus = 'OPEN' | 'CLOSED' | 'PAID'

export type InvoiceStatusFilter = InvoiceStatus | 'ALL'

export interface InvoiceView {
  id: string
  status: InvoiceStatus
  value: number
  card: { id: string; name: string }
  financialPeriod: MovementFinancialPeriodView
}

export interface InvoiceQuery {
  card?: string
  financialPeriod?: string
  statuses?: InvoiceStatus[]
  page?: number
  size?: number
  sort?: string
}

export interface CardPurchaseListView {
  id: string
  name: string
  purchasedOn: string
  value: number
  card: { id: string; name: string }
  invoice: { id: string; status: InvoiceStatus }
}

export interface CardPurchaseQuery {
  invoice?: string
  page?: number
  size?: number
  sort?: string
}

export interface CardPurchaseCreateForm {
  name: string
  purchasedOn: string | null
  value: number
  card: string
  financialPeriod: string
  classification: string
  costCenter: string
}

export interface CardPurchaseUpdateForm {
  name: string
  purchasedOn: string | null
  value: number
  classification: string
  costCenter: string
}

export interface CardPurchaseView {
  id: string
  name: string
  purchasedOn: string
  value: number
  card: { id: string; name: string }
  invoice: { id: string; status: InvoiceStatus }
  financialPeriod: MovementFinancialPeriodView
  classification: MovementClassificationView
  costCenter: MovementCostCenterView
  movement: string | null
}

export type RecurringValueKind = 'FIXED' | 'VARIABLE'

export type RecurringMovementStatusFilter = 'ACTIVE' | 'FINISHED' | 'ALL'

export interface RecurringMovementView {
  id: string
  name: string
  type: MovementType
  valueKind: RecurringValueKind
  value: number
  suggestedValue: number
  installments: number | null
  firstInstallment: number
  launchedInstallments: number | null
  nextInstallment: number | null
  finished: boolean
  autoLaunch: boolean
  active: boolean
  classification: MovementClassificationView
  costCenter: MovementCostCenterView
  card: { id: string; name: string } | null
  launchedInPeriod: string | null
  createdOn: string
}

export interface RecurringMovementCreateForm {
  name: string
  type: MovementType
  valueKind: RecurringValueKind
  value: number
  installments: number | null
  firstInstallment: number | null
  autoLaunch: boolean
  classification: string
  costCenter: string
  card: string | null
}

export interface RecurringMovementUpdateForm {
  name: string
  active: boolean
  installments: number | null
  autoLaunch: boolean
  classification: string
  costCenter: string
  card: string | null
}

export interface RecurringValueForm {
  value: number
  reason: string | null
}

export interface RecurringValueView {
  value: number
  reason: string | null
  validFrom: string
}

export interface RecurringMovementQuery {
  filter?: string
  type?: MovementType
  valueKinds?: RecurringValueKind[]
  active?: boolean
  finished?: boolean
  cards?: string[]
  financialPeriod?: string
  page?: number
  size?: number
  sort?: string
}

export interface RecurringLaunchItem {
  id: string
  value?: number
}

export type RecurringSkipReason = 'inactive' | 'finished' | 'already-launched-in-period'

export interface RecurringLaunchReport {
  launched: { recurringMovement: string; installment: number; movement: MovementListView }[]
  skipped: { recurringMovement: string; name: string; reason: RecurringSkipReason }[]
}

export interface FinancialPeriodCreation {
  id: string
  recurringLaunch: RecurringLaunchReport
}
