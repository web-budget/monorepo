package br.com.webbudget.server.infrastructure.repository.financial

import br.com.webbudget.server.domain.entities.financial.ReconciliationLine
import br.com.webbudget.server.domain.entities.financial.WalletEntry
import br.com.webbudget.server.domain.entities.financial.WalletReconciliation
import br.com.webbudget.server.infrastructure.repository.pagedModelOf
import br.com.webbudget.server.infrastructure.repository.toOrderBy
import br.com.webbudget.server.jooq.financial.tables.references.WALLET_ENTRIES
import br.com.webbudget.server.jooq.financial.tables.references.WALLET_RECONCILIATIONS
import org.jooq.DSLContext
import org.jooq.Record
import org.jooq.impl.DSL
import org.springframework.data.domain.Pageable
import org.springframework.data.web.PagedModel
import org.springframework.stereotype.Repository
import java.time.LocalDateTime
import java.util.UUID

@Repository
class WalletReconciliationRepository(
    private val dsl: DSLContext
) {

    private val reconciliations = WALLET_RECONCILIATIONS.`as`("wallet_reconciliations")
    private val entries = WALLET_ENTRIES.`as`("wallet_entries")

    fun insert(reconciliation: WalletReconciliation, entry: WalletEntry): ReconciliationLine {
        val record = dsl.insertInto(WALLET_RECONCILIATIONS)
            .set(WALLET_RECONCILIATIONS.EXTERNAL_ID, UUID.randomUUID())
            .set(WALLET_RECONCILIATIONS.VERSION, 0)
            .set(WALLET_RECONCILIATIONS.CREATED_ON, LocalDateTime.now())
            .set(WALLET_RECONCILIATIONS.INFORMED_BALANCE, reconciliation.informedBalance)
            .set(WALLET_RECONCILIATIONS.WALLET_BALANCE, reconciliation.walletBalance)
            .set(WALLET_RECONCILIATIONS.DIFFERENCE, reconciliation.difference)
            .set(WALLET_RECONCILIATIONS.REASON, reconciliation.reason)
            .set(WALLET_RECONCILIATIONS.ID_WALLET, reconciliation.wallet.id)
            .set(WALLET_RECONCILIATIONS.ID_WALLET_ENTRY, entry.id)
            .returning()
            .fetchSingle()

        return ReconciliationLine(
            externalId = record.externalId!!,
            createdOn = record.createdOn!!,
            informedBalance = record.informedBalance!!,
            walletBalance = record.walletBalance!!,
            difference = record.difference!!,
            reason = record.reason!!,
            entryExternalId = entry.externalId!!
        )
    }

    fun findAll(walletId: Long, pageable: Pageable): PagedModel<ReconciliationLine> {

        val condition = reconciliations.ID_WALLET.eq(walletId)

        val sortable = mapOf("createdOn" to reconciliations.CREATED_ON)

        val content = dsl.select()
            .from(reconciliations)
            .join(entries).on(entries.ID.eq(reconciliations.ID_WALLET_ENTRY))
            .where(condition)
            .orderBy(pageable.toOrderBy(sortable, reconciliations.CREATED_ON, reconciliations.ID))
            .limit(pageable.pageSize)
            .offset(pageable.offset)
            .fetch()
            .map { record -> record.toReconciliationLine() }

        val total = dsl.fetchCount(reconciliations, condition)

        return pagedModelOf(content, pageable, total.toLong())
    }

    fun findPosition(walletId: Long, externalId: UUID): Long? {

        val target = dsl.select(reconciliations.CREATED_ON, reconciliations.ID)
            .from(reconciliations)
            .where(reconciliations.ID_WALLET.eq(walletId))
            .and(reconciliations.EXTERNAL_ID.eq(externalId))
            .fetchOne() ?: return null

        val createdOn = target.get(reconciliations.CREATED_ON)!!
        val id = target.get(reconciliations.ID)!!

        return dsl.fetchCount(
            reconciliations,
            reconciliations.ID_WALLET.eq(walletId).and(
                DSL.or(
                    reconciliations.CREATED_ON.gt(createdOn),
                    reconciliations.CREATED_ON.eq(createdOn).and(reconciliations.ID.gt(id))
                )
            )
        ).toLong()
    }

    private fun Record.toReconciliationLine(): ReconciliationLine {

        val reconciliation = into(reconciliations)

        return ReconciliationLine(
            externalId = reconciliation.externalId!!,
            createdOn = reconciliation.createdOn!!,
            informedBalance = reconciliation.informedBalance!!,
            walletBalance = reconciliation.walletBalance!!,
            difference = reconciliation.difference!!,
            reason = reconciliation.reason!!,
            entryExternalId = into(entries).externalId!!
        )
    }
}
