package br.com.webbudget.server.infrastructure.repository.registration

import br.com.webbudget.server.domain.entities.registration.Compartment
import br.com.webbudget.server.domain.entities.registration.Wallet
import br.com.webbudget.server.infrastructure.repository.concurrentUpdate
import br.com.webbudget.server.infrastructure.repository.excluding
import br.com.webbudget.server.jooq.financial.tables.references.COMPARTMENT_MOVEMENTS
import br.com.webbudget.server.jooq.registration.tables.references.COMPARTMENTS
import org.jooq.DSLContext
import org.jooq.impl.DSL
import org.springframework.stereotype.Repository
import java.math.BigDecimal
import java.time.LocalDateTime
import java.util.UUID

@Repository
class CompartmentRepository(
    private val dsl: DSLContext
) {

    private val compartments = COMPARTMENTS.`as`("compartments")
    private val compartmentMovements = COMPARTMENT_MOVEMENTS.`as`("compartment_movements")

    private val statementEntryCount = DSL.field(
        dsl.selectCount()
            .from(compartmentMovements)
            .where(compartmentMovements.ID_COMPARTMENT.eq(compartments.ID))
    ).`as`("statement_entry_count")

    fun findAllByWallet(wallet: Wallet): List<Compartment> = dsl.select(compartments.asterisk(), statementEntryCount)
        .from(compartments)
        .where(compartments.ID_WALLET.eq(wallet.id))
        .orderBy(compartments.CREATED_ON.asc(), compartments.ID.asc())
        .fetch { record ->
            record.into(compartments).toCompartment(wallet, record.get(statementEntryCount))
        }

    fun findByExternalId(wallet: Wallet, externalId: UUID): Compartment? =
        dsl.select(compartments.asterisk(), statementEntryCount)
            .from(compartments)
            .where(compartments.ID_WALLET.eq(wallet.id))
            .and(compartments.EXTERNAL_ID.eq(externalId))
            .fetchOne { record ->
                record.into(compartments).toCompartment(wallet, record.get(statementEntryCount))
            }

    fun existsByName(walletId: Long, name: String, excludingExternalId: UUID? = null): Boolean = dsl.fetchExists(
        dsl.selectOne().from(COMPARTMENTS)
            .where(COMPARTMENTS.ID_WALLET.eq(walletId))
            .and(COMPARTMENTS.NAME.equalIgnoreCase(name))
            .and(COMPARTMENTS.EXTERNAL_ID.excluding(excludingExternalId))
    )

    fun sumReserveBalance(): BigDecimal = dsl.select(DSL.coalesce(DSL.sum(COMPARTMENTS.BALANCE), BigDecimal.ZERO))
        .from(COMPARTMENTS)
        .where(COMPARTMENTS.TYPE.eq(Compartment.Type.RESERVE.name))
        .fetchSingle()
        .value1()

    fun insert(compartment: Compartment): Compartment {
        val record = dsl.insertInto(COMPARTMENTS)
            .set(COMPARTMENTS.EXTERNAL_ID, UUID.randomUUID())
            .set(COMPARTMENTS.VERSION, 0)
            .set(COMPARTMENTS.CREATED_ON, LocalDateTime.now())
            .set(COMPARTMENTS.NAME, compartment.name)
            .set(COMPARTMENTS.TYPE, compartment.type.name)
            .set(COMPARTMENTS.BALANCE, BigDecimal.ZERO)
            .set(COMPARTMENTS.DESCRIPTION, compartment.description)
            .set(COMPARTMENTS.TARGET_VALUE, compartment.targetValue)
            .set(COMPARTMENTS.TARGET_DATE, compartment.targetDate)
            .set(COMPARTMENTS.ID_WALLET, compartment.wallet.id)
            .returning()
            .fetchSingle()

        compartment.restore(record.id, record.externalId, record.version, record.createdOn, record.lastUpdate)
        return compartment
    }

    fun update(compartment: Compartment): Compartment {
        val record = dsl.update(COMPARTMENTS)
            .set(COMPARTMENTS.NAME, compartment.name)
            .set(COMPARTMENTS.DESCRIPTION, compartment.description)
            .set(COMPARTMENTS.TARGET_VALUE, compartment.targetValue)
            .set(COMPARTMENTS.TARGET_DATE, compartment.targetDate)
            .set(COMPARTMENTS.VERSION, COMPARTMENTS.VERSION.plus(1))
            .set(COMPARTMENTS.LAST_UPDATE, LocalDateTime.now())
            .where(COMPARTMENTS.ID.eq(compartment.id))
            .and(COMPARTMENTS.VERSION.eq(compartment.version))
            .returning()
            .fetchOne() ?: throw concurrentUpdate()

        compartment.restore(record.id, record.externalId, record.version, record.createdOn, record.lastUpdate)
        return compartment
    }

    fun delete(compartment: Compartment) {
        dsl.deleteFrom(COMPARTMENTS)
            .where(COMPARTMENTS.ID.eq(compartment.id))
            .execute()
    }
}
