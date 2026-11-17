package br.com.webbudget.server.infrastructure.repository.financial

import br.com.webbudget.server.domain.entities.financial.RecurringMovement
import br.com.webbudget.server.infrastructure.repository.concurrentUpdate
import br.com.webbudget.server.infrastructure.repository.pagedModelOf
import br.com.webbudget.server.infrastructure.repository.toOrderBy
import br.com.webbudget.server.jooq.financial.tables.references.RECURRING_MOVEMENTS
import br.com.webbudget.server.jooq.registration.tables.references.CLASSIFICATIONS
import br.com.webbudget.server.jooq.registration.tables.references.COST_CENTERS
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
class RecurringMovementRepository(
    private val dsl: DSLContext
) {

    private val movements = RECURRING_MOVEMENTS.`as`("recurring_movements")
    private val classifications = CLASSIFICATIONS.`as`("classifications")
    private val costCenters = COST_CENTERS.`as`("cost_centers")

    fun findByExternalId(externalId: UUID): RecurringMovement? = selectJoined()
        .where(movements.EXTERNAL_ID.eq(externalId))
        .fetchOne()
        ?.toRecurringMovement()

    fun existsByExternalIdAndState(externalId: UUID, state: RecurringMovement.State): Boolean = dsl.fetchExists(
        dsl.selectOne()
            .from(RECURRING_MOVEMENTS)
            .where(RECURRING_MOVEMENTS.EXTERNAL_ID.eq(externalId))
            .and(RECURRING_MOVEMENTS.STATE.eq(state.name))
    )

    fun findAll(
        filter: String?,
        states: List<RecurringMovement.State>?,
        classification: UUID?,
        costCenter: UUID?,
        pageable: Pageable
    ): PagedModel<RecurringMovement> {

        val decimalValue = filter?.toDecimalOrNull()

        val condition = listOfNotNull(
            filter?.let { text ->
                val nameMatches = containsIgnoreCase(movements.NAME, text)
                decimalValue?.let { nameMatches.or(movements.VALUE.eq(it)) } ?: nameMatches
            },
            states?.takeIf { it.isNotEmpty() }?.let { movements.STATE.`in`(it.map(RecurringMovement.State::name)) },
            classification?.let { classifications.EXTERNAL_ID.eq(it) },
            costCenter?.let { costCenters.EXTERNAL_ID.eq(it) }
        ).fold(DSL.noCondition()) { accumulated, current -> accumulated.and(current) }

        val sortable = mapOf(
            "name" to movements.NAME,
            "value" to movements.VALUE,
            "startingAt" to movements.STARTING_AT,
            "state" to movements.STATE,
            "createdOn" to movements.CREATED_ON
        )

        val content = selectJoined()
            .where(condition)
            .orderBy(pageable.toOrderBy(sortable, movements.ID.asc()))
            .limit(pageable.pageSize)
            .offset(pageable.offset)
            .fetch()
            .map { record -> record.toRecurringMovement() }

        val total = countJoined(condition)

        return pagedModelOf(content, pageable, total.toLong())
    }

    fun insert(movement: RecurringMovement): RecurringMovement {
        val record = dsl.insertInto(RECURRING_MOVEMENTS)
            .set(RECURRING_MOVEMENTS.EXTERNAL_ID, UUID.randomUUID())
            .set(RECURRING_MOVEMENTS.VERSION, 0)
            .set(RECURRING_MOVEMENTS.CREATED_ON, LocalDateTime.now())
            .set(RECURRING_MOVEMENTS.NAME, movement.name)
            .set(RECURRING_MOVEMENTS.VALUE, movement.value)
            .set(RECURRING_MOVEMENTS.STARTING_AT, movement.startingAt)
            .set(RECURRING_MOVEMENTS.STATE, movement.state.name)
            .set(RECURRING_MOVEMENTS.AUTO_LAUNCH, movement.autoLaunch)
            .set(RECURRING_MOVEMENTS.INDETERMINATE, movement.indeterminate)
            .set(RECURRING_MOVEMENTS.TOTAL_QUOTES, movement.totalQuotes)
            .set(RECURRING_MOVEMENTS.STARTING_QUOTE, movement.startingQuote)
            .set(RECURRING_MOVEMENTS.CURRENT_QUOTE, movement.currentQuote)
            .set(RECURRING_MOVEMENTS.DESCRIPTION, movement.description)
            .set(RECURRING_MOVEMENTS.ID_CLASSIFICATION, movement.classification.id)
            .set(RECURRING_MOVEMENTS.ID_COST_CENTER, movement.costCenter.id)
            .returning()
            .fetchSingle()

        movement.restore(record.id, record.externalId, record.version, record.createdOn, record.lastUpdate)
        return movement
    }

    fun update(movement: RecurringMovement): RecurringMovement {
        val record = dsl.update(RECURRING_MOVEMENTS)
            .set(RECURRING_MOVEMENTS.NAME, movement.name)
            .set(RECURRING_MOVEMENTS.VALUE, movement.value)
            .set(RECURRING_MOVEMENTS.STARTING_AT, movement.startingAt)
            .set(RECURRING_MOVEMENTS.STATE, movement.state.name)
            .set(RECURRING_MOVEMENTS.AUTO_LAUNCH, movement.autoLaunch)
            .set(RECURRING_MOVEMENTS.INDETERMINATE, movement.indeterminate)
            .set(RECURRING_MOVEMENTS.TOTAL_QUOTES, movement.totalQuotes)
            .set(RECURRING_MOVEMENTS.STARTING_QUOTE, movement.startingQuote)
            .set(RECURRING_MOVEMENTS.CURRENT_QUOTE, movement.currentQuote)
            .set(RECURRING_MOVEMENTS.DESCRIPTION, movement.description)
            .set(RECURRING_MOVEMENTS.ID_CLASSIFICATION, movement.classification.id)
            .set(RECURRING_MOVEMENTS.ID_COST_CENTER, movement.costCenter.id)
            .set(RECURRING_MOVEMENTS.VERSION, RECURRING_MOVEMENTS.VERSION.plus(1))
            .set(RECURRING_MOVEMENTS.LAST_UPDATE, LocalDateTime.now())
            .where(RECURRING_MOVEMENTS.ID.eq(movement.id))
            .and(RECURRING_MOVEMENTS.VERSION.eq(movement.version))
            .returning()
            .fetchOne() ?: throw concurrentUpdate()

        movement.restore(record.id, record.externalId, record.version, record.createdOn, record.lastUpdate)
        return movement
    }

    fun delete(movement: RecurringMovement) {
        dsl.deleteFrom(RECURRING_MOVEMENTS)
            .where(RECURRING_MOVEMENTS.ID.eq(movement.id))
            .execute()
    }

    private fun selectJoined() = dsl.select().from(movements).joinReferences()

    private fun countJoined(condition: Condition): Int = dsl.fetchCount(
        dsl.selectOne().from(movements).joinReferences().where(condition)
    )

    private fun <R : Record> SelectJoinStep<R>.joinReferences(): SelectJoinStep<R> = this
        .join(classifications).on(classifications.ID.eq(movements.ID_CLASSIFICATION))
        .join(costCenters).on(costCenters.ID.eq(movements.ID_COST_CENTER))

    private fun Record.toRecurringMovement(): RecurringMovement = into(movements).toRecurringMovement(
        classification = into(classifications).toClassificationReference(),
        costCenter = into(costCenters).toCostCenterReference()
    )
}
