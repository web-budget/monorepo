package br.com.webbudget.server.domain.entities.financial

import br.com.webbudget.server.domain.entities.PersistentEntity
import java.math.BigDecimal
import java.time.LocalDate
import java.time.format.TextStyle
import java.util.Locale

class Movement(
    var name: String,
    val type: Type,
    var value: BigDecimal,
    var dueDate: LocalDate,
    var classification: ClassificationReference?,
    var costCenter: CostCenterReference?,
    var financialPeriod: FinancialPeriodReference,
    var status: Status = Status.OPEN,
    var description: String? = null,
    var payment: Payment? = null,
    val invoice: Invoice? = null,
    val recurringMovement: RecurringMovementReference? = null
) : PersistentEntity() {

    fun isPaid(): Boolean = status == Status.PAID

    fun isInvoicePayment(): Boolean = invoice != null

    fun statementName(): String {
        val paidInvoice = invoice ?: return name
        val month = financialPeriod.startingAt.month.getDisplayName(TextStyle.FULL, STATEMENT_LOCALE)
        return "Fatura ${paidInvoice.card.name}, $month"
    }

    fun isOverdue(today: LocalDate): Boolean = status == Status.OPEN && dueDate.isBefore(today)

    enum class Type { INCOME, EXPENSE }

    enum class Status { OPEN, PAID }

    companion object {
        private val STATEMENT_LOCALE = Locale.forLanguageTag("pt-BR")
    }
}
