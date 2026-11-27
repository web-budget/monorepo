package br.com.webbudget.server.infrastructure.repository.financial

import br.com.webbudget.server.domain.entities.financial.CompartmentMovement
import br.com.webbudget.server.domain.entities.financial.CompartmentMovementLine
import br.com.webbudget.server.infrastructure.repository.pagedModelOf
import br.com.webbudget.server.infrastructure.repository.toOrderBy
import br.com.webbudget.server.jooq.financial.tables.references.COMPARTMENT_MOVEMENTS
import br.com.webbudget.server.jooq.financial.tables.references.WALLET_ENTRIES
import br.com.webbudget.server.jooq.registration.tables.references.COMPARTMENTS
import org.jooq.DSLContext
import org.jooq.impl.DSL
import org.springframework.data.domain.Pageable
import org.springframework.data.web.PagedModel
import org.springframework.stereotype.Repository
import java.math.BigDecimal
import java.time.LocalDateTime
import java.util.UUID

@Repository
class CompartmentMovementRepository(
    private val dsl: DSLContext
) {

    private val movements = COMPARTMENT_MOVEMENTS.`as`("compartment_movements")
    private val entries = WALLET_ENTRIES.`as`("wallet_entries")

    private val sortable = mapOf(
        "createdOn" to movements.CREATED_ON,
        "value" to movements.VALUE,
        "direction" to movements.DIRECTION
    )

    fun applyBalanceDelta(compartmentId: Long, delta: BigDecimal): BigDecimal? = dsl.update(COMPARTMENTS)
        .set(COMPARTMENTS.BALANCE, COMPARTMENTS.BALANCE.plus(delta))
        .where(COMPARTMENTS.ID.eq(compartmentId))
        .and(COMPARTMENTS.BALANCE.plus(delta).ge(BigDecimal.ZERO))
        .returning(COMPARTMENTS.BALANCE)
        .fetchOne()
        ?.balance

    fun findBalance(compartmentId: Long): BigDecimal = dsl.select(COMPARTMENTS.BALANCE)
        .from(COMPARTMENTS)
        .where(COMPARTMENTS.ID.eq(compartmentId))
        .fetchSingle()
        .value1()!!

    fun insert(movement: CompartmentMovement): CompartmentMovement {
        val record = dsl.insertInto(COMPARTMENT_MOVEMENTS)
            .set(COMPARTMENT_MOVEMENTS.EXTERNAL_ID, UUID.randomUUID())
            .set(COMPARTMENT_MOVEMENTS.VERSION, 0)
            .set(COMPARTMENT_MOVEMENTS.CREATED_ON, LocalDateTime.now())
            .set(COMPARTMENT_MOVEMENTS.DIRECTION, movement.direction.name)
            .set(COMPARTMENT_MOVEMENTS.VALUE, movement.value)
            .set(COMPARTMENT_MOVEMENTS.NOTE, movement.note)
            .set(COMPARTMENT_MOVEMENTS.PREVIOUS_BALANCE, movement.previousBalance)
            .set(COMPARTMENT_MOVEMENTS.RESULTING_BALANCE, movement.resultingBalance)
            .set(COMPARTMENT_MOVEMENTS.ID_COMPARTMENT, movement.compartment.id)
            .returning()
            .fetchSingle()

        movement.restore(record.id, record.externalId, record.version, record.createdOn, record.lastUpdate)
        return movement
    }

    fun findAll(compartmentId: Long, pageable: Pageable): PagedModel<CompartmentMovementLine> {

        val condition = movements.ID_COMPARTMENT.eq(compartmentId)

        val content = dsl.select(movements.asterisk(), entries.EXTERNAL_ID)
            .from(movements)
            .leftJoin(entries).on(entries.ID_COMPARTMENT_MOVEMENT.eq(movements.ID))
            .where(condition)
            .orderBy(pageable.toOrderBy(sortable, movements.CREATED_ON, movements.ID))
            .limit(pageable.pageSize)
            .offset(pageable.offset)
            .fetch { record ->
                val movement = record.into(movements)
                CompartmentMovementLine(
                    externalId = movement.externalId!!,
                    createdOn = movement.createdOn!!,
                    direction = CompartmentMovement.Direction.valueOf(movement.direction!!),
                    value = movement.value!!,
                    note = movement.note,
                    previousBalance = movement.previousBalance!!,
                    resultingBalance = movement.resultingBalance!!,
                    walletEntryExternalId = record.get(entries.EXTERNAL_ID)
                )
            }

        val total = dsl.fetchCount(movements, condition)

        return pagedModelOf(content, pageable, total.toLong())
    }

    fun findPosition(compartmentId: Long, externalId: UUID, pageable: Pageable): Long? {

        val position = DSL.rowNumber()
            .over(DSL.orderBy(pageable.toOrderBy(sortable, movements.CREATED_ON, movements.ID)))
            .`as`("position")

        val ranked = dsl.select(movements.EXTERNAL_ID, position)
            .from(movements)
            .where(movements.ID_COMPARTMENT.eq(compartmentId))
            .asTable("ranked")

        return dsl.select(ranked.field("position", Long::class.java))
            .from(ranked)
            .where(ranked.field(movements.EXTERNAL_ID.name, UUID::class.java)!!.eq(externalId))
            .fetchOne()
            ?.value1()
            ?.minus(1)
    }
}
