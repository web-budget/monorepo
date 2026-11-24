package br.com.webbudget.server.infrastructure.repository.financial

import br.com.webbudget.server.domain.entities.financial.PeriodResult
import br.com.webbudget.server.infrastructure.repository.pagedModelOf
import br.com.webbudget.server.infrastructure.repository.toOrderBy
import br.com.webbudget.server.jooq.financial.tables.references.PERIOD_RESULTS
import br.com.webbudget.server.jooq.registration.tables.references.FINANCIAL_PERIODS
import org.jooq.DSLContext
import org.jooq.Record
import org.jooq.impl.DSL
import org.springframework.data.domain.Pageable
import org.springframework.data.web.PagedModel
import org.springframework.stereotype.Repository
import java.math.BigDecimal
import java.time.LocalDate
import java.time.LocalDateTime
import java.util.UUID

@Repository
class PeriodResultRepository(
    private val dsl: DSLContext
) {

    private val periodResults = PERIOD_RESULTS.`as`("period_results")
    private val financialPeriods = FINANCIAL_PERIODS.`as`("financial_periods")

    fun findByFinancialPeriod(financialPeriodId: Long): PeriodResult? = dsl.select()
        .from(periodResults)
        .join(financialPeriods).on(financialPeriods.ID.eq(periodResults.ID_FINANCIAL_PERIOD))
        .where(periodResults.ID_FINANCIAL_PERIOD.eq(financialPeriodId))
        .fetchOne()
        ?.toPeriodResult()

    fun findAll(criteria: PeriodResultCriteria, pageable: Pageable): PagedModel<PeriodResult> {

        val condition = DSL.and(
            listOfNotNull(
                criteria.from?.let { financialPeriods.ENDING_AT.ge(it) },
                criteria.to?.let { financialPeriods.ENDING_AT.le(it) },
                criteria.text?.let { financialPeriods.NAME.containsIgnoreCase(it) }
            )
        )

        val sortable = mapOf(
            "name" to financialPeriods.NAME,
            "startingAt" to financialPeriods.STARTING_AT,
            "endingAt" to financialPeriods.ENDING_AT,
            "result" to periodResults.RESULT,
            "createdOn" to periodResults.CREATED_ON
        )

        val content = dsl.select()
            .from(periodResults)
            .join(financialPeriods).on(financialPeriods.ID.eq(periodResults.ID_FINANCIAL_PERIOD))
            .where(condition)
            .orderBy(pageable.toOrderBy(sortable, periodResults.CREATED_ON, periodResults.ID))
            .limit(pageable.pageSize)
            .offset(pageable.offset)
            .fetch()
            .map { record -> record.toPeriodResult() }

        val total = dsl.fetchCount(
            dsl.selectOne().from(periodResults)
                .join(financialPeriods).on(financialPeriods.ID.eq(periodResults.ID_FINANCIAL_PERIOD))
                .where(condition)
        )

        return pagedModelOf(content, pageable, total.toLong())
    }

    fun sumRecorded(): BigDecimal = dsl.select(DSL.sum(PERIOD_RESULTS.RESULT))
        .from(PERIOD_RESULTS)
        .fetchSingle()
        .value1() ?: BigDecimal.ZERO

    fun insert(periodResult: PeriodResult): PeriodResult {
        val record = dsl.insertInto(PERIOD_RESULTS)
            .set(PERIOD_RESULTS.EXTERNAL_ID, UUID.randomUUID())
            .set(PERIOD_RESULTS.VERSION, 0)
            .set(PERIOD_RESULTS.CREATED_ON, LocalDateTime.now())
            .set(PERIOD_RESULTS.ID_FINANCIAL_PERIOD, periodResult.financialPeriod.id)
            .set(PERIOD_RESULTS.REVENUES, periodResult.revenues)
            .set(PERIOD_RESULTS.EXPENSES, periodResult.expenses)
            .set(PERIOD_RESULTS.RESULT, periodResult.result)
            .returning()
            .fetchSingle()

        periodResult.restore(record.id, record.externalId, record.version, record.createdOn, record.lastUpdate)
        return periodResult
    }

    fun deleteByFinancialPeriod(financialPeriodId: Long) {
        dsl.deleteFrom(PERIOD_RESULTS)
            .where(PERIOD_RESULTS.ID_FINANCIAL_PERIOD.eq(financialPeriodId))
            .execute()
    }

    private fun Record.toPeriodResult(): PeriodResult {

        val resultRecord = into(periodResults)

        return PeriodResult(
            financialPeriod = into(financialPeriods).toFinancialPeriodReference(),
            revenues = resultRecord.revenues!!,
            expenses = resultRecord.expenses!!
        ).also { periodResult ->
            periodResult.restore(
                resultRecord.id,
                resultRecord.externalId,
                resultRecord.version,
                resultRecord.createdOn,
                resultRecord.lastUpdate
            )
        }
    }
}

data class PeriodResultCriteria(
    val from: LocalDate? = null,
    val to: LocalDate? = null,
    val text: String? = null
)
