package br.com.webbudget.server.application.payloads.financial

import com.fasterxml.jackson.annotation.JsonInclude
import java.math.BigDecimal

data class OverviewTotalsView(
    val revenues: BigDecimal,
    val expenses: BigDecimal,
    val result: BigDecimal,
    @field:JsonInclude(JsonInclude.Include.ALWAYS)
    val savingsRate: BigDecimal?,
    val redPeriods: Int,
    val periodsWithMovement: Int
)

data class OverviewYearResultView(
    val year: Int,
    val revenues: BigDecimal,
    val expenses: BigDecimal,
    val result: BigDecimal,
    @field:JsonInclude(JsonInclude.Include.ALWAYS)
    val savingsRate: BigDecimal?,
    val provisional: Boolean
)

data class OverviewPeriodView(
    val financialPeriod: ClosingPeriodView,
    val revenues: BigDecimal,
    val expenses: BigDecimal,
    val result: BigDecimal,
    val recorded: Boolean
)

data class OverviewView(
    val cut: String,
    val years: List<Int>,
    val totals: OverviewTotalsView,
    val resultByYear: List<OverviewYearResultView>,
    val periods: List<OverviewPeriodView>
)
