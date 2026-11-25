package br.com.webbudget.server.domain.entities.financial

import java.math.BigDecimal

class Accumulated(
    val recorded: BigDecimal,
    val provisionalPeriods: List<ProvisionalResult>
) {

    val provisional: BigDecimal
        get() = provisionalPeriods.fold(BigDecimal.ZERO) { total, period -> total.add(period.result) }

    val accumulated: BigDecimal
        get() = recorded.add(provisional)

    class ProvisionalResult(
        val financialPeriod: FinancialPeriodReference,
        val result: BigDecimal
    )
}
