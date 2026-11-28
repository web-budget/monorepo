package br.com.webbudget.server.infrastructure.repository.financial

import br.com.webbudget.server.domain.entities.financial.Import
import br.com.webbudget.server.domain.entities.financial.ImportAction
import br.com.webbudget.server.domain.entities.financial.ImportCompartment
import br.com.webbudget.server.domain.entities.financial.ImportNameMemory
import br.com.webbudget.server.jooq.financial.tables.references.IMPORT_NAME_MEMORIES
import br.com.webbudget.server.jooq.registration.tables.references.CLASSIFICATIONS
import br.com.webbudget.server.jooq.registration.tables.references.COMPARTMENTS
import br.com.webbudget.server.jooq.registration.tables.references.COST_CENTERS
import br.com.webbudget.server.jooq.registration.tables.references.WALLETS
import org.jooq.DSLContext
import org.springframework.stereotype.Repository
import java.time.LocalDateTime
import java.util.UUID

@Repository
class ImportNameMemoryRepository(
    private val dsl: DSLContext
) {

    private val memories = IMPORT_NAME_MEMORIES.`as`("import_name_memories")
    private val costCenters = COST_CENTERS.`as`("cost_centers")
    private val classifications = CLASSIFICATIONS.`as`("classifications")
    private val wallets = WALLETS.`as`("wallets")
    private val compartments = COMPARTMENTS.`as`("compartments")

    fun save(memory: ImportNameMemory) {

        val now = LocalDateTime.now()

        dsl.insertInto(IMPORT_NAME_MEMORIES)
            .set(IMPORT_NAME_MEMORIES.EXTERNAL_ID, UUID.randomUUID())
            .set(IMPORT_NAME_MEMORIES.VERSION, 0)
            .set(IMPORT_NAME_MEMORIES.CREATED_ON, now)
            .set(IMPORT_NAME_MEMORIES.TARGET, memory.target.name)
            .set(IMPORT_NAME_MEMORIES.NORMALIZED_NAME, memory.normalizedName)
            .set(IMPORT_NAME_MEMORIES.ACTION, memory.action.name)
            .set(IMPORT_NAME_MEMORIES.ID_COST_CENTER, memory.costCenter?.id)
            .set(IMPORT_NAME_MEMORIES.ID_CLASSIFICATION, memory.classification?.id)
            .set(IMPORT_NAME_MEMORIES.ID_WALLET, memory.wallet?.id)
            .set(IMPORT_NAME_MEMORIES.ID_RECURRING_MOVEMENT, memory.recurringId)
            .set(IMPORT_NAME_MEMORIES.ID_COMPARTMENT, memory.compartment?.id)
            .onConflict(IMPORT_NAME_MEMORIES.TARGET, IMPORT_NAME_MEMORIES.NORMALIZED_NAME)
            .doUpdate()
            .set(IMPORT_NAME_MEMORIES.ACTION, memory.action.name)
            .set(IMPORT_NAME_MEMORIES.ID_COST_CENTER, memory.costCenter?.id)
            .set(IMPORT_NAME_MEMORIES.ID_CLASSIFICATION, memory.classification?.id)
            .set(IMPORT_NAME_MEMORIES.ID_WALLET, memory.wallet?.id)
            .set(IMPORT_NAME_MEMORIES.ID_RECURRING_MOVEMENT, memory.recurringId)
            .set(IMPORT_NAME_MEMORIES.ID_COMPARTMENT, memory.compartment?.id)
            .set(IMPORT_NAME_MEMORIES.VERSION, IMPORT_NAME_MEMORIES.VERSION.plus(1))
            .set(IMPORT_NAME_MEMORIES.LAST_UPDATE, now)
            .execute()
    }

    fun findByNames(target: Import.Target, normalizedNames: Collection<String>): Map<String, ImportNameMemory> = dsl
        .select()
        .from(memories)
        .leftJoin(costCenters).on(costCenters.ID.eq(memories.ID_COST_CENTER))
        .leftJoin(classifications).on(classifications.ID.eq(memories.ID_CLASSIFICATION))
        .leftJoin(wallets).on(wallets.ID.eq(memories.ID_WALLET))
        .leftJoin(compartments).on(compartments.ID.eq(memories.ID_COMPARTMENT))
        .where(memories.TARGET.eq(target.name))
        .and(memories.NORMALIZED_NAME.`in`(normalizedNames))
        .fetch()
        .map { record ->

            val memoryRecord = record.into(memories)
            val costCenterRecord = record.into(costCenters)
            val classificationRecord = record.into(classifications)
            val walletRecord = record.into(wallets)
            val compartmentRecord = record.into(compartments)

            ImportNameMemory(
                target = target,
                normalizedName = memoryRecord.normalizedName!!,
                action = ImportAction.valueOf(memoryRecord.action!!),
                costCenter = costCenterRecord.id?.let { costCenterRecord.toCostCenterReference() },
                classification = classificationRecord.id?.let { classificationRecord.toClassificationReference() },
                wallet = walletRecord.id?.let { walletRecord.toWalletReference() },
                recurringId = memoryRecord.idRecurringMovement,
                compartment = compartmentRecord.id?.let {
                    ImportCompartment(
                        id = compartmentRecord.id!!,
                        externalId = compartmentRecord.externalId!!,
                        name = compartmentRecord.name!!,
                        balance = compartmentRecord.balance!!,
                        walletId = compartmentRecord.idWallet!!
                    )
                }
            ).also { memory ->
                memory.restore(memoryRecord.id, memoryRecord.externalId, memoryRecord.version, memoryRecord.createdOn, memoryRecord.lastUpdate)
            }
        }
        .associateBy { memory -> memory.normalizedName }
}
