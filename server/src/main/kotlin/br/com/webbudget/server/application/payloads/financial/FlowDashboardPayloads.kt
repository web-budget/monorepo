package br.com.webbudget.server.application.payloads.financial

import java.math.BigDecimal

data class FlowPeriodView(
    val financialPeriod: ClosingPeriodView,
    val revenues: BigDecimal,
    val expenses: BigDecimal,
    val result: BigDecimal,
    val recorded: Boolean
)

data class FlowTotalsView(
    val revenues: BigDecimal,
    val expenses: BigDecimal,
    val result: BigDecimal
)

data class FlowDashboardView(
    val year: Int,
    val totals: FlowTotalsView,
    val periods: List<FlowPeriodView>
)
