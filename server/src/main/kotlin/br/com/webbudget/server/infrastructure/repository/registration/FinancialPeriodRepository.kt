package br.com.webbudget.server.infrastructure.repository.registration

import br.com.webbudget.server.domain.entities.registration.FinancialPeriod
import br.com.webbudget.server.domain.entities.registration.FinancialPeriod.Status
import br.com.webbudget.server.infrastructure.repository.concurrentUpdate
import br.com.webbudget.server.infrastructure.repository.pagedModelOf
import br.com.webbudget.server.infrastructure.repository.toOrderBy
import br.com.webbudget.server.jooq.registration.tables.FinancialPeriods
import br.com.webbudget.server.jooq.registration.tables.references.FINANCIAL_PERIODS
import org.jooq.Condition
import org.jooq.DSLContext
import org.jooq.impl.DSL
import org.springframework.data.domain.Pageable
import org.springframework.data.web.PagedModel
import org.springframework.stereotype.Repository
import java.time.LocalDate
import java.time.LocalDateTime
import java.util.UUID

@Repository
class FinancialPeriodRepository(
    private val dsl: DSLContext
) {

    fun findByExternalId(externalId: UUID): FinancialPeriod? {
        val financialPeriods = FINANCIAL_PERIODS.`as`("financial_periods")
        return dsl.selectFrom(financialPeriods)
            .where(financialPeriods.EXTERNAL_ID.eq(externalId))
            .fetchOne { record -> record.toFinancialPeriod() }
    }

    fun findAll(filter: String?, statuses: Collection<Status>, pageable: Pageable): PagedModel<FinancialPeriod> =
        page(pageable) { financialPeriods ->
            allOf(
                listOfNotNull(
                    filter?.let { text -> containsIgnoreCase(financialPeriods.NAME, text) },
                    financialPeriods.STATUS.`in`(statuses.map { it.name })
                )
            )
        }

    fun findByStatus(status: Status, pageable: Pageable): PagedModel<FinancialPeriod> =
        page(pageable) { financialPeriods -> financialPeriods.STATUS.eq(status.name) }

    fun existsByName(name: String): Boolean = dsl.fetchExists(
        dsl.selectOne().from(FINANCIAL_PERIODS).where(FINANCIAL_PERIODS.NAME.equalIgnoreCase(name))
    )

    fun existsByNameAndExternalIdNot(name: String, externalId: UUID): Boolean = dsl.fetchExists(
        dsl.selectOne().from(FINANCIAL_PERIODS)
            .where(FINANCIAL_PERIODS.NAME.equalIgnoreCase(name))
            .and(FINANCIAL_PERIODS.EXTERNAL_ID.ne(externalId))
    )

    fun existsOpenBetween(startingAt: LocalDate, endingAt: LocalDate): Boolean = dsl.fetchExists(
        dsl.selectOne().from(FINANCIAL_PERIODS)
            .where(openStatus().and(contains(startingAt)).or(contains(endingAt)))
    )

    fun existsOpenBetweenAndExternalIdNot(startingAt: LocalDate, endingAt: LocalDate, externalId: UUID): Boolean =
        dsl.fetchExists(
            dsl.selectOne().from(FINANCIAL_PERIODS)
                .where(openStatus())
                .and(contains(startingAt).or(contains(endingAt)))
                .and(FINANCIAL_PERIODS.EXTERNAL_ID.ne(externalId))
        )

    fun existsByExternalIdAndStatusIn(externalId: UUID, statuses: Collection<Status>): Boolean = dsl.fetchExists(
        dsl.selectOne().from(FINANCIAL_PERIODS)
            .where(FINANCIAL_PERIODS.EXTERNAL_ID.eq(externalId))
            .and(FINANCIAL_PERIODS.STATUS.`in`(statuses.map { it.name }))
    )

    fun insert(financialPeriod: FinancialPeriod): FinancialPeriod {
        val record = dsl.insertInto(FINANCIAL_PERIODS)
            .set(FINANCIAL_PERIODS.EXTERNAL_ID, UUID.randomUUID())
            .set(FINANCIAL_PERIODS.VERSION, 0)
            .set(FINANCIAL_PERIODS.CREATED_ON, LocalDateTime.now())
            .set(FINANCIAL_PERIODS.NAME, financialPeriod.name)
            .set(FINANCIAL_PERIODS.STARTING_AT, financialPeriod.startingAt)
            .set(FINANCIAL_PERIODS.ENDING_AT, financialPeriod.endingAt)
            .set(FINANCIAL_PERIODS.STATUS, financialPeriod.status.name)
            .set(FINANCIAL_PERIODS.EXPENSES_GOAL, financialPeriod.expensesGoal)
            .set(FINANCIAL_PERIODS.REVENUES_GOAL, financialPeriod.revenuesGoal)
            .returning()
            .fetchSingle()

        financialPeriod.restore(record.id, record.externalId, record.version, record.createdOn, record.lastUpdate)
        return financialPeriod
    }

    fun update(financialPeriod: FinancialPeriod): FinancialPeriod {
        val record = dsl.update(FINANCIAL_PERIODS)
            .set(FINANCIAL_PERIODS.NAME, financialPeriod.name)
            .set(FINANCIAL_PERIODS.STARTING_AT, financialPeriod.startingAt)
            .set(FINANCIAL_PERIODS.ENDING_AT, financialPeriod.endingAt)
            .set(FINANCIAL_PERIODS.STATUS, financialPeriod.status.name)
            .set(FINANCIAL_PERIODS.EXPENSES_GOAL, financialPeriod.expensesGoal)
            .set(FINANCIAL_PERIODS.REVENUES_GOAL, financialPeriod.revenuesGoal)
            .set(FINANCIAL_PERIODS.VERSION, FINANCIAL_PERIODS.VERSION.plus(1))
            .set(FINANCIAL_PERIODS.LAST_UPDATE, LocalDateTime.now())
            .where(FINANCIAL_PERIODS.ID.eq(financialPeriod.id))
            .and(FINANCIAL_PERIODS.VERSION.eq(financialPeriod.version))
            .returning()
            .fetchOne() ?: throw concurrentUpdate()

        financialPeriod.restore(record.id, record.externalId, record.version, record.createdOn, record.lastUpdate)
        return financialPeriod
    }

    fun delete(financialPeriod: FinancialPeriod) {
        dsl.deleteFrom(FINANCIAL_PERIODS)
            .where(FINANCIAL_PERIODS.ID.eq(financialPeriod.id))
            .execute()
    }

    private fun page(pageable: Pageable, condition: (FinancialPeriods) -> Condition): PagedModel<FinancialPeriod> {

        val financialPeriods = FINANCIAL_PERIODS.`as`("financial_periods")
        val filter = condition(financialPeriods)

        val sortable = mapOf(
            "name" to financialPeriods.NAME,
            "startingAt" to financialPeriods.STARTING_AT,
            "endingAt" to financialPeriods.ENDING_AT,
            "status" to financialPeriods.STATUS,
            "expensesGoal" to financialPeriods.EXPENSES_GOAL,
            "revenuesGoal" to financialPeriods.REVENUES_GOAL,
            "createdOn" to financialPeriods.CREATED_ON
        )

        val content = dsl.selectFrom(financialPeriods)
            .where(filter)
            .orderBy(pageable.toOrderBy(sortable, financialPeriods.CREATED_ON, financialPeriods.ID))
            .limit(pageable.pageSize)
            .offset(pageable.offset)
            .fetch { record -> record.toFinancialPeriod() }

        val total = dsl.fetchCount(financialPeriods, filter)

        return pagedModelOf(content, pageable, total.toLong())
    }

    private fun openStatus(): Condition = FINANCIAL_PERIODS.STATUS.`in`(Status.ACTIVE.name, Status.ENDED.name)

    private fun contains(date: LocalDate): Condition =
        DSL.value(date).between(FINANCIAL_PERIODS.STARTING_AT, FINANCIAL_PERIODS.ENDING_AT)
}
