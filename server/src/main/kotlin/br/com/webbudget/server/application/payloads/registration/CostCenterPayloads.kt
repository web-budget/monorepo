package br.com.webbudget.server.application.payloads.registration

import br.com.webbudget.server.application.payloads.ErrorCodes.IS_ABOVE_MAX
import br.com.webbudget.server.application.payloads.ErrorCodes.IS_NOT_POSITIVE
import br.com.webbudget.server.application.payloads.ErrorCodes.IS_NULL
import br.com.webbudget.server.application.payloads.ErrorCodes.IS_NULL_OR_BLANK
import br.com.webbudget.server.application.payloads.ErrorCodes.MAX_CHARS
import br.com.webbudget.server.application.payloads.ErrorCodes.MAX_DECIMALS
import br.com.webbudget.server.application.payloads.StatusFilter
import jakarta.validation.constraints.DecimalMax
import jakarta.validation.constraints.Digits
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Positive
import jakarta.validation.constraints.Size
import java.math.BigDecimal
import java.util.UUID

data class CostCenterCreateForm(
    @field:NotBlank(message = IS_NULL_OR_BLANK)
    @field:Size(message = MAX_CHARS, max = 150)
    val name: String?,
    val description: String? = null,
    @field:Positive(message = IS_NOT_POSITIVE)
    @field:DecimalMax(value = "100", message = IS_ABOVE_MAX)
    @field:Digits(integer = 10, fraction = 2, message = MAX_DECIMALS)
    val expenseBudgetPercentage: BigDecimal? = null,
    val parentCostCenter: UUID? = null
)

data class CostCenterUpdateForm(
    @field:NotBlank(message = IS_NULL_OR_BLANK)
    @field:Size(message = MAX_CHARS, max = 150)
    val name: String?,
    @field:NotNull(message = IS_NULL)
    var active: Boolean?,
    val description: String?,
    @field:Positive(message = IS_NOT_POSITIVE)
    @field:DecimalMax(value = "100", message = IS_ABOVE_MAX)
    @field:Digits(integer = 10, fraction = 2, message = MAX_DECIMALS)
    val expenseBudgetPercentage: BigDecimal? = null,
    val parentCostCenter: UUID? = null
)

data class CostCenterView(
    val id: UUID,
    val name: String,
    val active: Boolean,
    val description: String? = null,
    val expenseBudgetPercentage: BigDecimal? = null,
    val parentCostCenter: CostCenterListView? = null
)

data class CostCenterListView(
    val id: UUID,
    val name: String,
    val fullName: String,
    val active: Boolean,
    val expenseBudgetPercentage: BigDecimal? = null
)

data class CostCenterFilter(
    val filter: String?,
    val status: StatusFilter?
)
