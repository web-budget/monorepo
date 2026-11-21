package br.com.webbudget.server.domain.entities.financial

import br.com.webbudget.server.domain.entities.PersistentEntity
import java.math.BigDecimal

class WalletEntry(
    val name: String,
    val direction: Direction,
    val origin: Origin,
    val value: BigDecimal,
    val previousBalance: BigDecimal,
    val resultingBalance: BigDecimal,
    val walletId: Long,
    val movementId: Long? = null,
    val financialPeriodId: Long? = null
) : PersistentEntity() {

    enum class Direction { CREDIT, DEBIT }

    enum class Origin { INCOME, EXPENSE, REVERSAL }
}
