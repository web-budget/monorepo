package br.com.webbudget.server.domain.entities.financial

import br.com.webbudget.server.domain.entities.PersistentEntity
import java.math.BigDecimal

class PeriodResult(
    val financialPeriod: FinancialPeriodReference,
    val revenues: BigDecimal,
    val expenses: BigDecimal
) : PersistentEntity() {

    val result: BigDecimal
        get() = revenues.subtract(expenses)
}
