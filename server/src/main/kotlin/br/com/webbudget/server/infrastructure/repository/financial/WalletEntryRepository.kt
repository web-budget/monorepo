package br.com.webbudget.server.infrastructure.repository.financial

import br.com.webbudget.server.domain.entities.financial.StatementLine
import br.com.webbudget.server.domain.entities.financial.StatementSummary
import br.com.webbudget.server.domain.entities.financial.StatementTotal
import br.com.webbudget.server.domain.entities.financial.WalletEntry
import br.com.webbudget.server.infrastructure.repository.pagedModelOf
import br.com.webbudget.server.infrastructure.repository.toOrderBy
import br.com.webbudget.server.jooq.financial.tables.references.MOVEMENTS
import br.com.webbudget.server.jooq.financial.tables.references.TRANSFERS
import br.com.webbudget.server.jooq.financial.tables.references.WALLET_ENTRIES
import br.com.webbudget.server.jooq.registration.tables.references.FINANCIAL_PERIODS
import br.com.webbudget.server.jooq.registration.tables.references.WALLETS
import org.jooq.Condition
import org.jooq.DSLContext
import org.jooq.Record
import org.jooq.SelectJoinStep
import org.jooq.impl.DSL
import org.springframework.data.domain.Pageable
import org.springframework.data.web.PagedModel
import org.springframework.stereotype.Repository
import java.math.BigDecimal
import java.time.LocalDate
import java.time.LocalDateTime
import java.util.UUID

@Repository
class WalletEntryRepository(
    private val dsl: DSLContext
) {

    private val entries = WALLET_ENTRIES.`as`("wallet_entries")
    private val movements = MOVEMENTS.`as`("movements")
    private val transfers = TRANSFERS.`as`("transfers")
    private val returnTransfers = TRANSFERS.`as`("return_transfers")
    private val financialPeriods = FINANCIAL_PERIODS.`as`("financial_periods")

    fun lockWallets(sortedWalletIds: List<Long>) {
        dsl.select(WALLETS.ID)
            .from(WALLETS)
            .where(WALLETS.ID.`in`(sortedWalletIds))
            .orderBy(WALLETS.ID)
            .forUpdate()
            .fetch()
    }

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
            .set(WALLET_ENTRIES.ID_TRANSFER, entry.transferId)
            .returning()
            .fetchSingle()

        entry.restore(record.id, record.externalId, record.version, record.createdOn, record.lastUpdate)
        return entry
    }

    fun existsByWallet(walletId: Long): Boolean = dsl.fetchExists(
        dsl.selectOne().from(WALLET_ENTRIES).where(WALLET_ENTRIES.ID_WALLET.eq(walletId))
    )

    fun findAll(walletId: Long, criteria: StatementCriteria, pageable: Pageable): PagedModel<StatementLine> {

        val condition = criteria.toCondition(walletId)

        val sortable = mapOf(
            "name" to entries.NAME,
            "createdOn" to entries.CREATED_ON,
            "value" to entries.VALUE,
            "origin" to entries.ORIGIN,
            "direction" to entries.DIRECTION
        )

        val content = dsl.select().from(entries).joinReferences()
            .where(condition)
            .orderBy(pageable.toOrderBy(sortable, entries.CREATED_ON, entries.ID))
            .limit(pageable.pageSize)
            .offset(pageable.offset)
            .fetch()
            .map { record -> record.toStatementLine() }

        val total = dsl.fetchCount(dsl.selectOne().from(entries).joinReferences().where(condition))

        return pagedModelOf(content, pageable, total.toLong())
    }

    fun findByExternalId(walletId: Long, externalId: UUID): StatementLine? = dsl.select().from(entries)
        .joinReferences()
        .where(entries.ID_WALLET.eq(walletId))
        .and(entries.EXTERNAL_ID.eq(externalId))
        .fetchOne()
        ?.toStatementLine()

    fun summarize(walletId: Long, criteria: StatementCriteria): StatementSummary {

        val totals = dsl.select(entries.DIRECTION, DSL.sum(entries.VALUE), DSL.count())
            .from(entries)
            .joinReferences()
            .where(criteria.toCondition(walletId))
            .groupBy(entries.DIRECTION)
            .fetch()
            .associate { record ->
                WalletEntry.Direction.valueOf(record.value1()!!) to
                    StatementTotal(record.value2() ?: BigDecimal.ZERO, record.value3()!!)
            }

        val lastEntryOn = dsl.select(DSL.max(entries.CREATED_ON))
            .from(entries)
            .where(entries.ID_WALLET.eq(walletId))
            .fetchSingle()
            .value1()

        return StatementSummary(
            credits = totals[WalletEntry.Direction.CREDIT] ?: StatementTotal(BigDecimal.ZERO, 0),
            debits = totals[WalletEntry.Direction.DEBIT] ?: StatementTotal(BigDecimal.ZERO, 0),
            lastEntryOn = lastEntryOn
        )
    }

    private fun StatementCriteria.toCondition(walletId: Long): Condition = DSL.and(
        listOfNotNull(
            entries.ID_WALLET.eq(walletId),
            from?.let { entries.CREATED_ON.ge(it.atStartOfDay()) },
            to?.let { entries.CREATED_ON.lt(it.plusDays(1).atStartOfDay()) },
            financialPeriod?.let { financialPeriods.EXTERNAL_ID.eq(it) },
            origins?.takeIf { it.isNotEmpty() }
                ?.let { origins -> entries.ORIGIN.`in`(origins.map(WalletEntry.Origin::name)) },
            direction?.let { entries.DIRECTION.eq(it.name) },
            text?.let { entries.NAME.containsIgnoreCase(it) },
            minValue?.let { entries.VALUE.ge(it) },
            maxValue?.let { entries.VALUE.le(it) }
        )
    )

    private fun <R : Record> SelectJoinStep<R>.joinReferences(): SelectJoinStep<R> = this
        .leftJoin(movements).on(movements.ID.eq(entries.ID_MOVEMENT))
        .leftJoin(transfers).on(transfers.ID.eq(entries.ID_TRANSFER))
        .leftJoin(returnTransfers).on(returnTransfers.ID_RETURNED_TRANSFER.eq(transfers.ID))
        .leftJoin(financialPeriods).on(financialPeriods.ID.eq(entries.ID_FINANCIAL_PERIOD))

    private fun Record.toStatementLine(): StatementLine {

        val entry = into(entries)
        val period = into(financialPeriods)
        val transfer = into(transfers)
        val isReturn = transfer.idReturnedTransfer != null

        return StatementLine(
            externalId = entry.externalId!!,
            createdOn = entry.createdOn!!,
            name = entry.name!!,
            direction = WalletEntry.Direction.valueOf(entry.direction!!),
            origin = WalletEntry.Origin.valueOf(entry.origin!!),
            value = entry.value!!,
            previousBalance = entry.previousBalance!!,
            resultingBalance = entry.resultingBalance!!,
            financialPeriod = period.id?.let { period.toFinancialPeriodReference() },
            movementExternalId = into(movements).externalId,
            transferExternalId = transfer.externalId,
            transferIsReturn = isReturn,
            transferReturnable = transfer.id != null && !isReturn && into(returnTransfers).id == null
        )
    }
}

data class StatementCriteria(
    val from: LocalDate? = null,
    val to: LocalDate? = null,
    val financialPeriod: UUID? = null,
    val origins: List<WalletEntry.Origin>? = null,
    val direction: WalletEntry.Direction? = null,
    val text: String? = null,
    val minValue: BigDecimal? = null,
    val maxValue: BigDecimal? = null
)
