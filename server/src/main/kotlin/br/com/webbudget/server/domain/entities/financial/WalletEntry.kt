package br.com.webbudget.server.domain.entities.financial

import br.com.webbudget.server.domain.entities.PersistentEntity
import java.math.BigDecimal
import java.time.LocalDateTime
import java.util.UUID

class WalletEntry(
    val name: String,
    val direction: Direction,
    val origin: Origin,
    val value: BigDecimal,
    val previousBalance: BigDecimal,
    val resultingBalance: BigDecimal,
    val walletId: Long,
    val movementId: Long? = null,
    val financialPeriodId: Long? = null,
    val transferId: Long? = null
) : PersistentEntity() {

    enum class Direction { CREDIT, DEBIT }

    enum class Origin { INCOME, EXPENSE, REVERSAL, ADJUSTMENT, TRANSFER, INVOICE_PAYMENT }
}

class StatementLine(
    val externalId: UUID,
    val createdOn: LocalDateTime,
    val name: String,
    val direction: WalletEntry.Direction,
    val origin: WalletEntry.Origin,
    val value: BigDecimal,
    val previousBalance: BigDecimal,
    val resultingBalance: BigDecimal,
    val financialPeriod: FinancialPeriodReference?,
    val movementExternalId: UUID?,
    val transferExternalId: UUID?
)
