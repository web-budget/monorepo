package br.com.webbudget.server.domain.entities.financial

import br.com.webbudget.server.domain.entities.PersistentEntity
import java.math.BigDecimal
import java.time.LocalDateTime
import java.util.UUID

class WalletReconciliation(
    val wallet: WalletReference,
    val informedBalance: BigDecimal,
    val shownBalance: BigDecimal,
    val reason: String
) : PersistentEntity() {

    val walletBalance: BigDecimal
        get() = wallet.currentBalance

    val difference: BigDecimal
        get() = informedBalance.subtract(walletBalance)

    fun withWallet(current: WalletReference): WalletReconciliation =
        WalletReconciliation(current, informedBalance, shownBalance, reason)

    companion object {

        const val MAX_REASON_LENGTH = 150
    }
}

class ReconciliationLine(
    val externalId: UUID,
    val createdOn: LocalDateTime,
    val informedBalance: BigDecimal,
    val walletBalance: BigDecimal,
    val difference: BigDecimal,
    val reason: String,
    val entryExternalId: UUID
)

class ReconciliationResult(
    val reconciliation: ReconciliationLine,
    val entry: WalletEntry
)
