package br.com.webbudget.server.infrastructure.repository.financial

import br.com.webbudget.server.domain.entities.financial.Import
import br.com.webbudget.server.domain.entities.financial.ImportAction
import br.com.webbudget.server.domain.entities.financial.ImportNameMemory
import br.com.webbudget.server.jooq.financial.tables.references.IMPORT_NAME_MEMORIES
import br.com.webbudget.server.jooq.registration.tables.references.CLASSIFICATIONS
import br.com.webbudget.server.jooq.registration.tables.references.COST_CENTERS
import br.com.webbudget.server.jooq.registration.tables.references.WALLETS
import org.jooq.DSLContext
import org.springframework.stereotype.Repository

@Repository
class ImportNameMemoryRepository(
    private val dsl: DSLContext
) {

    private val memories = IMPORT_NAME_MEMORIES.`as`("import_name_memories")
    private val costCenters = COST_CENTERS.`as`("cost_centers")
    private val classifications = CLASSIFICATIONS.`as`("classifications")
    private val wallets = WALLETS.`as`("wallets")

    fun findByNames(target: Import.Target, normalizedNames: Collection<String>): Map<String, ImportNameMemory> = dsl
        .select()
        .from(memories)
        .leftJoin(costCenters).on(costCenters.ID.eq(memories.ID_COST_CENTER))
        .leftJoin(classifications).on(classifications.ID.eq(memories.ID_CLASSIFICATION))
        .leftJoin(wallets).on(wallets.ID.eq(memories.ID_WALLET))
        .where(memories.TARGET.eq(target.name))
        .and(memories.NORMALIZED_NAME.`in`(normalizedNames))
        .fetch()
        .map { record ->

            val memoryRecord = record.into(memories)
            val costCenterRecord = record.into(costCenters)
            val classificationRecord = record.into(classifications)
            val walletRecord = record.into(wallets)

            ImportNameMemory(
                target = target,
                normalizedName = memoryRecord.normalizedName!!,
                action = ImportAction.valueOf(memoryRecord.action!!),
                costCenter = costCenterRecord.id?.let { costCenterRecord.toCostCenterReference() },
                classification = classificationRecord.id?.let { classificationRecord.toClassificationReference() },
                wallet = walletRecord.id?.let { walletRecord.toWalletReference() },
                recurringId = memoryRecord.idRecurringMovement
            ).also { memory ->
                memory.restore(memoryRecord.id, memoryRecord.externalId, memoryRecord.version, memoryRecord.createdOn, memoryRecord.lastUpdate)
            }
        }
        .associateBy { memory -> memory.normalizedName }
}
