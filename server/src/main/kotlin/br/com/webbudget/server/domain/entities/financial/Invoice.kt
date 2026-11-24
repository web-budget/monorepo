package br.com.webbudget.server.domain.entities.financial

import br.com.webbudget.server.domain.entities.PersistentEntity
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

class CardReference(
    val id: Long,
    val externalId: UUID,
    val name: String,
    val lastFourDigits: String,
    val active: Boolean,
    val invoicePaymentDay: Int?
)

class InvoicePayment(
    val externalId: UUID,
    val name: String,
    val value: BigDecimal,
    val dueDate: LocalDate
)

class Invoice(
    val card: CardReference,
    val financialPeriod: FinancialPeriodReference,
    var status: Status = Status.OPEN,
    var value: BigDecimal = BigDecimal.ZERO,
    val purchaseCount: Int = 0,
    val payment: InvoicePayment? = null
) : PersistentEntity() {

    fun isOpen(): Boolean = status == Status.OPEN

    fun paymentDueDate(closedOn: LocalDate): LocalDate {
        val endingAt = financialPeriod.endingAt
        val paymentDay = card.invoicePaymentDay ?: return closedOn
        val sameMonth = endingAt.withDayOfMonth(minOf(paymentDay, endingAt.lengthOfMonth()))
        if (sameMonth.isAfter(endingAt)) {
            return sameMonth
        }
        val nextMonth = endingAt.plusMonths(1)
        return nextMonth.withDayOfMonth(minOf(paymentDay, nextMonth.lengthOfMonth()))
    }

    enum class Status { OPEN, CLOSED, PAID }
}

class CardPurchase(
    var name: String,
    var purchasedOn: LocalDate,
    var value: BigDecimal,
    var classification: ClassificationReference,
    var costCenter: CostCenterReference,
    val card: CardReference,
    val financialPeriod: FinancialPeriodReference,
    var invoice: Invoice? = null,
    val movementId: Long? = null,
    val movementExternalId: UUID? = null
) : PersistentEntity()
