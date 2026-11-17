package br.com.webbudget.server.domain.entities.registration

import br.com.webbudget.server.domain.entities.PersistentEntity
import java.math.BigDecimal
import java.time.LocalDate

class FinancialPeriod(
    var name: String,
    var startingAt: LocalDate,
    var endingAt: LocalDate,
    var status: Status = Status.ACTIVE,
    var expensesGoal: BigDecimal? = null,
    var revenuesGoal: BigDecimal? = null
) : PersistentEntity() {

    fun isOpen(): Boolean = status == Status.ACTIVE || status == Status.ENDED

    enum class Status {
        ACTIVE, ENDED, ACCOUNTED
    }
}
