package br.com.webbudget.server.domain.entities.financial

import java.math.BigDecimal
import java.math.RoundingMode
import java.util.UUID

class Overview(
    val years: List<Int>,
    val totals: Totals,
    val resultByYear: List<YearResult>,
    val periods: List<PeriodFlow>,
    val accumulated: BigDecimal,
    val costOfLiving: CostOfLiving,
    val reserve: Reserve,
    val reliability: Reliability
) {

    class Totals(
        val revenues: BigDecimal,
        val expenses: BigDecimal,
        val redPeriods: Int,
        val periodsWithMovement: Int,
        val cardToPay: BigDecimal
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

    class CostOfLiving(
        val value: BigDecimal?,
        val basedOn: Int
    )

    class Reserve(
        val current: BigDecimal,
        val months: Int,
        val ideal: BigDecimal?
    )

    class Adjustments(
        val count: Int,
        val credited: BigDecimal,
        val debited: BigDecimal
    )

    class GenericClassification(
        val id: UUID,
        val name: String
    )

    class Generic(
        val value: BigDecimal,
        val total: BigDecimal,
        val classifications: List<GenericClassification>
    )

    class Reliability(
        val accumulated: BigDecimal,
        val balancesTotal: BigDecimal,
        val walletCount: Int,
        val adjustmentsTotal: BigDecimal,
        val adjustments: Adjustments,
        val generic: Generic
    ) {

        val difference: BigDecimal
            get() = balancesTotal.subtract(accumulated)

        val residue: BigDecimal
            get() = difference.subtract(adjustmentsTotal)
    }

    companion object {

        private const val RATE_SCALE = 4

        private fun savingsRate(result: BigDecimal, revenues: BigDecimal): BigDecimal? =
            if (revenues.signum() == 0) null else result.divide(revenues, RATE_SCALE, RoundingMode.HALF_UP)
    }
}
