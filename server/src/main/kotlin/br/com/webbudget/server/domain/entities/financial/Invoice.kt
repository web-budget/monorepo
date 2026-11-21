package br.com.webbudget.server.domain.entities.financial

import br.com.webbudget.server.domain.entities.PersistentEntity
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
    var status: Status = Status.OPEN
) : PersistentEntity() {

    enum class Status { OPEN, CLOSED, PAID }
}
