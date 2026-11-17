package br.com.webbudget.server.application.payloads.registration

import br.com.webbudget.server.application.payloads.ErrorCodes.IS_NULL
import br.com.webbudget.server.application.payloads.ErrorCodes.IS_NULL_OR_BLANK
import br.com.webbudget.server.domain.entities.registration.FinancialPeriod.Status
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

data class FinancialPeriodCreateForm(
    @field:NotBlank(message = IS_NULL_OR_BLANK)
    val name: String?,
    @field:NotNull(message = IS_NULL)
    var startingAt: LocalDate?,
    @field:NotNull(message = IS_NULL)
    var endingAt: LocalDate?,
    val revenuesGoal: BigDecimal?,
    val expensesGoal: BigDecimal?
)

data class FinancialPeriodUpdateForm(
    @field:NotBlank(message = IS_NULL_OR_BLANK)
    val name: String?,
    val revenuesGoal: BigDecimal?,
    val expensesGoal: BigDecimal?
)

data class FinancialPeriodView(
    val id: UUID,
    val name: String,
    val startingAt: LocalDate,
    val endingAt: LocalDate,
    val status: String,
    val revenuesGoal: BigDecimal?,
    val expensesGoal: BigDecimal?
)

data class FinancialPeriodListView(
    val id: UUID,
    val name: String,
    val startingAt: LocalDate,
    val endingAt: LocalDate,
    val status: String
)

enum class FinancialPeriodStatusFilter(val statuses: List<Status>) {
    OPEN(listOf(Status.ACTIVE, Status.ENDED)),
    ALL(Status.entries),
    ACCOUNTED(listOf(Status.ACCOUNTED))
}

data class FinancialPeriodFilter(
    val filter: String?,
    val status: FinancialPeriodStatusFilter?
)
