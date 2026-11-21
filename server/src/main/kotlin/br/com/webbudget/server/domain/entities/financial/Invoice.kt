package br.com.webbudget.server.domain.entities.financial

import br.com.webbudget.server.domain.entities.PersistentEntity
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

class CardReference(
    val id: Long,
    val externalId: UUID,
    val name: String,
    val active: Boolean,
    val invoicePaymentDay: Int
)

class Invoice(
    val card: CardReference,
    val financialPeriod: FinancialPeriodReference,
    var status: Status = Status.OPEN,
    var value: BigDecimal = BigDecimal.ZERO
) : PersistentEntity() {

    fun isOpen(): Boolean = status == Status.OPEN

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
