package br.com.webbudget.server.infrastructure.repository.financial

import br.com.webbudget.server.domain.entities.financial.PeriodResult
import br.com.webbudget.server.jooq.financial.tables.references.PERIOD_RESULTS
import br.com.webbudget.server.jooq.registration.tables.references.FINANCIAL_PERIODS
import org.jooq.DSLContext
import org.springframework.stereotype.Repository
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
        ?.let { record ->
            val resultRecord = record.into(periodResults)
            PeriodResult(
                financialPeriod = record.into(financialPeriods).toFinancialPeriodReference(),
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
}
