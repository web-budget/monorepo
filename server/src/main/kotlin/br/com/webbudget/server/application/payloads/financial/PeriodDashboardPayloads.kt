package br.com.webbudget.server.application.payloads.financial

import br.com.webbudget.server.domain.entities.financial.Invoice
import br.com.webbudget.server.domain.entities.financial.Movement
import com.fasterxml.jackson.annotation.JsonInclude
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

data class PeriodDashboardPeriodView(
    val id: UUID,
    val name: String,
    val startingAt: LocalDate,
    val endingAt: LocalDate,
    val status: String,
    val current: Boolean
)

data class PeriodGoalView(
    val realized: BigDecimal,
    @field:JsonInclude(JsonInclude.Include.ALWAYS)
    val goal: BigDecimal?
)

data class PeriodGoalsView(
    val revenues: PeriodGoalView,
    val expenses: PeriodGoalView
)

data class FixedVsVariableView(
    val fixed: BigDecimal,
    val variable: BigDecimal,
    @field:JsonInclude(JsonInclude.Include.ALWAYS)
    val fixedShareOfRevenueGoal: BigDecimal?
)

data class BudgetCostCenterView(
    val id: UUID,
    val name: String,
    @field:JsonInclude(JsonInclude.Include.ALWAYS)
    val parent: UUID?
)

data class BudgetFiguresView(
    @field:JsonInclude(JsonInclude.Include.ALWAYS)
    val budget: BigDecimal?,
    val used: BigDecimal,
    @field:JsonInclude(JsonInclude.Include.ALWAYS)
    val suggested: BigDecimal?
)

data class BudgetLineView(
    val costCenter: BudgetCostCenterView,
    val expense: BudgetFiguresView,
    val income: BudgetFiguresView
)

data class UpcomingPeriodView(
    val id: UUID,
    val name: String
)

data class UpcomingItemView(
    val id: UUID,
    val name: String,
    val type: Movement.Type,
    val value: BigDecimal,
    val dueDate: LocalDate,
    val financialPeriod: UpcomingPeriodView,
    val invoicePayment: Boolean,
    val overdue: Boolean
)

data class UpcomingView(
    val toReceive: BigDecimal,
    val toPay: BigDecimal,
    val items: List<UpcomingItemView>
)

data class CardHistoryView(
    val financialPeriod: UpcomingPeriodView,
    val purchases: BigDecimal
)

data class PeriodCardView(
    val id: UUID,
    val name: String,
    val lastFourDigits: String,
    @field:JsonInclude(JsonInclude.Include.ALWAYS)
    val invoiceId: UUID?,
    @field:JsonInclude(JsonInclude.Include.ALWAYS)
    val invoiceStatus: Invoice.Status?,
    val purchases: BigDecimal,
    val history: List<CardHistoryView>
)

data class PeriodDashboardView(
    val period: PeriodDashboardPeriodView,
    val goals: PeriodGoalsView,
    val fixedVsVariable: FixedVsVariableView,
    val budget: List<BudgetLineView>,
    @field:JsonInclude(JsonInclude.Include.ALWAYS)
    val upcoming: UpcomingView?,
    val cards: List<PeriodCardView>
)
