package br.com.webbudget.server.infrastructure.repository.financial

import br.com.webbudget.server.domain.entities.financial.FinancialPeriodReference
import br.com.webbudget.server.domain.entities.financial.Movement
import br.com.webbudget.server.domain.entities.financial.Payment
import br.com.webbudget.server.domain.entities.financial.RecurringLaunchEntry
import br.com.webbudget.server.domain.entities.financial.RecurringMovement
import br.com.webbudget.server.domain.entities.financial.RecurringValue
import br.com.webbudget.server.infrastructure.repository.concurrentUpdate
import br.com.webbudget.server.infrastructure.repository.pagedModelOf
import br.com.webbudget.server.infrastructure.repository.toOrderBy
import br.com.webbudget.server.jooq.financial.tables.references.MOVEMENTS
import br.com.webbudget.server.jooq.financial.tables.references.PAYMENTS
import br.com.webbudget.server.jooq.financial.tables.references.RECURRING_LAUNCHES
import br.com.webbudget.server.jooq.financial.tables.references.RECURRING_MOVEMENTS
import br.com.webbudget.server.jooq.financial.tables.references.RECURRING_VALUES
import br.com.webbudget.server.jooq.registration.tables.references.CARDS
import br.com.webbudget.server.jooq.registration.tables.references.CLASSIFICATIONS
import br.com.webbudget.server.jooq.registration.tables.references.COST_CENTERS
import br.com.webbudget.server.jooq.registration.tables.references.FINANCIAL_PERIODS
import org.jooq.Condition
import org.jooq.DSLContext
import org.jooq.Field
import org.jooq.Record
import org.jooq.impl.DSL
import org.springframework.data.domain.Pageable
import org.springframework.data.web.PagedModel
import org.springframework.stereotype.Repository
import java.math.BigDecimal
import java.time.LocalDateTime
import java.util.UUID

