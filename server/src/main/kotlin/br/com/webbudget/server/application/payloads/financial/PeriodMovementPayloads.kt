package br.com.webbudget.server.application.payloads.financial

import br.com.webbudget.server.application.payloads.ErrorCodes.IS_NULL
import br.com.webbudget.server.application.payloads.ErrorCodes.IS_NULL_OR_BLANK
import br.com.webbudget.server.application.payloads.ErrorCodes.MAX_CHARS
import br.com.webbudget.server.domain.entities.financial.PeriodMovement
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Size
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

data class PeriodMovementCreateForm(
    @field:Size(message = MAX_CHARS, max = 150)
    @field:NotBlank(message = IS_NULL_OR_BLANK)
    val name: String?,
    @field:NotNull(message = IS_NULL)
    val dueDate: LocalDate?,
    @field:NotNull(message = IS_NULL)
    val value: BigDecimal?,
    @field:NotNull(message = IS_NULL)
    val financialPeriod: UUID?,
    @field:NotNull(message = IS_NULL)
    val classification: UUID?,
    @field:NotNull(message = IS_NULL)
    val costCenter: UUID?,
    val description: String?
)

data class PeriodMovementUpdateForm(
    @field:Size(message = MAX_CHARS, max = 150)
    @field:NotBlank(message = IS_NULL_OR_BLANK)
    val name: String? = null,
    @field:NotNull(message = IS_NULL)
    val dueDate: LocalDate? = null,
    @field:NotNull(message = IS_NULL)
    val value: BigDecimal? = null,
    @field:NotNull(message = IS_NULL)
    val financialPeriod: UUID? = null,
    @field:NotNull(message = IS_NULL)
    val classification: UUID? = null,
    @field:NotNull(message = IS_NULL)
    val costCenter: UUID? = null,
    val description: String? = null
)

data class PeriodMovementView(
    val id: UUID,
    val name: String,
    val dueDate: LocalDate,
    val value: BigDecimal,
    val state: String,
    val classification: MovementClassificationView,
    val costCenter: MovementCostCenterView,
    val financialPeriod: MovementFinancialPeriodView,
    val quoteNumber: Int? = null,
    val description: String? = null
)

data class PeriodMovementListView(
    val id: UUID,
    val name: String,
    val dueDate: LocalDate,
    val value: BigDecimal,
    val state: String,
    val financialPeriod: MovementFinancialPeriodView
)

data class PeriodMovementFilter(
    val filter: String? = null,
    val states: List<PeriodMovement.State>? = null,
    val costCenter: UUID? = null,
    val classification: UUID? = null,
    val financialPeriods: List<UUID>? = null
)
