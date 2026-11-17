package br.com.webbudget.server.domain.entities.financial

import br.com.webbudget.server.domain.entities.PersistentEntity
import java.math.BigDecimal
import java.time.LocalDate

class PeriodMovement(
    var name: String,
    var dueDate: LocalDate,
    var value: BigDecimal,
    var classification: ClassificationReference,
    var costCenter: CostCenterReference,
    var financialPeriod: FinancialPeriodReference,
    var state: State = State.OPEN,
    var quoteNumber: Int? = null,
    var description: String? = null
) : PersistentEntity() {

    fun isAccounted(): Boolean = state == State.ACCOUNTED

    enum class State { OPEN, PAID, ACCOUNTED }
}