@Repository
class RecurringMovementRepository(
    private val dsl: DSLContext
) {

    private val recurringMovements = RECURRING_MOVEMENTS.`as`("recurring_movements")
    private val classifications = CLASSIFICATIONS.`as`("classifications")
    private val costCenters = COST_CENTERS.`as`("cost_centers")
    private val cards = CARDS.`as`("cards")

    private val currentValue: Field<BigDecimal?> = run {
        val values = RECURRING_VALUES.`as`("current_values")
        dsl.select(values.VALUE)
            .from(values)
            .where(values.ID_RECURRING_MOVEMENT.eq(recurringMovements.ID))
            .orderBy(values.VALID_FROM.desc(), values.ID.desc())
            .limit(1)
            .asField<BigDecimal?>()
    }

    private val launchedInstallments: Field<Int?> = run {
        val launches = RECURRING_LAUNCHES.`as`("installment_launches")
        dsl.select(DSL.max(launches.INSTALLMENT))
            .from(launches)
            .where(launches.ID_RECURRING_MOVEMENT.eq(recurringMovements.ID))
            .asField<Int?>()
    }

    private val lastPaidValue: Field<BigDecimal?> = run {
        val launches = RECURRING_LAUNCHES.`as`("paid_launches")
        val paidMovements = MOVEMENTS.`as`("paid_movements")
        val payments = PAYMENTS.`as`("paid_payments")
        dsl.select(paidMovements.VALUE)
            .from(launches)
            .join(paidMovements).on(paidMovements.ID.eq(launches.ID_MOVEMENT))
            .join(payments).on(payments.ID_MOVEMENT.eq(paidMovements.ID))
            .where(launches.ID_RECURRING_MOVEMENT.eq(recurringMovements.ID))
            .orderBy(payments.PAID_ON.desc(), payments.ID.desc())
            .limit(1)
            .asField<BigDecimal?>()
    }

    fun findByExternalId(externalId: UUID, financialPeriod: UUID? = null): RecurringMovement? =
        selectJoined(financialPeriod)
            .where(recurringMovements.EXTERNAL_ID.eq(externalId))
            .fetchOne()
            ?.toRecurringMovement()

    fun findAll(
        criteria: RecurringMovementCriteria,
        pageable: Pageable
    ): PagedModel<RecurringMovement> {

        val finished = finishedCondition()

        val condition = DSL.and(
            listOfNotNull(
                criteria.text?.let { text ->
                    recurringMovements.NAME.containsIgnoreCase(text)
                        .or(classifications.NAME.containsIgnoreCase(text))
                        .or(costCenters.NAME.containsIgnoreCase(text))
                },
                criteria.type?.let { recurringMovements.TYPE.eq(it.name) },
                criteria.valueKinds
                    ?.let { kinds -> recurringMovements.VALUE_KIND.`in`(kinds.map(RecurringMovement.ValueKind::name)) },
                criteria.active?.let { recurringMovements.ACTIVE.eq(it) },
                criteria.cards?.let { cards.EXTERNAL_ID.`in`(it) },
                criteria.finished?.let { requested -> if (requested) finished else DSL.not(finished) },
                criteria.ended?.let { requested -> if (requested) ended() else DSL.not(ended()) }
            )
        )

        val sortable = mapOf(
            "name" to recurringMovements.NAME,
            "valueKind" to recurringMovements.VALUE_KIND,
            "value" to currentValue,
            "createdOn" to recurringMovements.CREATED_ON
        )

        val content = selectJoined(criteria.financialPeriod)
            .where(condition)
            .orderBy(pageable.toOrderBy(sortable, recurringMovements.CREATED_ON, recurringMovements.ID))
            .limit(pageable.pageSize)
            .offset(pageable.offset)
            .fetch()
            .map { record -> record.toRecurringMovement() }

        val total = dsl.fetchCount(
            dsl.selectOne().from(recurringMovements)
                .join(classifications).on(classifications.ID.eq(recurringMovements.ID_CLASSIFICATION))
                .join(costCenters).on(costCenters.ID.eq(recurringMovements.ID_COST_CENTER))
                .leftJoin(cards).on(cards.ID.eq(recurringMovements.ID_CARD))
                .where(condition)
        )

        return pagedModelOf(content, pageable, total.toLong())
    }

    fun findAutoLaunchable(): List<UUID> = dsl.select(recurringMovements.EXTERNAL_ID)
        .from(recurringMovements)
        .where(recurringMovements.ACTIVE.isTrue)
        .and(recurringMovements.AUTO_LAUNCH.isTrue)
        .and(DSL.not(finishedCondition()))
        .orderBy(recurringMovements.ID)
        .fetch { record -> record.value1()!! }

    fun findAutoLaunchableRecurringMovements(): List<RecurringMovement> = selectJoined(null)
        .where(recurringMovements.ACTIVE.isTrue)
        .and(recurringMovements.AUTO_LAUNCH.isTrue)
        .and(DSL.not(finishedCondition()))
        .orderBy(recurringMovements.ID)
        .fetch()
        .map { record -> record.toRecurringMovement() }

    fun findValues(recurringMovementId: Long, pageable: Pageable): PagedModel<RecurringValue> {

        val values = RECURRING_VALUES.`as`("recurring_values")
        val laterValues = RECURRING_VALUES.`as`("later_values")
        val launches = RECURRING_LAUNCHES.`as`("value_launches")

        val firstLaunchPeriod: Field<Long?> = DSL.field(
            dsl.select(launches.ID_FINANCIAL_PERIOD)
                .from(launches)
                .where(launches.ID_RECURRING_MOVEMENT.eq(values.ID_RECURRING_MOVEMENT))
                .and(launches.CREATED_ON.ge(values.VALID_FROM))
                .andNotExists(
                    dsl.selectOne().from(laterValues)
                        .where(laterValues.ID_RECURRING_MOVEMENT.eq(values.ID_RECURRING_MOVEMENT))
                        .and(laterValues.VALID_FROM.gt(values.VALID_FROM))
                        .and(laterValues.VALID_FROM.le(launches.CREATED_ON))
                )
                .orderBy(launches.CREATED_ON, launches.ID)
                .limit(1)
        ).`as`("first_launch_period")

        val currentValueId = dsl.select(values.ID)
            .from(values)
            .where(values.ID_RECURRING_MOVEMENT.eq(recurringMovementId))
            .orderBy(values.VALID_FROM.desc(), values.ID.desc())
            .limit(1)
            .fetchOne()?.value1()

        val records = dsl.select(*values.fields(), firstLaunchPeriod)
            .from(values)
            .where(values.ID_RECURRING_MOVEMENT.eq(recurringMovementId))
            .orderBy(values.VALID_FROM.desc(), values.ID.desc())
            .limit(pageable.pageSize)
            .offset(pageable.offset)
            .fetch()

        val periods = findFinancialPeriods(records.mapNotNull { it.get(firstLaunchPeriod) })

        val content = records.map { record ->
            RecurringValue(
                value = record.get(values.VALUE)!!,
                reason = record.get(values.REASON),
                validFrom = record.get(values.VALID_FROM)!!,
                validFromPeriod = record.get(firstLaunchPeriod)?.let { periods[it] },
                current = record.get(values.ID) == currentValueId
            )
        }

        val total = dsl.fetchCount(RECURRING_VALUES, RECURRING_VALUES.ID_RECURRING_MOVEMENT.eq(recurringMovementId))

        return pagedModelOf(content, pageable, total.toLong())
    }

    fun findLaunches(recurringMovementId: Long, pageable: Pageable): PagedModel<RecurringLaunchEntry> {

        val launches = RECURRING_LAUNCHES.`as`("entry_launches")
        val launchedMovements = MOVEMENTS.`as`("entry_movements")
        val periods = FINANCIAL_PERIODS.`as`("entry_periods")
        val payments = PAYMENTS.`as`("entry_payments")

        val content = dsl.select(*launches.fields(), *launchedMovements.fields(), *periods.fields(), payments.VALUE_PAID)
            .from(launches)
            .join(launchedMovements).on(launchedMovements.ID.eq(launches.ID_MOVEMENT))
            .join(periods).on(periods.ID.eq(launches.ID_FINANCIAL_PERIOD))
            .leftJoin(payments).on(payments.ID_MOVEMENT.eq(launchedMovements.ID))
            .where(launches.ID_RECURRING_MOVEMENT.eq(recurringMovementId))
            .orderBy(periods.STARTING_AT.desc(), launches.ID.desc())
            .limit(pageable.pageSize)
            .offset(pageable.offset)
            .fetch { record ->
                RecurringLaunchEntry(
                    financialPeriod = record.into(periods).toFinancialPeriodReference(),
                    installment = record.get(launches.INSTALLMENT)!!,
                    movementId = record.get(launchedMovements.EXTERNAL_ID)!!,
                    value = record.get(launchedMovements.VALUE)!!,
                    status = Movement.Status.valueOf(record.get(launchedMovements.STATUS)!!),
                    valuePaid = record.get(payments.VALUE_PAID)
                )
            }

        val total = dsl.fetchCount(RECURRING_LAUNCHES, RECURRING_LAUNCHES.ID_RECURRING_MOVEMENT.eq(recurringMovementId))

        return pagedModelOf(content, pageable, total.toLong())
    }

    private fun findFinancialPeriods(ids: List<Long>): Map<Long, FinancialPeriodReference> {

        if (ids.isEmpty()) {
            return emptyMap()
        }

        return dsl.selectFrom(FINANCIAL_PERIODS)
            .where(FINANCIAL_PERIODS.ID.`in`(ids))
            .fetch()
            .associate { record -> record.id!! to record.toFinancialPeriodReference() }
    }

    fun insert(recurringMovement: RecurringMovement): RecurringMovement {

        val record = dsl.insertInto(RECURRING_MOVEMENTS)
            .set(RECURRING_MOVEMENTS.EXTERNAL_ID, UUID.randomUUID())
            .set(RECURRING_MOVEMENTS.VERSION, 0)
            .set(RECURRING_MOVEMENTS.CREATED_ON, LocalDateTime.now())
            .set(RECURRING_MOVEMENTS.NAME, recurringMovement.name)
            .set(RECURRING_MOVEMENTS.TYPE, recurringMovement.type.name)
            .set(RECURRING_MOVEMENTS.VALUE_KIND, recurringMovement.valueKind.name)
            .set(RECURRING_MOVEMENTS.INSTALLMENTS, recurringMovement.installments)
            .set(RECURRING_MOVEMENTS.FIRST_INSTALLMENT, recurringMovement.firstInstallment)
            .set(RECURRING_MOVEMENTS.AUTO_LAUNCH, recurringMovement.autoLaunch)
            .set(RECURRING_MOVEMENTS.ACTIVE, recurringMovement.active)
            .set(RECURRING_MOVEMENTS.ID_COST_CENTER, recurringMovement.costCenter.id)
            .set(RECURRING_MOVEMENTS.ID_CLASSIFICATION, recurringMovement.classification.id)
            .set(RECURRING_MOVEMENTS.ID_CARD, recurringMovement.card?.id)
            .returning()
            .fetchSingle()

        recurringMovement.restore(record.id, record.externalId, record.version, record.createdOn, record.lastUpdate)

        insertValue(record.id!!, recurringMovement.value, INITIAL_VALUE_REASON)

        return recurringMovement
    }

    fun update(recurringMovement: RecurringMovement): RecurringMovement {

        val record = dsl.update(RECURRING_MOVEMENTS)
            .set(RECURRING_MOVEMENTS.NAME, recurringMovement.name)
            .set(RECURRING_MOVEMENTS.INSTALLMENTS, recurringMovement.installments)
            .set(RECURRING_MOVEMENTS.AUTO_LAUNCH, recurringMovement.autoLaunch)
            .set(RECURRING_MOVEMENTS.ACTIVE, recurringMovement.active)
            .set(RECURRING_MOVEMENTS.ID_COST_CENTER, recurringMovement.costCenter.id)
            .set(RECURRING_MOVEMENTS.ID_CLASSIFICATION, recurringMovement.classification.id)
            .set(RECURRING_MOVEMENTS.ID_CARD, recurringMovement.card?.id)
            .set(RECURRING_MOVEMENTS.VERSION, RECURRING_MOVEMENTS.VERSION.plus(1))
            .set(RECURRING_MOVEMENTS.LAST_UPDATE, LocalDateTime.now())
            .where(RECURRING_MOVEMENTS.ID.eq(recurringMovement.id))
            .and(RECURRING_MOVEMENTS.VERSION.eq(recurringMovement.version))
            .returning()
            .fetchOne() ?: throw concurrentUpdate()

        recurringMovement.restore(record.id, record.externalId, record.version, record.createdOn, record.lastUpdate)
        return recurringMovement
    }

    fun insertValue(recurringMovementId: Long, value: BigDecimal, reason: String?) {

        val now = LocalDateTime.now()

        dsl.insertInto(RECURRING_VALUES)
            .set(RECURRING_VALUES.EXTERNAL_ID, UUID.randomUUID())
            .set(RECURRING_VALUES.VERSION, 0)
            .set(RECURRING_VALUES.CREATED_ON, now)
            .set(RECURRING_VALUES.ID_RECURRING_MOVEMENT, recurringMovementId)
            .set(RECURRING_VALUES.VALUE, value)
            .set(RECURRING_VALUES.REASON, reason)
            .set(RECURRING_VALUES.VALID_FROM, now)
            .execute()
    }

    fun delete(recurringMovement: RecurringMovement) {
        dsl.deleteFrom(RECURRING_MOVEMENTS)
            .where(RECURRING_MOVEMENTS.ID.eq(recurringMovement.id))
            .execute()
    }

    private fun ended(): Condition = recurringMovements.ACTIVE.isFalse.or(finishedCondition())

    private fun finishedCondition(): Condition = recurringMovements.INSTALLMENTS.isNotNull
        .and(DSL.coalesce(launchedInstallments, 0).ge(recurringMovements.INSTALLMENTS))

    private fun selectJoined(financialPeriod: UUID?) = dsl
        .select(
            *recurringMovements.fields(),
            *classifications.fields(),
            *costCenters.fields(),
            *cards.fields(),
            currentValue.`as`("current_value"),
            launchedInstallments.`as`("launched_installments"),
            lastPaidValue.`as`("last_paid_value"),
            launchedInPeriod(financialPeriod)
        )
        .from(recurringMovements)
        .join(classifications).on(classifications.ID.eq(recurringMovements.ID_CLASSIFICATION))
        .join(costCenters).on(costCenters.ID.eq(recurringMovements.ID_COST_CENTER))
        .leftJoin(cards).on(cards.ID.eq(recurringMovements.ID_CARD))

    private fun launchedInPeriod(financialPeriod: UUID?): Field<UUID?> {

        if (financialPeriod == null) {
            return DSL.inline(null as UUID?).`as`("launched_in_period")
        }

        val launches = RECURRING_LAUNCHES.`as`("period_launches")
        val launchedMovements = MOVEMENTS.`as`("launched_movements")
        val periods = FINANCIAL_PERIODS.`as`("launch_periods")

        return dsl.select(launchedMovements.EXTERNAL_ID)
            .from(launches)
            .join(launchedMovements).on(launchedMovements.ID.eq(launches.ID_MOVEMENT))
            .join(periods).on(periods.ID.eq(launches.ID_FINANCIAL_PERIOD))
            .where(launches.ID_RECURRING_MOVEMENT.eq(recurringMovements.ID))
            .and(periods.EXTERNAL_ID.eq(financialPeriod))
            .limit(1)
            .asField("launched_in_period")
    }

    private fun Record.toRecurringMovement(): RecurringMovement {

        val record = into(recurringMovements)

        return RecurringMovement(
            name = record.name!!,
            type = Movement.Type.valueOf(record.type!!),
            valueKind = RecurringMovement.ValueKind.valueOf(record.valueKind!!),
            value = get("current_value", BigDecimal::class.java)!!,
            installments = record.installments,
            firstInstallment = record.firstInstallment!!,
            autoLaunch = record.autoLaunch!!,
            active = record.active!!,
            classification = into(classifications).toClassificationReference(),
            costCenter = into(costCenters).toCostCenterReference(),
            card = into(cards).let { record -> record.id?.let { record.toCardReference() } },
            launchedInstallments = get("launched_installments", Int::class.javaObjectType),
            lastPaidValue = get("last_paid_value", BigDecimal::class.java),
            launchedInPeriod = get("launched_in_period", UUID::class.java)
        ).also { recurringMovement ->
            recurringMovement.restore(record.id, record.externalId, record.version, record.createdOn, record.lastUpdate)
        }
    }
}

private const val INITIAL_VALUE_REASON = "Valor inicial"

data class RecurringMovementCriteria(
    val text: String? = null,
    val type: Movement.Type? = null,
    val valueKinds: List<RecurringMovement.ValueKind>? = null,
    val active: Boolean? = null,
    val finished: Boolean? = null,
    val ended: Boolean? = null,
    val cards: List<UUID>? = null,
    val financialPeriod: UUID? = null
)
