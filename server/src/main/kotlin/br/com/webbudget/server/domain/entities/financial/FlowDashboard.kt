package br.com.webbudget.server.domain.entities.financial

import java.math.BigDecimal

class FlowDashboard(
    val year: Int,
    val periods: List<FlowPeriod>
) {

    val revenues: BigDecimal
        get() = periods.fold(BigDecimal.ZERO) { total, period -> total.add(period.revenues) }

    val expenses: BigDecimal
        get() = periods.fold(BigDecimal.ZERO) { total, period -> total.add(period.expenses) }

    val result: BigDecimal
        get() = revenues.subtract(expenses)

    class FlowPeriod(
        val financialPeriod: FinancialPeriodReference,
        val revenues: BigDecimal,
        val expenses: BigDecimal,
        val recorded: Boolean
    ) {

        val result: BigDecimal
            get() = revenues.subtract(expenses)
    }
}
