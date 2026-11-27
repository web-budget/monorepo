package br.com.webbudget.server.domain.entities.financial

import br.com.webbudget.server.domain.entities.PersistentEntity
import java.math.BigDecimal
import java.time.LocalDateTime
import java.util.UUID

class CompartmentBalance(
    val id: UUID,
    val name: String,
    val balance: BigDecimal
)

class WalletBalances(
    val freeBalance: BigDecimal,
    val totalBalance: BigDecimal,
    val compartments: List<CompartmentBalance>
)

class WalletReconciliation(
    val wallet: WalletReference,
    val informedBalance: BigDecimal,
    val shownBalance: BigDecimal,
    val reason: String,
    val balances: WalletBalances = WalletBalances(wallet.currentBalance, wallet.currentBalance, emptyList())
) : PersistentEntity() {

    val walletBalance: BigDecimal
        get() = balances.totalBalance

    val difference: BigDecimal
        get() = informedBalance.subtract(walletBalance)

    fun withBalances(current: WalletReference, balances: WalletBalances): WalletReconciliation =
        WalletReconciliation(current, informedBalance, shownBalance, reason, balances)

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
