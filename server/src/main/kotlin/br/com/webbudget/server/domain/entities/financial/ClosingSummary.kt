package br.com.webbudget.server.domain.entities.financial

import java.math.BigDecimal

class ClosingSummary(
    val openMovements: Map<Movement.Type, OpenTotal>,
    val openInvoices: List<Invoice>,
    val emptyInvoices: List<Invoice>,
    val nextOpenPeriod: FinancialPeriodReference?,
    val targetPeriods: List<FinancialPeriodReference>
) {

    val canClose: Boolean
        get() = openMovements.isEmpty() && openInvoices.isEmpty()

    class OpenTotal(
        val count: Int,
        val value: BigDecimal
    )
}
