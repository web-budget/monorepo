package br.com.webbudget.server.application.payloads.financial

import org.springframework.format.annotation.DateTimeFormat
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

data class PeriodResultFilter(
    @param:DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    val from: LocalDate? = null,
    @param:DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    val to: LocalDate? = null,
    val filter: String? = null
)

data class PeriodResultView(
    val id: UUID,
    val name: String,
    val financialPeriod: ClosingPeriodView,
    val revenues: BigDecimal,
    val expenses: BigDecimal,
    val result: BigDecimal
)

data class ProvisionalResultView(
    val financialPeriod: ClosingPeriodView,
    val result: BigDecimal
)

data class AccumulatedView(
    val recorded: BigDecimal,
    val provisional: BigDecimal,
    val accumulated: BigDecimal,
    val provisionalPeriods: List<ProvisionalResultView>
)
