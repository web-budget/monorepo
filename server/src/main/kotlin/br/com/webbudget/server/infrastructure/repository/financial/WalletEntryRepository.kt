package br.com.webbudget.server.infrastructure.repository.financial

import br.com.webbudget.server.domain.entities.financial.WalletEntry
import br.com.webbudget.server.jooq.financial.tables.references.WALLET_ENTRIES
import br.com.webbudget.server.jooq.registration.tables.references.WALLETS
import org.jooq.DSLContext
import org.springframework.stereotype.Repository
import java.math.BigDecimal
import java.time.LocalDateTime
import java.util.UUID

@Repository
class WalletEntryRepository(
    private val dsl: DSLContext
) {

    fun applyBalanceDelta(walletId: Long, delta: BigDecimal): BigDecimal = dsl.update(WALLETS)
        .set(WALLETS.CURRENT_BALANCE, WALLETS.CURRENT_BALANCE.plus(delta))
        .where(WALLETS.ID.eq(walletId))
        .returning(WALLETS.CURRENT_BALANCE)
        .fetchSingle()
        .currentBalance!!

    fun insert(entry: WalletEntry): WalletEntry {
        val record = dsl.insertInto(WALLET_ENTRIES)
            .set(WALLET_ENTRIES.EXTERNAL_ID, UUID.randomUUID())
            .set(WALLET_ENTRIES.VERSION, 0)
            .set(WALLET_ENTRIES.CREATED_ON, LocalDateTime.now())
            .set(WALLET_ENTRIES.NAME, entry.name)
            .set(WALLET_ENTRIES.DIRECTION, entry.direction.name)
            .set(WALLET_ENTRIES.ORIGIN, entry.origin.name)
            .set(WALLET_ENTRIES.VALUE, entry.value)
            .set(WALLET_ENTRIES.PREVIOUS_BALANCE, entry.previousBalance)
            .set(WALLET_ENTRIES.RESULTING_BALANCE, entry.resultingBalance)
            .set(WALLET_ENTRIES.ID_WALLET, entry.walletId)
            .set(WALLET_ENTRIES.ID_MOVEMENT, entry.movementId)
            .set(WALLET_ENTRIES.ID_FINANCIAL_PERIOD, entry.financialPeriodId)
            .returning()
            .fetchSingle()

        entry.restore(record.id, record.externalId, record.version, record.createdOn, record.lastUpdate)
        return entry
    }

    fun existsByWallet(walletId: Long): Boolean = dsl.fetchExists(
        dsl.selectOne().from(WALLET_ENTRIES).where(WALLET_ENTRIES.ID_WALLET.eq(walletId))
    )
}
