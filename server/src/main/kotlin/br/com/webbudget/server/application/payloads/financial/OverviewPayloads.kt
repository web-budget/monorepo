package br.com.webbudget.server.application.payloads.financial

import com.fasterxml.jackson.annotation.JsonInclude
import java.math.BigDecimal
import java.util.UUID

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
    val periods: List<OverviewPeriodView>,
    val accumulated: BigDecimal,
    val costOfLiving: OverviewCostOfLivingView,
    val reserve: OverviewReserveView,
    val reliability: OverviewReliabilityView
)

data class OverviewCostOfLivingView(
    @field:JsonInclude(JsonInclude.Include.ALWAYS)
    val value: BigDecimal?,
    val basedOn: Int
)

data class OverviewReserveView(
    val current: BigDecimal,
    val months: Int,
    @field:JsonInclude(JsonInclude.Include.ALWAYS)
    val ideal: BigDecimal?
)

data class OverviewAdjustmentsView(
    val count: Int,
    val credited: BigDecimal,
    val debited: BigDecimal
)

data class OverviewGenericClassificationView(
    val id: UUID,
    val name: String
)

data class OverviewGenericView(
    val value: BigDecimal,
    val total: BigDecimal,
    val classifications: List<OverviewGenericClassificationView>
)

data class OverviewReliabilityView(
    val accumulated: BigDecimal,
    val balancesTotal: BigDecimal,
    val walletCount: Int,
    val difference: BigDecimal,
    val adjustmentsTotal: BigDecimal,
    val residue: BigDecimal,
    val adjustments: OverviewAdjustmentsView,
    val generic: OverviewGenericView
)
