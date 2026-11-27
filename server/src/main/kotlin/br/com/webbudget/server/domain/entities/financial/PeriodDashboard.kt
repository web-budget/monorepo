package br.com.webbudget.server.domain.entities.financial

import java.math.BigDecimal
import java.math.RoundingMode
import java.time.LocalDate
import java.util.UUID

class PeriodDashboard(
    val period: Period,
    val current: Boolean,
    val goals: Goals,
    val fixedVsVariable: FixedVsVariable,
    val budget: List<BudgetLine>,
    val upcoming: Upcoming?,
    val cards: List<CardUsage>
) {

    class Period(
        val financialPeriod: FinancialPeriodReference,
        val revenuesGoal: BigDecimal?,
        val expensesGoal: BigDecimal?
    )

    class Goals(
        val revenues: Goal,
        val expenses: Goal
    )

    class Goal(
        val realized: BigDecimal,
        val goal: BigDecimal?
    )

    class FixedVsVariable(
        val fixed: BigDecimal,
        val variable: BigDecimal,
        revenuesGoal: BigDecimal?
    ) {

        val fixedShareOfRevenueGoal: BigDecimal? = revenuesGoal
            ?.takeIf { it.signum() > 0 }
            ?.let { fixed.divide(it, SHARE_SCALE, RoundingMode.HALF_UP) }
    }

    class CostCenterNode(
        val id: Long,
        val externalId: UUID,
        val name: String,
        val parentId: Long?,
        val parentExternalId: UUID?,
        val expenseBudget: BigDecimal?,
        val incomeBudget: BigDecimal?
    )

    class BudgetLine(
        val costCenter: CostCenterNode,
        val expense: BudgetFigures,
        val income: BudgetFigures
    )

    class BudgetFigures(
        val budget: BigDecimal?,
        val used: BigDecimal,
        val suggested: BigDecimal?
    )

    class Upcoming(
        val items: List<UpcomingItem>
    ) {

        val toReceive: BigDecimal
            get() = total(Movement.Type.INCOME)

        val toPay: BigDecimal
            get() = total(Movement.Type.EXPENSE)

        private fun total(type: Movement.Type): BigDecimal = items
            .filter { it.type == type }
            .fold(BigDecimal.ZERO) { total, item -> total.add(item.value) }
    }

    class UpcomingItem(
        val id: UUID,
        val name: String,
        val type: Movement.Type,
        val value: BigDecimal,
        val dueDate: LocalDate,
        val financialPeriodId: UUID,
        val financialPeriodName: String,
        val invoicePayment: Boolean,
        val overdue: Boolean
    )

    class CardUsage(
        val id: UUID,
        val name: String,
        val lastFourDigits: String,
        val invoiceId: UUID?,
        val invoiceStatus: Invoice.Status?,
        val purchases: BigDecimal,
        val history: List<CardPeriodPurchases>
    )

    class CardPeriodPurchases(
        val financialPeriodId: UUID,
        val financialPeriodName: String,
        val purchases: BigDecimal
    )

    companion object {
        private const val SHARE_SCALE = 4
    }
}
