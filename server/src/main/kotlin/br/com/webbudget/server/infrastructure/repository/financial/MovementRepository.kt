package br.com.webbudget.server.infrastructure.repository.financial

import br.com.webbudget.server.domain.entities.financial.Movement
import br.com.webbudget.server.infrastructure.repository.concurrentUpdate
import br.com.webbudget.server.infrastructure.repository.pagedModelOf
import br.com.webbudget.server.infrastructure.repository.toOrderBy
import br.com.webbudget.server.jooq.financial.tables.references.MOVEMENTS
import br.com.webbudget.server.jooq.financial.tables.references.PAYMENTS
import br.com.webbudget.server.jooq.registration.tables.references.CLASSIFICATIONS
import br.com.webbudget.server.jooq.registration.tables.references.COST_CENTERS
import br.com.webbudget.server.jooq.registration.tables.references.FINANCIAL_PERIODS
import br.com.webbudget.server.jooq.registration.tables.references.WALLETS
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
class MovementRepository(
    private val dsl: DSLContext
) {

    private val movements = MOVEMENTS.`as`("movements")
    private val classifications = CLASSIFICATIONS.`as`("classifications")
    private val costCenters = COST_CENTERS.`as`("cost_centers")
    private val financialPeriods = FINANCIAL_PERIODS.`as`("financial_periods")
    private val payments = PAYMENTS.`as`("payments")
    private val wallets = WALLETS.`as`("wallets")

    fun findByExternalId(externalId: UUID): Movement? = selectJoined()
        .where(movements.EXTERNAL_ID.eq(externalId))
        .fetchOne()
        ?.toMovement()

    fun findAll(filter: MovementCriteria, today: LocalDate, pageable: Pageable): PagedModel<Movement> {

        val overdue = movements.STATUS.eq(Movement.Status.OPEN.name).and(movements.DUE_DATE.lt(today))

        val condition = DSL.and(
            listOfNotNull(
                filter.text?.let { text -> movements.NAME.containsIgnoreCase(text) },
                filter.type?.let { type -> movements.TYPE.eq(type.name) },
                filter.statuses?.takeIf { it.isNotEmpty() }
                    ?.let { statuses -> movements.STATUS.`in`(statuses.map(Movement.Status::name)) },
                filter.overdue?.let { requested -> if (requested) overdue else DSL.not(overdue) },
                filter.classification?.let { classifications.EXTERNAL_ID.eq(it) },
                filter.costCenter?.let { costCenters.EXTERNAL_ID.eq(it) },
                filter.financialPeriods?.takeIf { it.isNotEmpty() }?.let { financialPeriods.EXTERNAL_ID.`in`(it) },
                filter.dueFrom?.let { movements.DUE_DATE.ge(it) },
                filter.dueTo?.let { movements.DUE_DATE.le(it) }
            )
        )

        val sortable = mapOf(
            "name" to movements.NAME,
            "dueDate" to movements.DUE_DATE,
            "value" to movements.VALUE,
            "status" to movements.STATUS,
            "createdOn" to movements.CREATED_ON
        )

        val content = selectJoined()
            .where(condition)
            .orderBy(pageable.toOrderBy(sortable, movements.CREATED_ON, movements.ID))
            .limit(pageable.pageSize)
            .offset(pageable.offset)
            .fetch()
            .map { record -> record.toMovement() }

        val total = dsl.fetchCount(dsl.selectOne().from(movements).joinReferences().where(condition))

        return pagedModelOf(content, pageable, total.toLong())
    }

    fun sumPaidValueByType(financialPeriodId: Long): Map<Movement.Type, BigDecimal> = dsl
        .select(movements.TYPE, DSL.sum(payments.VALUE_PAID))
        .from(movements)
        .join(payments).on(payments.ID_MOVEMENT.eq(movements.ID))
        .where(movements.ID_FINANCIAL_PERIOD.eq(financialPeriodId))
        .groupBy(movements.TYPE)
        .fetch()
        .associate { record -> Movement.Type.valueOf(record.value1()!!) to (record.value2() ?: BigDecimal.ZERO) }

    fun insert(movement: Movement): Movement {
        val record = dsl.insertInto(MOVEMENTS)
            .set(MOVEMENTS.EXTERNAL_ID, UUID.randomUUID())
            .set(MOVEMENTS.VERSION, 0)
            .set(MOVEMENTS.CREATED_ON, LocalDateTime.now())
            .set(MOVEMENTS.NAME, movement.name)
            .set(MOVEMENTS.TYPE, movement.type.name)
            .set(MOVEMENTS.VALUE, movement.value)
            .set(MOVEMENTS.DUE_DATE, movement.dueDate)
            .set(MOVEMENTS.STATUS, movement.status.name)
            .set(MOVEMENTS.DESCRIPTION, movement.description)
            .set(MOVEMENTS.ID_FINANCIAL_PERIOD, movement.financialPeriod.id)
            .set(MOVEMENTS.ID_CLASSIFICATION, movement.classification.id)
            .set(MOVEMENTS.ID_COST_CENTER, movement.costCenter.id)
            .returning()
            .fetchSingle()

        movement.restore(record.id, record.externalId, record.version, record.createdOn, record.lastUpdate)
        return movement
    }

    fun update(movement: Movement): Movement {
        val record = dsl.update(MOVEMENTS)
            .set(MOVEMENTS.NAME, movement.name)
            .set(MOVEMENTS.VALUE, movement.value)
            .set(MOVEMENTS.DUE_DATE, movement.dueDate)
            .set(MOVEMENTS.STATUS, movement.status.name)
            .set(MOVEMENTS.DESCRIPTION, movement.description)
            .set(MOVEMENTS.ID_CLASSIFICATION, movement.classification.id)
            .set(MOVEMENTS.ID_COST_CENTER, movement.costCenter.id)
            .set(MOVEMENTS.VERSION, MOVEMENTS.VERSION.plus(1))
            .set(MOVEMENTS.LAST_UPDATE, LocalDateTime.now())
            .where(MOVEMENTS.ID.eq(movement.id))
            .and(MOVEMENTS.VERSION.eq(movement.version))
            .returning()
            .fetchOne() ?: throw concurrentUpdate()

        movement.restore(record.id, record.externalId, record.version, record.createdOn, record.lastUpdate)
        return movement
    }

    fun delete(movement: Movement) {
        dsl.deleteFrom(MOVEMENTS)
            .where(MOVEMENTS.ID.eq(movement.id))
            .execute()
    }

    private fun selectJoined() = dsl.select().from(movements).joinReferences()

    private fun <R : Record> SelectJoinStep<R>.joinReferences(): SelectJoinStep<R> = this
        .join(classifications).on(classifications.ID.eq(movements.ID_CLASSIFICATION))
        .join(costCenters).on(costCenters.ID.eq(movements.ID_COST_CENTER))
        .join(financialPeriods).on(financialPeriods.ID.eq(movements.ID_FINANCIAL_PERIOD))
        .leftJoin(payments).on(payments.ID_MOVEMENT.eq(movements.ID))
        .leftJoin(wallets).on(wallets.ID.eq(payments.ID_WALLET))

    private fun Record.toMovement(): Movement {

        val paymentRecord = into(payments)
        val payment = paymentRecord.id?.let { paymentRecord.toPayment(into(wallets).toWalletReference()) }

        return into(movements).toMovement(
            classification = into(classifications).toClassificationReference(),
            costCenter = into(costCenters).toCostCenterReference(),
            financialPeriod = into(financialPeriods).toFinancialPeriodReference(),
            payment = payment
        )
    }
}

data class MovementCriteria(
    val text: String? = null,
    val type: Movement.Type? = null,
    val statuses: List<Movement.Status>? = null,
    val overdue: Boolean? = null,
    val classification: UUID? = null,
    val costCenter: UUID? = null,
    val financialPeriods: List<UUID>? = null,
    val dueFrom: LocalDate? = null,
    val dueTo: LocalDate? = null
)
