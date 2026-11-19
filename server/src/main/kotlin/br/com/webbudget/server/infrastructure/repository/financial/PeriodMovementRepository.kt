package br.com.webbudget.server.infrastructure.repository.financial

import br.com.webbudget.server.domain.entities.financial.PeriodMovement
import br.com.webbudget.server.infrastructure.repository.concurrentUpdate
import br.com.webbudget.server.infrastructure.repository.pagedModelOf
import br.com.webbudget.server.infrastructure.repository.toOrderBy
import br.com.webbudget.server.jooq.financial.tables.references.PERIOD_MOVEMENTS
import br.com.webbudget.server.jooq.registration.tables.references.CLASSIFICATIONS
import br.com.webbudget.server.jooq.registration.tables.references.COST_CENTERS
import br.com.webbudget.server.jooq.registration.tables.references.FINANCIAL_PERIODS
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
class PeriodMovementRepository(
    private val dsl: DSLContext
) {

    private val movements = PERIOD_MOVEMENTS.`as`("period_movements")
    private val classifications = CLASSIFICATIONS.`as`("classifications")
    private val costCenters = COST_CENTERS.`as`("cost_centers")
    private val financialPeriods = FINANCIAL_PERIODS.`as`("financial_periods")

    fun findByExternalId(externalId: UUID): PeriodMovement? = selectJoined()
        .where(movements.EXTERNAL_ID.eq(externalId))
        .fetchOne()
        ?.toPeriodMovement()

    fun findAll(
        filter: String?,
        states: List<PeriodMovement.State>?,
        classification: UUID?,
        costCenter: UUID?,
        financialPeriodIds: List<UUID>?,
        pageable: Pageable
    ): PagedModel<PeriodMovement> {

        val decimalValue = filter?.toDecimalOrNull()

        val condition = listOfNotNull(
            filter?.let { text ->
                val nameMatches = containsIgnoreCase(movements.NAME, text)
                decimalValue?.let { nameMatches.or(movements.VALUE.eq(it)) } ?: nameMatches
            },
            states?.takeIf { it.isNotEmpty() }?.let { movements.STATE.`in`(it.map(PeriodMovement.State::name)) },
            classification?.let { classifications.EXTERNAL_ID.eq(it) },
            costCenter?.let { costCenters.EXTERNAL_ID.eq(it) },
            financialPeriodIds?.takeIf { it.isNotEmpty() }?.let { financialPeriods.EXTERNAL_ID.`in`(it) }
        ).fold(DSL.noCondition()) { accumulated, current -> accumulated.and(current) }

        val sortable = mapOf(
            "name" to movements.NAME,
            "dueDate" to movements.DUE_DATE,
            "value" to movements.VALUE,
            "state" to movements.STATE,
            "createdOn" to movements.CREATED_ON
        )

        val content = selectJoined()
            .where(condition)
            .orderBy(pageable.toOrderBy(sortable, movements.CREATED_ON, movements.ID))
            .limit(pageable.pageSize)
            .offset(pageable.offset)
            .fetch()
            .map { record -> record.toPeriodMovement() }

        val total = countJoined(condition)

        return pagedModelOf(content, pageable, total.toLong())
    }

    fun insert(movement: PeriodMovement): PeriodMovement {
        val record = dsl.insertInto(PERIOD_MOVEMENTS)
            .set(PERIOD_MOVEMENTS.EXTERNAL_ID, UUID.randomUUID())
            .set(PERIOD_MOVEMENTS.VERSION, 0)
            .set(PERIOD_MOVEMENTS.CREATED_ON, LocalDateTime.now())
            .set(PERIOD_MOVEMENTS.NAME, movement.name)
            .set(PERIOD_MOVEMENTS.DUE_DATE, movement.dueDate)
            .set(PERIOD_MOVEMENTS.VALUE, movement.value)
            .set(PERIOD_MOVEMENTS.STATE, movement.state.name)
            .set(PERIOD_MOVEMENTS.QUOTE_NUMBER, movement.quoteNumber)
            .set(PERIOD_MOVEMENTS.DESCRIPTION, movement.description)
            .set(PERIOD_MOVEMENTS.ID_CLASSIFICATION, movement.classification.id)
            .set(PERIOD_MOVEMENTS.ID_COST_CENTER, movement.costCenter.id)
            .set(PERIOD_MOVEMENTS.ID_FINANCIAL_PERIOD, movement.financialPeriod.id)
            .returning()
            .fetchSingle()

        movement.restore(record.id, record.externalId, record.version, record.createdOn, record.lastUpdate)
        return movement
    }

    fun update(movement: PeriodMovement): PeriodMovement {
        val record = dsl.update(PERIOD_MOVEMENTS)
            .set(PERIOD_MOVEMENTS.NAME, movement.name)
            .set(PERIOD_MOVEMENTS.DUE_DATE, movement.dueDate)
            .set(PERIOD_MOVEMENTS.VALUE, movement.value)
            .set(PERIOD_MOVEMENTS.STATE, movement.state.name)
            .set(PERIOD_MOVEMENTS.QUOTE_NUMBER, movement.quoteNumber)
            .set(PERIOD_MOVEMENTS.DESCRIPTION, movement.description)
            .set(PERIOD_MOVEMENTS.ID_CLASSIFICATION, movement.classification.id)
            .set(PERIOD_MOVEMENTS.ID_COST_CENTER, movement.costCenter.id)
            .set(PERIOD_MOVEMENTS.ID_FINANCIAL_PERIOD, movement.financialPeriod.id)
            .set(PERIOD_MOVEMENTS.VERSION, PERIOD_MOVEMENTS.VERSION.plus(1))
            .set(PERIOD_MOVEMENTS.LAST_UPDATE, LocalDateTime.now())
            .where(PERIOD_MOVEMENTS.ID.eq(movement.id))
            .and(PERIOD_MOVEMENTS.VERSION.eq(movement.version))
            .returning()
            .fetchOne() ?: throw concurrentUpdate()

        movement.restore(record.id, record.externalId, record.version, record.createdOn, record.lastUpdate)
        return movement
    }

    fun delete(movement: PeriodMovement) {
        dsl.deleteFrom(PERIOD_MOVEMENTS)
            .where(PERIOD_MOVEMENTS.ID.eq(movement.id))
            .execute()
    }

    private fun selectJoined() = dsl.select().from(movements).joinReferences()

    private fun countJoined(condition: Condition): Int = dsl.fetchCount(
        dsl.selectOne().from(movements).joinReferences().where(condition)
    )

    private fun <R : Record> SelectJoinStep<R>.joinReferences(): SelectJoinStep<R> = this
        .join(classifications).on(classifications.ID.eq(movements.ID_CLASSIFICATION))
        .join(costCenters).on(costCenters.ID.eq(movements.ID_COST_CENTER))
        .join(financialPeriods).on(financialPeriods.ID.eq(movements.ID_FINANCIAL_PERIOD))

    private fun Record.toPeriodMovement(): PeriodMovement = into(movements).toPeriodMovement(
        classification = into(classifications).toClassificationReference(),
        costCenter = into(costCenters).toCostCenterReference(),
        financialPeriod = into(financialPeriods).toFinancialPeriodReference()
    )
}
