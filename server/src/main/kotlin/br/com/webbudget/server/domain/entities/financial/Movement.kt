package br.com.webbudget.server.domain.entities.financial

import br.com.webbudget.server.domain.entities.PersistentEntity
import java.math.BigDecimal
import java.time.LocalDate

class Movement(
    var name: String,
    val type: Type,
    var value: BigDecimal,
    var dueDate: LocalDate,
    var classification: ClassificationReference?,
    var costCenter: CostCenterReference?,
    val financialPeriod: FinancialPeriodReference,
    var status: Status = Status.OPEN,
    var description: String? = null,
    var payment: Payment? = null,
    val invoice: Invoice? = null,
    val recurringMovement: RecurringMovementReference? = null
) : PersistentEntity() {

    fun isPaid(): Boolean = status == Status.PAID

    fun isInvoicePayment(): Boolean = invoice != null

    fun isOverdue(today: LocalDate): Boolean = status == Status.OPEN && dueDate.isBefore(today)

    enum class Type { INCOME, EXPENSE }

    enum class Status { OPEN, PAID }
}
