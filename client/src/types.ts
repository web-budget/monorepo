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
  totalBalance: number
  compartmentCount: number
  active: boolean
  description: string | null
  bank: string | null
  number: string | null
  agency: string | null
  lastEntryOn?: string | null
  lastReconciliation?: LastReconciliationView | null
}

export interface LastReconciliationView {
  id: string
  createdOn: string
  difference: number
}

export interface WalletListView {
  id: string
  name: string
  type: WalletType
  currentBalance: number
  totalBalance: number
  compartmentCount: number
  bank: string | null
  agency: string | null
  number: string | null
  active: boolean
  lastEntryOn?: string | null
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
  lastFourDigits: string
  invoicePaymentDay: number
  active: boolean
  flag: string | null
  wallet: WalletListView | null
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
  generic: boolean
}

export interface ClassificationUpdateForm {
  name: string
  description?: string | null
  active: boolean
  generic: boolean
}

export interface ClassificationView {
  id: string
  name: string
  type: ClassificationType
  active: boolean
  description: string | null
  generic: boolean
}

export interface ClassificationListView {
  id: string
  name: string
  type: ClassificationType
  active: boolean
  generic: boolean
}

export interface InstanceSettingsForm {
  reserveMonths: number
}

export interface InstanceSettingsView {
  reserveMonths: number
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
  reopenable: boolean
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
  reopenable: boolean
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
  paidOnCard: number
}

export interface ClosingPeriodView {
  id: string
  name: string
  startingAt: string
  endingAt: string
}

export interface ClosingInvoiceView {
  id: string
  card: { id: string; name: string; lastFourDigits: string }
  value: number
  purchaseCount: number
  status: InvoiceStatus
}

export interface ClosingSummaryView {
  openMovements: { count: number; income: number; expense: number }
  invoices: ClosingInvoiceView[]
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
  card: { id: string; name: string; lastFourDigits?: string } | null
  invoice?: { id: string; status: InvoiceStatus } | null
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
  invoice?: {
    id: string
    status: InvoiceStatus
    card: { id: string; name: string; lastFourDigits: string }
  } | null
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
  invoicePayment?: boolean
  classification: MovementClassificationView | null
  costCenter: MovementCostCenterView | null
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
  'INCOME' | 'EXPENSE' | 'REVERSAL' | 'ADJUSTMENT' | 'TRANSFER' | 'INVOICE_PAYMENT' | 'COMPARTMENT'

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
  reference: WalletEntryReference | null
  wallet?: { id: string; name: string }
  compartment?: WalletEntryCompartment | null
  reconciliation?: ReconciliationView | null
}

export interface WalletEntryReference {
  type: 'MOVEMENT' | 'TRANSFER' | 'RECONCILIATION' | 'COMPARTMENT'
  id: string
  returnTransfer?: boolean | null
  returnable?: boolean | null
  movementId?: string | null
}

export interface StatementTotal {
  total: number
  count: number
}

