package br.com.webbudget.server.infrastructure.repository.financial

import br.com.webbudget.server.domain.entities.financial.Import
import br.com.webbudget.server.domain.entities.financial.OfxStatementType
import br.com.webbudget.server.infrastructure.repository.concurrentUpdate
import br.com.webbudget.server.infrastructure.repository.containsIgnoringAccents
import br.com.webbudget.server.infrastructure.repository.pagedModelOf
import br.com.webbudget.server.infrastructure.repository.toOrderBy
import br.com.webbudget.server.jooq.financial.tables.references.IMPORTS
import br.com.webbudget.server.jooq.financial.tables.references.IMPORT_LINES
import br.com.webbudget.server.jooq.registration.tables.references.CARDS
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
import java.time.LocalDateTime
import java.util.UUID

@Repository
class ImportRepository(
    private val dsl: DSLContext
) {

    private val imports = IMPORTS.`as`("imports")
    private val financialPeriods = FINANCIAL_PERIODS.`as`("financial_periods")
    private val cards = CARDS.`as`("cards")
    private val wallets = WALLETS.`as`("wallets")

    fun findByExternalId(externalId: UUID): Import? = selectJoined()
        .where(imports.EXTERNAL_ID.eq(externalId))
        .fetchOne()
        ?.toImport()

    fun findById(id: Long): Import? = selectJoined()
        .where(imports.ID.eq(id))
        .fetchOne()
        ?.toImport()

    fun findAll(criteria: ImportCriteria, pageable: Pageable): PagedModel<Import> {

        val condition = criteria.toCondition()

        val sortable = mapOf(
            "name" to imports.FILE_NAME,
            "createdOn" to imports.CREATED_ON
        )

        val content = selectJoined()
            .where(condition)
            .orderBy(pageable.toOrderBy(sortable, imports.CREATED_ON, imports.ID))
            .limit(pageable.pageSize)
            .offset(pageable.offset)
            .fetch()
            .map { record -> record.toImport() }

        val total = dsl.fetchCount(dsl.selectOne().from(imports).joinReferences().where(condition))

        return pagedModelOf(content, pageable, total.toLong())
    }

    fun countByStatus(criteria: ImportCriteria): Map<Import.Status, Int> = dsl
        .select(imports.STATUS, DSL.count())
        .from(imports)
        .joinReferences()
        .where(criteria.copy(statuses = null).toCondition())
        .groupBy(imports.STATUS)
        .fetch()
        .associate { record -> Import.Status.valueOf(record.value1()!!) to record.value2()!! }

    fun countLines(importIds: Collection<Long>): Map<Long, Int> = dsl
        .select(IMPORT_LINES.ID_IMPORT, DSL.count())
        .from(IMPORT_LINES)
        .where(IMPORT_LINES.ID_IMPORT.`in`(importIds))
        .groupBy(IMPORT_LINES.ID_IMPORT)
        .fetch()
        .associate { record -> record.value1()!! to record.value2()!! }

    fun existsDraft(cardId: Long?, walletId: Long?, financialPeriodId: Long): Boolean = dsl.fetchExists(
        dsl.selectOne().from(IMPORTS)
            .where(IMPORTS.ID_FINANCIAL_PERIOD.eq(financialPeriodId))
            .and(IMPORTS.STATUS.`in`(Import.Status.PROCESSING.name, Import.Status.READY.name))
            .and(cardId?.let { IMPORTS.ID_CARD.eq(it) } ?: IMPORTS.ID_WALLET.eq(walletId))
    )

    fun insert(import: Import): Import {

        val record = dsl.insertInto(IMPORTS)
            .set(IMPORTS.EXTERNAL_ID, UUID.randomUUID())
            .set(IMPORTS.VERSION, 0)
            .set(IMPORTS.CREATED_ON, LocalDateTime.now())
            .set(IMPORTS.ID_FINANCIAL_PERIOD, import.financialPeriod.id)
            .set(IMPORTS.TARGET, import.target.name)
            .set(IMPORTS.ID_CARD, import.card?.id)
            .set(IMPORTS.ID_WALLET, import.wallet?.id)
            .set(IMPORTS.FILE_NAME, import.fileName)
            .set(IMPORTS.STATUS, import.status.name)
            .returning()
            .fetchSingle()

        import.restore(record.id, record.externalId, record.version, record.createdOn, record.lastUpdate)
        return import
    }

    fun update(import: Import): Import {

        val record = dsl.update(IMPORTS)
            .set(IMPORTS.FILE_TYPE, import.fileType?.name)
            .set(IMPORTS.STARTING_ON, import.startingOn)
            .set(IMPORTS.ENDING_ON, import.endingOn)
            .set(IMPORTS.LEDGER_BALANCE, import.ledgerBalance)
            .set(IMPORTS.LEDGER_BALANCE_ON, import.ledgerBalanceOn)
            .set(IMPORTS.STATUS, import.status.name)
            .set(IMPORTS.ERROR, import.error)
            .set(IMPORTS.SAVED_ON, import.savedOn)
            .set(IMPORTS.UNDONE_ON, import.undoneOn)
            .set(IMPORTS.VERSION, IMPORTS.VERSION.plus(1))
            .set(IMPORTS.LAST_UPDATE, LocalDateTime.now())
            .where(IMPORTS.ID.eq(import.id))
            .and(IMPORTS.VERSION.eq(import.version))
            .returning()
            .fetchOne() ?: throw concurrentUpdate()

        import.restore(record.id, record.externalId, record.version, record.createdOn, record.lastUpdate)
        return import
    }

    fun touch(importId: Long) {
        dsl.update(IMPORTS)
            .set(IMPORTS.VERSION, IMPORTS.VERSION.plus(1))
            .set(IMPORTS.LAST_UPDATE, LocalDateTime.now())
            .where(IMPORTS.ID.eq(importId))
            .execute()
    }

    fun delete(import: Import) {
        dsl.deleteFrom(IMPORTS)
            .where(IMPORTS.ID.eq(import.id))
            .execute()
    }

    private fun ImportCriteria.toCondition(): Condition = DSL.and(
        listOfNotNull(
            text?.let { text ->
                DSL.or(
                    imports.FILE_NAME.containsIgnoringAccents(text),
                    cards.NAME.containsIgnoringAccents(text),
                    wallets.NAME.containsIgnoringAccents(text)
                )
            },
            statuses?.takeIf { it.isNotEmpty() }?.let { statuses -> imports.STATUS.`in`(statuses.map(Import.Status::name)) },
            target?.let { imports.TARGET.eq(it.name) },
            card?.let { cards.EXTERNAL_ID.eq(it) },
            wallet?.let { wallets.EXTERNAL_ID.eq(it) },
            financialPeriod?.let { financialPeriods.EXTERNAL_ID.eq(it) }
        )
    )

    private fun selectJoined() = dsl.select().from(imports).joinReferences()

    private fun <R : Record> SelectJoinStep<R>.joinReferences(): SelectJoinStep<R> = this
        .join(financialPeriods).on(financialPeriods.ID.eq(imports.ID_FINANCIAL_PERIOD))
        .leftJoin(cards).on(cards.ID.eq(imports.ID_CARD))
        .leftJoin(wallets).on(wallets.ID.eq(imports.ID_WALLET))

    private fun Record.toImport(): Import {

        val importRecord = into(imports)
        val cardRecord = into(cards)
        val walletRecord = into(wallets)

        return Import(
            financialPeriod = into(financialPeriods).toFinancialPeriodReference(),
            card = cardRecord.id?.let { cardRecord.toCardReference() },
            wallet = walletRecord.id?.let { walletRecord.toWalletReference() },
            fileName = importRecord.fileName!!,
            fileType = importRecord.fileType?.let { OfxStatementType.valueOf(it) },
            startingOn = importRecord.startingOn,
            endingOn = importRecord.endingOn,
            ledgerBalance = importRecord.ledgerBalance,
            ledgerBalanceOn = importRecord.ledgerBalanceOn,
            status = Import.Status.valueOf(importRecord.status!!),
            error = importRecord.error,
            savedOn = importRecord.savedOn,
            undoneOn = importRecord.undoneOn
        ).also { import ->
            import.restore(importRecord.id, importRecord.externalId, importRecord.version, importRecord.createdOn, importRecord.lastUpdate)
        }
    }
}

data class ImportCriteria(
    val text: String? = null,
    val statuses: List<Import.Status>? = null,
    val target: Import.Target? = null,
    val card: UUID? = null,
    val wallet: UUID? = null,
    val financialPeriod: UUID? = null
)
