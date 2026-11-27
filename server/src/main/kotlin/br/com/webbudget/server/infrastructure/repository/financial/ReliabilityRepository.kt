package br.com.webbudget.server.infrastructure.repository.financial

import br.com.webbudget.server.domain.entities.financial.Movement
import br.com.webbudget.server.domain.entities.financial.Overview
import br.com.webbudget.server.domain.entities.financial.WalletEntry
import br.com.webbudget.server.jooq.financial.tables.references.REPORT_LINES
import br.com.webbudget.server.jooq.financial.tables.references.WALLET_ENTRIES
import br.com.webbudget.server.jooq.registration.tables.references.CLASSIFICATIONS
import br.com.webbudget.server.jooq.registration.tables.references.FINANCIAL_PERIODS
import br.com.webbudget.server.jooq.registration.tables.references.WALLET_TOTALS
import org.jooq.Condition
import org.jooq.DSLContext
import org.jooq.DatePart
import org.jooq.impl.DSL
import org.springframework.stereotype.Repository
import java.math.BigDecimal
import java.math.RoundingMode

@Repository
class ReliabilityRepository(
    private val dsl: DSLContext
) {

    class WalletBalances(val total: BigDecimal, val count: Int)

    private val lines = REPORT_LINES.`as`("report_lines")
    private val periods = FINANCIAL_PERIODS.`as`("financial_periods")
    private val classifications = CLASSIFICATIONS.`as`("classifications")
    private val entries = WALLET_ENTRIES.`as`("wallet_entries")
    private val walletTotals = WALLET_TOTALS.`as`("wallet_totals")

    private val endingYear = DSL.extract(periods.ENDING_AT, DatePart.YEAR)
    private val adjustmentYear = DSL.extract(entries.CREATED_ON, DatePart.YEAR)
    private val isAdjustment = entries.ORIGIN.eq(WalletEntry.Origin.ADJUSTMENT.name)
    private val isCredit = entries.DIRECTION.eq(WalletEntry.Direction.CREDIT.name)
    private val isDebit = entries.DIRECTION.eq(WalletEntry.Direction.DEBIT.name)

    fun sumWalletTotals(): WalletBalances {

        val record = dsl.select(DSL.coalesce(DSL.sum(walletTotals.TOTAL_BALANCE), BigDecimal.ZERO), DSL.count())
            .from(walletTotals)
            .fetchSingle()

        return WalletBalances(record.value1(), record.value2())
    }

    fun sumAdjustmentsNet(): BigDecimal {

        val credited = DSL.coalesce(DSL.sum(entries.VALUE).filterWhere(isCredit), BigDecimal.ZERO)
        val debited = DSL.coalesce(DSL.sum(entries.VALUE).filterWhere(isDebit), BigDecimal.ZERO)

        val record = dsl.select(credited, debited)
            .from(entries)
            .where(isAdjustment)
            .fetchSingle()

        return record.value1().subtract(record.value2())
    }

    fun sumAdjustments(year: Int?): Overview.Adjustments {

        val credited = DSL.coalesce(DSL.sum(entries.VALUE).filterWhere(isCredit), BigDecimal.ZERO)
        val debited = DSL.coalesce(DSL.sum(entries.VALUE).filterWhere(isDebit), BigDecimal.ZERO)

        val record = dsl.select(DSL.count(), credited, debited)
            .from(entries)
            .where(isAdjustment.and(year?.let { adjustmentYear.eq(it) } ?: DSL.noCondition()))
            .fetchSingle()

        return Overview.Adjustments(record.value1(), record.value2(), record.value3())
    }

    fun medianExpenseOfClosedPeriods(): Overview.CostOfLiving {

        val window = dsl.select(periods.ID)
            .from(periods)
            .where(periods.STATUS.eq(CLOSED))
            .orderBy(periods.ENDING_AT.desc(), periods.ID.desc())
            .limit(COST_OF_LIVING_WINDOW)
            .fetch { record -> record.value1()!! }

        if (window.isEmpty()) {
            return Overview.CostOfLiving(null, 0)
        }

        val expenses = dsl.select(DSL.coalesce(DSL.sum(lines.VALUE), BigDecimal.ZERO))
            .from(periods)
            .leftJoin(lines).on(lines.ID_FINANCIAL_PERIOD.eq(periods.ID).and(lines.TYPE.eq(Movement.Type.EXPENSE.name)))
            .where(periods.ID.`in`(window))
            .groupBy(periods.ID)
            .fetch { record -> record.value1() }
            .sorted()

        val middle = expenses.size / 2
        val median = if (expenses.size % 2 == 1) {
            expenses[middle]
        } else {
            expenses[middle - 1].add(expenses[middle]).divide(TWO, MONEY_SCALE, RoundingMode.HALF_UP)
        }

        return Overview.CostOfLiving(median.setScale(MONEY_SCALE, RoundingMode.HALF_UP), expenses.size)
    }

    fun sumExpenses(year: Int?): BigDecimal = dsl.select(DSL.coalesce(DSL.sum(lines.VALUE), BigDecimal.ZERO))
        .from(lines)
        .join(periods).on(periods.ID.eq(lines.ID_FINANCIAL_PERIOD))
        .where(lines.TYPE.eq(Movement.Type.EXPENSE.name).and(inYear(year)))
        .fetchSingle()
        .value1()

    fun sumGenericExpenses(year: Int?): BigDecimal = dsl.select(DSL.coalesce(DSL.sum(lines.VALUE), BigDecimal.ZERO))
        .from(lines)
        .join(periods).on(periods.ID.eq(lines.ID_FINANCIAL_PERIOD))
        .join(classifications).on(classifications.ID.eq(lines.ID_CLASSIFICATION))
        .where(lines.TYPE.eq(Movement.Type.EXPENSE.name).and(classifications.GENERIC.isTrue).and(inYear(year)))
        .fetchSingle()
        .value1()

    fun findGenericClassifications(): List<Overview.GenericClassification> = dsl
        .select(classifications.EXTERNAL_ID, classifications.NAME)
        .from(classifications)
        .where(classifications.GENERIC.isTrue)
        .orderBy(classifications.NAME, classifications.ID)
        .fetch { record -> Overview.GenericClassification(record.value1()!!, record.value2()!!) }

    private fun inYear(year: Int?): Condition = year?.let { endingYear.eq(it) } ?: DSL.noCondition()

    companion object {
        private const val CLOSED = "CLOSED"
        private const val COST_OF_LIVING_WINDOW = 12
        private const val MONEY_SCALE = 2
        private val TWO = BigDecimal.valueOf(2)
    }
}