export interface StatementSummary {
  credits: StatementTotal
  debits: StatementTotal
  lastEntryOn: string | null
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

export interface ReconciliationForm {
  informedBalance: number
  shownBalance: number
  reason: string
}

export interface ReconciliationView {
  id: string
  createdOn: string
  informedBalance: number
  walletBalance: number
  difference: number
  reason: string
  entryId: string
}

export interface ReconciliationPosition {
  position: number
}

export interface ReconciliationResultView {
  reconciliation: ReconciliationView
  entry: WalletEntryView
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

export interface InvoicePaymentView {
  id: string
  name: string
  value: number
}

export interface InvoiceView {
  id: string
  status: InvoiceStatus
  value: number
  purchaseCount: number
  dueDate?: string | null
  card: { id: string; name: string; lastFourDigits: string }
  financialPeriod: MovementFinancialPeriodView
  payment?: InvoicePaymentView | null
}

export interface InvoiceQuery {
  card?: string
  financialPeriod?: string
  statuses?: InvoiceStatus[]
  page?: number
  size?: number
  sort?: string
}

export interface PurchaseRecurringView {
  id: string
  name: string
  installment: number
  installments: number | null
}

export interface CardPurchaseListView {
  id: string
  name: string
  purchasedOn: string
  value: number
  card: { id: string; name: string; lastFourDigits: string }
  invoice: { id: string; status: InvoiceStatus }
  classification: MovementClassificationView
  costCenter: MovementCostCenterView
  recurringMovement?: PurchaseRecurringView | null
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
  card: { id: string; name: string; lastFourDigits: string }
  invoice: { id: string; status: InvoiceStatus }
  financialPeriod: MovementFinancialPeriodView
  classification: MovementClassificationView
  costCenter: MovementCostCenterView
  movement: string | null
  recurringMovement?: PurchaseRecurringView | null
}

export interface OverviewPeriod {
  financialPeriod: { id: string; name: string; startingAt: string; endingAt: string }
  revenues: number
  expenses: number
  result: number
  recorded: boolean
}

export interface OverviewTotals {
  revenues: number
  expenses: number
  result: number
  savingsRate: number | null
  redPeriods: number
  periodsWithMovement: number
}

export interface OverviewYearResult {
  year: number
  revenues: number
  expenses: number
  result: number
  savingsRate: number | null
  provisional: boolean
}

export interface OverviewCostOfLiving {
  value: number | null
  basedOn: number
}

export interface OverviewReserve {
  current: number
  months: number
  ideal: number | null
}

export interface OverviewAdjustments {
  count: number
  credited: number
  debited: number
}

export interface OverviewGeneric {
  value: number
  total: number
  classifications: { id: string; name: string }[]
}

export interface OverviewReliability {
  accumulated: number
  balancesTotal: number
  walletCount: number
  difference: number
  adjustmentsTotal: number
  residue: number
  adjustments: OverviewAdjustments
  generic: OverviewGeneric
}

export interface OverviewView {
  cut: string
  years: number[]
  totals: OverviewTotals
  resultByYear: OverviewYearResult[]
  periods: OverviewPeriod[]
  accumulated: number
  costOfLiving: OverviewCostOfLiving
  reserve: OverviewReserve
  reliability: OverviewReliability
}

export interface PeriodDashboardPeriod {
  id: string
  name: string
  startingAt: string
  endingAt: string
  status: FinancialPeriodStatus
  current: boolean
}

export interface PeriodGoal {
  realized: number
  goal: number | null
}

export interface PeriodDashboardGoals {
  revenues: PeriodGoal
  expenses: PeriodGoal
}

export interface PeriodFixedVsVariable {
  fixed: number
  variable: number
  fixedShareOfRevenueGoal: number | null
}

export interface PeriodBudgetFigures {
  budget: number | null
  used: number
  suggested: number | null
}

export interface PeriodBudgetLine {
  costCenter: { id: string; name: string; parent: string | null }
  expense: PeriodBudgetFigures
  income: PeriodBudgetFigures
}

export interface PeriodUpcomingItem {
  id: string
  name: string
  type: MovementType
  value: number
  dueDate: string
  financialPeriod: { id: string; name: string }
  invoicePayment: boolean
  overdue: boolean
}

export interface PeriodUpcoming {
  toReceive: number
  toPay: number
  items: PeriodUpcomingItem[]
}

export interface PeriodCardHistory {
  financialPeriod: { id: string; name: string }
  purchases: number
}

export interface PeriodCard {
  id: string
  name: string
  lastFourDigits: string
  invoiceId: string | null
  invoiceStatus: InvoiceStatus | null
  purchases: number
  history: PeriodCardHistory[]
}

export interface PeriodDashboardView {
  period: PeriodDashboardPeriod
  goals: PeriodDashboardGoals
  fixedVsVariable: PeriodFixedVsVariable
  budget: PeriodBudgetLine[]
  upcoming: PeriodUpcoming | null
  cards: PeriodCard[]
}

export interface CompositionCostCenter {
  id: string
  name: string
  parent: string | null
  value: number
}

export interface CompositionClassification {
  id: string
  name: string
  costCenter: string
  value: number
}

export interface CompositionSeasonality {
  id: string
  name: string
  months: (number | null)[]
}

export interface CompositionIncomeSource {
  id: string
  name: string
  value: number
}

export interface CompositionView {
  cut: string
  years: number[]
  expenses: number
  revenues: number
  costCenters: CompositionCostCenter[]
  classifications: CompositionClassification[]
  seasonality: CompositionSeasonality[]
  incomeSources: CompositionIncomeSource[]
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
  installments?: number | null
  firstInstallment: number
  launchedInstallments?: number | null
  nextInstallment?: number | null
  finished: boolean
  ended: boolean
  autoLaunch: boolean
  active: boolean
  classification: MovementClassificationView
  costCenter: MovementCostCenterView
  card?: { id: string; name: string; lastFourDigits: string } | null
  launchedInPeriod?: string | null
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

export interface RecurringValuePeriodView {
  id: string
  name: string
  startingAt: string
}

export interface RecurringValueView {
  value: number
  reason?: string | null
  validFrom: string
  validFromPeriod?: RecurringValuePeriodView | null
  current: boolean
}

export interface RecurringLaunchEntryView {
  financialPeriod: RecurringValuePeriodView
  installment: number
  movement: string
  value: number
  status: string
  valuePaid?: number | null
}

export interface CreationPreviewRecurringView {
  id: string
  name: string
  type: MovementType
  value: number
  installment?: number | null
  installments?: number | null
}

export interface FinancialPeriodCreationPreview {
  recurringMovements: CreationPreviewRecurringView[]
  invoices: { id: string; name: string; lastFourDigits: string }[]
}

export interface RecurringMovementQuery {
  filter?: string
  type?: MovementType
  valueKinds?: RecurringValueKind[]
  ended?: boolean
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

export interface RecurringExtraLaunchForm {
  financialPeriod: string
  quantity: number
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

export interface WalletEntryCompartment {
  id: string
  name: string
  movementId: string
  direction: CompartmentMovementDirection
  note?: string | null
}

export type CompartmentType = 'RESERVE' | 'INVESTMENT' | 'GOAL'

export interface CompartmentCreateForm {
  name: string
  type: CompartmentType
  description?: string | null
  targetValue?: number | null
  targetDate?: string | null
}

export interface CompartmentUpdateForm {
  name: string
  description?: string | null
  targetValue?: number | null
  targetDate?: string | null
}

export interface CompartmentView {
  id: string
  name: string
  type: CompartmentType
  balance: number
  statementEntryCount: number
  achieved: boolean
  overdue: boolean
  description?: string | null
  targetValue?: number | null
  targetDate?: string | null
  progress?: number | null
  monthlyAmount?: number | null
}

export type CompartmentMovementDirection = 'DEPOSIT' | 'WITHDRAWAL'

export interface CompartmentMovementForm {
  direction: CompartmentMovementDirection
  value: number
  note?: string | null
}

export interface CompartmentMovementView {
  id: string
  createdOn: string
  direction: CompartmentMovementDirection
  value: number
  previousBalance: number
  resultingBalance: number
  note?: string | null
  entryId?: string | null
}

export interface CompartmentMovementResult {
  movement: CompartmentMovementView
  walletBalance: number
  compartmentBalance: number
  entry: WalletEntryView
}

export interface CompartmentMovementPosition {
  position: number
}
export type ImportStatus = 'PROCESSING' | 'READY' | 'FAILED' | 'SAVED' | 'UNDONE'

export type ImportStatusFilter = ImportStatus | 'ALL'

export type ImportTarget = 'CARD' | 'WALLET'

export type ImportAction =
  | 'CREATE'
  | 'LINK'
  | 'LAUNCH_RECURRING'
  | 'CREATE_RECURRING'
  | 'INVOICE_PAYMENT'
  | 'TRANSFER'
  | 'IGNORE'

export interface ImportCardView {
  id: string
  name: string
  lastFourDigits: string
}

export interface ImportWalletView {
  id: string
  name: string
}

export interface ImportListView {
  id: string
  fileName: string
  target: ImportTarget
  card?: ImportCardView
  wallet?: ImportWalletView
  financialPeriod: MovementFinancialPeriodView
  status: ImportStatus
  error?: string
  lines: number
  pending: number
  createdOn: string
  savedOn?: string
  undoneOn?: string
}

export interface ImportCounts {
  processing: number
  ready: number
  failed: number
  saved: number
  undone: number
  total: number
}

export interface ImportCreated {
  id: string
}

export interface ImportQuery {
  filter?: string
  statuses?: ImportStatus[]
  target?: ImportTarget
  card?: string
  wallet?: string
  financialPeriod?: string
  page?: number
  size?: number
  sort?: string
}

export interface ImportView {
  id: string
  fileName: string
  target: ImportTarget
  card?: ImportCardView
  wallet?: ImportWalletView
  financialPeriod: MovementFinancialPeriodView
  status: ImportStatus
  error?: string
  fileType?: string
  startingOn?: string
  endingOn?: string
  ledgerBalance?: number
  ledgerBalanceOn?: string
  createdOn: string
  lastUpdate?: string
  savedOn?: string
  undoneOn?: string
  totals: ImportLineTotals
  result: ImportResult
  warnings: ImportWarnings
  undoBlockers: ImportBlocker[]
}

export type ImportCandidateKind = 'MOVEMENT' | 'PURCHASE' | 'TRANSFER' | 'RECURRING'

export type ImportLineStatusFilter = 'PENDING' | 'IGNORED' | 'ALL'

export type ImportIgnoreReasonCode =
  'payment-received' | 'iof-pair' | 'credit' | 'already-imported' | 'already-registered'

export interface ImportCandidateView {
  kind: ImportCandidateKind
  id: string
  name: string
  value: number
  date?: string
  financialPeriod?: MovementFinancialPeriodView
  costCenter?: MovementCostCenterView
  classification?: MovementClassificationView
  recurring: boolean
  installment?: number
  installments?: number
}

export interface ImportLineView {
  id: string
  position: number
  postedOn: string
  value: number
  description: string
  name: string
  installment?: number
  installments?: number
  kind: string
  action: ImportAction
  allowedActions: ImportAction[]
  alreadyImported: boolean
  alreadyRegistered: boolean
  fromMemory: boolean
  differentValue: boolean
  costCenter?: MovementCostCenterView
  classification?: MovementClassificationView
  wallet?: ImportWalletView
  link?: ImportCandidateView
  created: ImportCandidateView[]
  ignoreReason?: { code: ImportIgnoreReasonCode; date?: string }
  pending: string[]
}

export interface ImportLineQuery {
  filter?: string
  pending?: boolean
  actions?: ImportAction[]
  page?: number
  size?: number
  sort?: string
}

export interface ImportLineUpdateForm {
  name?: string
  action?: ImportAction
  costCenter?: string
  classification?: string
  wallet?: string
  link?: { kind: ImportCandidateKind; id: string }
  installment?: number
  installments?: number
}

export interface ImportLinesBatchForm {
  lines: string[]
  action?: ImportAction
  costCenter?: string
  classification?: string
}

export interface ImportLineTotals {
  lines: number
  pending: number
  ignored: number
  byAction: Partial<Record<ImportAction, number>>
}

export interface ImportResult {
  created: number
  linked: number
  recurring: number
  transfers: number
  ignored: number
}

export interface ImportWarnings {
  unlinkedRecurring: ImportCandidateView[]
  fileTotal?: number
  afterSave: number
  ledgerBalance?: number
  currentBalance?: number
  ignoredCredits: number
}

export interface ImportBlocker {
  reason: string
  position?: number
  name?: string
}

export type ImportResultFilter =
  'CREATED' | 'LINKED' | 'RECURRING' | 'TRANSFERS' | 'IGNORED' | 'ALL'
