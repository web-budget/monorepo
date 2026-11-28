package br.com.webbudget.server.infrastructure.repository.financial

import br.com.webbudget.server.domain.entities.financial.FinancialPeriodReference
import br.com.webbudget.server.domain.entities.financial.Invoice
import br.com.webbudget.server.domain.entities.financial.Overview
import br.com.webbudget.server.jooq.financial.tables.references.CARD_PURCHASES
import br.com.webbudget.server.jooq.financial.tables.references.INVOICES
import br.com.webbudget.server.jooq.financial.tables.references.PERIOD_FLOW
import br.com.webbudget.server.jooq.registration.tables.references.FINANCIAL_PERIODS
import org.jooq.Condition
import org.jooq.DSLContext
import org.jooq.DatePart
import org.jooq.Field
import org.jooq.impl.DSL
import org.springframework.stereotype.Repository
import java.math.BigDecimal
import java.time.LocalDate

@Repository
class PeriodFlowRepository(
    private val dsl: DSLContext
) {

    private val periodFlow = PERIOD_FLOW.`as`("period_flow")
    private val financialPeriods = FINANCIAL_PERIODS.`as`("financial_periods")

    private val endingYear = DSL.extract(periodFlow.ENDING_AT, DatePart.YEAR)
    private val hasMovement = periodFlow.REVENUES.ne(BigDecimal.ZERO).or(periodFlow.EXPENSES.ne(BigDecimal.ZERO))

    fun findYears(): List<Int> = dsl.selectDistinct(endingYear)
        .from(periodFlow)
        .orderBy(endingYear)
        .fetch { record -> record.value1()!! }

    fun findPeriods(year: Int?): List<Overview.PeriodFlow> = dsl.select()
        .from(periodFlow)
        .join(financialPeriods).on(financialPeriods.ID.eq(periodFlow.ID_FINANCIAL_PERIOD))
        .where(inYear(year))
        .orderBy(periodFlow.ENDING_AT, periodFlow.STARTING_AT)
        .fetch { record ->
            val flow = record.into(periodFlow)
            Overview.PeriodFlow(
                financialPeriod = record.into(financialPeriods).toFinancialPeriodReference(),
                revenues = flow.revenues!!,
                expenses = flow.expenses!!,
                result = flow.result!!,
                recorded = flow.recorded!!
            )
        }

    fun sumTotals(year: Int?): Overview.Totals {

        val withMovement = DSL.count().filterWhere(hasMovement)
        val inTheRed = DSL.count().filterWhere(hasMovement.and(periodFlow.RESULT.lt(BigDecimal.ZERO)))

        val record = dsl.select(DSL.sum(periodFlow.REVENUES), DSL.sum(periodFlow.EXPENSES), inTheRed, withMovement)
            .from(periodFlow)
            .where(inYear(year))
            .fetchSingle()

        return Overview.Totals(
            revenues = record.value1() ?: BigDecimal.ZERO,
            expenses = record.value2() ?: BigDecimal.ZERO,
            redPeriods = record.value3(),
            periodsWithMovement = record.value4(),
            cardToPay = sumCardToPay(year)
        )
    }

    fun sumByYear(): List<Overview.YearResult> {

        val hasOpenPeriod = DSL.boolOr(periodFlow.STATUS.eq(FinancialPeriodReference.Status.OPEN.name))

        return dsl.select(endingYear, DSL.sum(periodFlow.REVENUES), DSL.sum(periodFlow.EXPENSES), hasOpenPeriod)
            .from(periodFlow)
            .groupBy(endingYear)
            .having(DSL.count().filterWhere(hasMovement).gt(0))
            .orderBy(endingYear)
            .fetch { record ->
                Overview.YearResult(
                    year = record.value1()!!,
                    revenues = record.value2() ?: BigDecimal.ZERO,
                    expenses = record.value3() ?: BigDecimal.ZERO,
                    provisional = record.value4() ?: false
                )
            }
    }

    private fun sumCardToPay(year: Int?): BigDecimal = dsl.select(DSL.sum(CARD_PURCHASES.VALUE))
        .from(CARD_PURCHASES)
        .join(INVOICES).on(INVOICES.ID.eq(CARD_PURCHASES.ID_INVOICE))
        .join(financialPeriods).on(financialPeriods.ID.eq(INVOICES.ID_FINANCIAL_PERIOD))
        .where(INVOICES.STATUS.ne(Invoice.Status.PAID.name).and(inYear(year, financialPeriods.ENDING_AT)))
        .fetchSingle()
        .value1() ?: BigDecimal.ZERO

    private fun inYear(year: Int?, endingAt: Field<LocalDate?> = periodFlow.ENDING_AT): Condition = year
        ?.let { endingAt.between(LocalDate.of(it, 1, 1), LocalDate.of(it, 12, 31)) }
        ?: DSL.noCondition()
}
