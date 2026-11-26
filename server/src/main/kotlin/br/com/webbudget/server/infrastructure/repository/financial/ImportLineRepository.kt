package br.com.webbudget.server.infrastructure.repository.financial

import br.com.webbudget.server.domain.entities.financial.Import
import br.com.webbudget.server.domain.entities.financial.ImportAction
import br.com.webbudget.server.domain.entities.financial.ImportCandidate
import br.com.webbudget.server.domain.entities.financial.ImportCandidateKind
import br.com.webbudget.server.domain.entities.financial.ImportLine
import br.com.webbudget.server.domain.entities.financial.ImportedLine
import br.com.webbudget.server.domain.entities.financial.ImportTotals
import br.com.webbudget.server.domain.entities.financial.OfxTransactionKind
import br.com.webbudget.server.infrastructure.repository.concurrentUpdate
import br.com.webbudget.server.infrastructure.repository.containsIgnoringAccents
import br.com.webbudget.server.infrastructure.repository.pagedModelOf
import br.com.webbudget.server.infrastructure.repository.toOrderBy
import br.com.webbudget.server.jooq.financial.tables.records.ImportLinesRecord
import br.com.webbudget.server.jooq.financial.tables.references.IMPORTS
import br.com.webbudget.server.jooq.financial.tables.references.IMPORT_LINES
import br.com.webbudget.server.jooq.registration.tables.references.CLASSIFICATIONS
import br.com.webbudget.server.jooq.registration.tables.references.COST_CENTERS
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
class ImportLineRepository(
    private val dsl: DSLContext,
    private val importCandidateRepository: ImportCandidateRepository
) {

    private val lines = IMPORT_LINES.`as`("import_lines")
    private val costCenters = COST_CENTERS.`as`("cost_centers")
    private val classifications = CLASSIFICATIONS.`as`("classifications")
    private val targetWallets = WALLETS.`as`("target_wallets")

    fun findByExternalId(import: Import, externalId: UUID): ImportLine? = hydrate(
        import,
        selectJoined()
            .where(lines.ID_IMPORT.eq(import.id))
            .and(lines.EXTERNAL_ID.eq(externalId))
            .fetch()
    ).firstOrNull()

    fun findAll(import: Import): List<ImportLine> = hydrate(
        import,
        selectJoined()
            .where(lines.ID_IMPORT.eq(import.id))
            .orderBy(lines.POSTED_ON, lines.POSITION)
            .fetch()
    )

    fun findAll(import: Import, criteria: ImportLineCriteria, pageable: Pageable): PagedModel<ImportLine> {

        val condition = DSL.and(lines.ID_IMPORT.eq(import.id), criteria.toCondition())

        val sortable = mapOf(
            "name" to lines.NAME,
            "postedOn" to lines.POSTED_ON,
            "value" to lines.VALUE,
            "action" to lines.ACTION,
            "position" to lines.POSITION
        )

        val records = selectJoined()
            .where(condition)
            .orderBy(pageable.toOrderBy(sortable, lines.CREATED_ON, lines.ID, listOf(lines.POSTED_ON.asc(), lines.POSITION.asc())))
            .limit(pageable.pageSize)
            .offset(pageable.offset)
            .fetch()

        val total = dsl.fetchCount(dsl.selectOne().from(lines).joinReferences().where(condition))

        return pagedModelOf(hydrate(import, records), pageable, total.toLong())
    }

    fun totals(importId: Long): ImportTotals {

        val pending = pendingCondition()

        val rows = dsl.select(lines.ACTION, DSL.count(), DSL.count().filterWhere(pending))
            .from(lines)
            .where(lines.ID_IMPORT.eq(importId))
            .groupBy(lines.ACTION)
            .fetch()

        val byAction = rows.associate { row -> ImportAction.valueOf(row.value1()!!) to row.value2()!! }

        return ImportTotals(
            lines = byAction.values.sum(),
            pending = rows.sumOf { row -> row.value3()!! },
            ignored = byAction[ImportAction.IGNORE] ?: 0,
            byAction = byAction
        )
    }

    fun findImportedBefore(import: Import): List<ImportedLine> = dsl
        .select(lines.FIT_ID, lines.VALUE, lines.DESCRIPTION, lines.POSTED_ON, lines.NAME)
        .from(lines)
        .join(IMPORTS).on(IMPORTS.ID.eq(lines.ID_IMPORT))
        .where(IMPORTS.STATUS.eq(Import.Status.SAVED.name))
        .and(import.card?.let { IMPORTS.ID_CARD.eq(it.id) } ?: IMPORTS.ID_WALLET.eq(import.wallet!!.id))
        .fetch { record ->
            ImportedLine(record.value1()!!, record.value2()!!, record.value3()!!, record.value4()!!, record.value5()!!)
        }

    fun insert(line: ImportLine): ImportLine {

        val record = dsl.insertInto(IMPORT_LINES)
            .set(IMPORT_LINES.EXTERNAL_ID, UUID.randomUUID())
            .set(IMPORT_LINES.VERSION, 0)
            .set(IMPORT_LINES.CREATED_ON, LocalDateTime.now())
            .set(IMPORT_LINES.ID_IMPORT, line.import.id)
            .set(IMPORT_LINES.POSITION, line.position)
            .set(IMPORT_LINES.POSTED_ON, line.postedOn)
            .set(IMPORT_LINES.VALUE, line.value)
            .set(IMPORT_LINES.FIT_ID, line.fitId)
            .set(IMPORT_LINES.DESCRIPTION, line.description)
            .set(IMPORT_LINES.KIND, line.kind.name)
            .set(IMPORT_LINES.NAME, line.name)
            .set(IMPORT_LINES.INSTALLMENT, line.installment)
            .set(IMPORT_LINES.INSTALLMENTS, line.installments)
            .set(IMPORT_LINES.ACTION, line.action.name)
            .set(IMPORT_LINES.ALREADY_IMPORTED, line.alreadyImported)
            .set(IMPORT_LINES.ALREADY_REGISTERED, line.alreadyRegistered)
            .set(IMPORT_LINES.FROM_MEMORY, line.fromMemory)
            .set(IMPORT_LINES.DIFFERENT_VALUE, line.differentValue)
            .set(IMPORT_LINES.ID_COST_CENTER, line.costCenter?.id)
            .set(IMPORT_LINES.ID_CLASSIFICATION, line.classification?.id)
            .set(IMPORT_LINES.ID_TARGET_WALLET, line.targetWallet?.id)
            .set(IMPORT_LINES.ID_TARGET_MOVEMENT, line.link.idOf(ImportCandidateKind.MOVEMENT))
            .set(IMPORT_LINES.ID_TARGET_PURCHASE, line.link.idOf(ImportCandidateKind.PURCHASE))
            .set(IMPORT_LINES.ID_TARGET_TRANSFER, line.link.idOf(ImportCandidateKind.TRANSFER))
            .set(IMPORT_LINES.ID_TARGET_RECURRING, line.link.idOf(ImportCandidateKind.RECURRING))
            .returning()
            .fetchSingle()

        line.restore(record.id, record.externalId, record.version, record.createdOn, record.lastUpdate)
        return line
    }

    fun update(line: ImportLine): ImportLine {

        val record = dsl.update(IMPORT_LINES)
            .set(IMPORT_LINES.NAME, line.name)
            .set(IMPORT_LINES.INSTALLMENT, line.installment)
            .set(IMPORT_LINES.INSTALLMENTS, line.installments)
            .set(IMPORT_LINES.ACTION, line.action.name)
            .set(IMPORT_LINES.DIFFERENT_VALUE, line.differentValue)
            .set(IMPORT_LINES.ID_COST_CENTER, line.costCenter?.id)
            .set(IMPORT_LINES.ID_CLASSIFICATION, line.classification?.id)
            .set(IMPORT_LINES.ID_TARGET_WALLET, line.targetWallet?.id)
            .set(IMPORT_LINES.ID_TARGET_MOVEMENT, line.link.idOf(ImportCandidateKind.MOVEMENT))
            .set(IMPORT_LINES.ID_TARGET_PURCHASE, line.link.idOf(ImportCandidateKind.PURCHASE))
            .set(IMPORT_LINES.ID_TARGET_TRANSFER, line.link.idOf(ImportCandidateKind.TRANSFER))
            .set(IMPORT_LINES.ID_TARGET_RECURRING, line.link.idOf(ImportCandidateKind.RECURRING))
            .set(IMPORT_LINES.VERSION, IMPORT_LINES.VERSION.plus(1))
            .set(IMPORT_LINES.LAST_UPDATE, LocalDateTime.now())
            .where(IMPORT_LINES.ID.eq(line.id))
            .and(IMPORT_LINES.VERSION.eq(line.version))
            .returning()
            .fetchOne() ?: throw concurrentUpdate()

        line.restore(record.id, record.externalId, record.version, record.createdOn, record.lastUpdate)
        return line
    }

    private fun ImportLineCriteria.toCondition(): Condition = DSL.and(
        listOfNotNull(
            text?.let { text -> lines.NAME.containsIgnoringAccents(text).or(lines.DESCRIPTION.containsIgnoringAccents(text)) },
            pending?.let { requested -> if (requested) pendingCondition() else DSL.not(pendingCondition()) },
            actions?.takeIf { it.isNotEmpty() }?.let { actions -> lines.ACTION.`in`(actions.map(ImportAction::name)) }
        )
    )

    private fun pendingCondition(): Condition {

        val missingCenters = lines.ID_COST_CENTER.isNull.or(lines.ID_CLASSIFICATION.isNull)

        val missingTarget = lines.ID_TARGET_MOVEMENT.isNull
            .and(lines.ID_TARGET_PURCHASE.isNull)
            .and(lines.ID_TARGET_TRANSFER.isNull)
            .and(lines.ID_TARGET_RECURRING.isNull)

        return DSL.or(
            lines.ACTION.eq(ImportAction.CREATE.name).and(missingCenters),
            lines.ACTION.eq(ImportAction.CREATE_RECURRING.name).and(missingCenters.or(lines.INSTALLMENTS.isNull)),
            lines.ACTION.`in`(
                ImportAction.LINK.name,
                ImportAction.INVOICE_PAYMENT.name,
                ImportAction.LAUNCH_RECURRING.name
            ).and(missingTarget),
            lines.ACTION.eq(ImportAction.TRANSFER.name).and(lines.ID_TARGET_WALLET.isNull)
        )
    }

    private fun selectJoined() = dsl.select().from(lines).joinReferences()

    private fun <R : Record> SelectJoinStep<R>.joinReferences(): SelectJoinStep<R> = this
        .leftJoin(costCenters).on(costCenters.ID.eq(lines.ID_COST_CENTER))
        .leftJoin(classifications).on(classifications.ID.eq(lines.ID_CLASSIFICATION))
        .leftJoin(targetWallets).on(targetWallets.ID.eq(lines.ID_TARGET_WALLET))

    private fun hydrate(import: Import, records: List<Record>): List<ImportLine> {

        val lineRecords = records.map { it.into(lines) }

        val candidates = loadCandidates(lineRecords)

        return records.mapIndexed { index, record ->

            val lineRecord = lineRecords[index]
            val costCenterRecord = record.into(costCenters)
            val classificationRecord = record.into(classifications)
            val walletRecord = record.into(targetWallets)

            ImportLine(
                import = import,
                position = lineRecord.position!!,
                postedOn = lineRecord.postedOn!!,
                value = lineRecord.value!!,
                fitId = lineRecord.fitId!!,
                description = lineRecord.description!!,
                name = lineRecord.name!!,
                installment = lineRecord.installment,
                installments = lineRecord.installments,
                kind = OfxTransactionKind.valueOf(lineRecord.kind!!),
                action = ImportAction.valueOf(lineRecord.action!!),
                alreadyImported = lineRecord.alreadyImported!!,
                alreadyRegistered = lineRecord.alreadyRegistered!!,
                fromMemory = lineRecord.fromMemory!!,
                differentValue = lineRecord.differentValue!!,
                costCenter = costCenterRecord.id?.let { costCenterRecord.toCostCenterReference() },
                classification = classificationRecord.id?.let { classificationRecord.toClassificationReference() },
                targetWallet = walletRecord.id?.let { walletRecord.toWalletReference() },
                link = lineRecord.targetKey()?.let { candidates[it] },
                createdMovementId = lineRecord.idCreatedMovement,
                createdPurchaseId = lineRecord.idCreatedPurchase,
                createdTransferId = lineRecord.idCreatedTransfer,
                createdRecurringId = lineRecord.idCreatedRecurring,
                previousValue = lineRecord.previousValue
            ).also { line ->
                line.restore(lineRecord.id, lineRecord.externalId, lineRecord.version, lineRecord.createdOn, lineRecord.lastUpdate)
            }
        }
    }

    private fun loadCandidates(records: List<ImportLinesRecord>): Map<Pair<ImportCandidateKind, Long>, ImportCandidate> {

        val movementIds = records.mapNotNull { it.idTargetMovement }
        val purchaseIds = records.mapNotNull { it.idTargetPurchase }
        val transferIds = records.mapNotNull { it.idTargetTransfer }
        val recurringIds = records.mapNotNull { it.idTargetRecurring }

        val loaded = buildList {
            if (movementIds.isNotEmpty()) add(importCandidateRepository.findMovements(movementIds))
            if (purchaseIds.isNotEmpty()) add(importCandidateRepository.findPurchases(purchaseIds))
            if (transferIds.isNotEmpty()) add(importCandidateRepository.findTransfers(transferIds))
            if (recurringIds.isNotEmpty()) add(importCandidateRepository.findRecurringMovements(recurringIds))
        }.flatten()

        return loaded.associateBy { candidate -> candidate.kind to candidate.id }
    }

    private fun ImportLinesRecord.targetKey(): Pair<ImportCandidateKind, Long>? = when {
        idTargetMovement != null -> ImportCandidateKind.MOVEMENT to idTargetMovement!!
        idTargetPurchase != null -> ImportCandidateKind.PURCHASE to idTargetPurchase!!
        idTargetTransfer != null -> ImportCandidateKind.TRANSFER to idTargetTransfer!!
        idTargetRecurring != null -> ImportCandidateKind.RECURRING to idTargetRecurring!!
        else -> null
    }

    private fun ImportCandidate?.idOf(kind: ImportCandidateKind): Long? =
        this?.takeIf { it.kind == kind }?.id
}

data class ImportLineCriteria(
    val text: String? = null,
    val pending: Boolean? = null,
    val actions: List<ImportAction>? = null
)
