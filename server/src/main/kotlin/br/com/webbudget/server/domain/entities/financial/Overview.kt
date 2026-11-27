package br.com.webbudget.server.domain.entities.financial

import java.math.BigDecimal
import java.math.RoundingMode

class Overview(
    val years: List<Int>,
    val totals: Totals,
    val resultByYear: List<YearResult>,
    val periods: List<PeriodFlow>
) {

    class Totals(
        val revenues: BigDecimal,
        val expenses: BigDecimal,
        val redPeriods: Int,
        val periodsWithMovement: Int
    ) {

        val result: BigDecimal
            get() = revenues.subtract(expenses)

        val savingsRate: BigDecimal?
            get() = savingsRate(result, revenues)
    }

    class YearResult(
        val year: Int,
        val revenues: BigDecimal,
        val expenses: BigDecimal,
        val provisional: Boolean
    ) {

        val result: BigDecimal
            get() = revenues.subtract(expenses)

        val savingsRate: BigDecimal?
            get() = savingsRate(result, revenues)
    }

    class PeriodFlow(
        val financialPeriod: FinancialPeriodReference,
        val revenues: BigDecimal,
        val expenses: BigDecimal,
        val result: BigDecimal,
        val recorded: Boolean
    )

    companion object {

        private const val RATE_SCALE = 4

        private fun savingsRate(result: BigDecimal, revenues: BigDecimal): BigDecimal? =
            if (revenues.signum() == 0) null else result.divide(revenues, RATE_SCALE, RoundingMode.HALF_UP)
    }
}
