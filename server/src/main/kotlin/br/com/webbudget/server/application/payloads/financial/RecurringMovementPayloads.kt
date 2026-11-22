package br.com.webbudget.server.application.payloads.financial

import br.com.webbudget.server.application.payloads.ErrorCodes.IS_EMPTY
import br.com.webbudget.server.application.payloads.ErrorCodes.IS_NOT_POSITIVE
import br.com.webbudget.server.application.payloads.ErrorCodes.IS_NULL
import br.com.webbudget.server.application.payloads.ErrorCodes.IS_NULL_OR_BLANK
import br.com.webbudget.server.application.payloads.ErrorCodes.MAX_CHARS
import br.com.webbudget.server.domain.entities.financial.Movement
import br.com.webbudget.server.domain.entities.financial.RecurringMovement
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotEmpty
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Positive
import jakarta.validation.constraints.Size
import java.math.BigDecimal
import java.time.LocalDateTime
import java.util.UUID

data class RecurringMovementCreateForm(
    @field:Size(message = MAX_CHARS, max = 150)
    @field:NotBlank(message = IS_NULL_OR_BLANK)
    val name: String?,
    @field:NotNull(message = IS_NULL)
    val type: Movement.Type?,
    @field:NotNull(message = IS_NULL)
    val valueKind: RecurringMovement.ValueKind?,
    @field:NotNull(message = IS_NULL)
    @field:Positive(message = IS_NOT_POSITIVE)
    val value: BigDecimal?,
    @field:Positive(message = IS_NOT_POSITIVE)
    val installments: Int?,
    @field:Positive(message = IS_NOT_POSITIVE)
    val firstInstallment: Int?,
    val autoLaunch: Boolean?,
    @field:NotNull(message = IS_NULL)
    val classification: UUID?,
    @field:NotNull(message = IS_NULL)
    val costCenter: UUID?
)

data class RecurringMovementUpdateForm(
    @field:Size(message = MAX_CHARS, max = 150)
    @field:NotBlank(message = IS_NULL_OR_BLANK)
    val name: String?,
    @field:NotNull(message = IS_NULL)
    val active: Boolean?,
    @field:Positive(message = IS_NOT_POSITIVE)
    val installments: Int?,
    val autoLaunch: Boolean?,
    @field:NotNull(message = IS_NULL)
    val classification: UUID?,
    @field:NotNull(message = IS_NULL)
    val costCenter: UUID?
)

data class RecurringValueForm(
    @field:NotNull(message = IS_NULL)
    @field:Positive(message = IS_NOT_POSITIVE)
    val value: BigDecimal?,
    @field:Size(message = MAX_CHARS, max = 150)
    val reason: String?
)

data class RecurringLaunchItemForm(
    @field:NotNull(message = IS_NULL)
    val id: UUID?,
    @field:Positive(message = IS_NOT_POSITIVE)
    val value: BigDecimal?
)

data class RecurringLaunchForm(
    @field:NotNull(message = IS_NULL)
    val financialPeriod: UUID?,
    @field:NotEmpty(message = IS_EMPTY)
    @field:Valid
    val recurringMovements: List<RecurringLaunchItemForm>?
)

data class RecurringMovementFilter(
    val filter: String? = null,
    val type: Movement.Type? = null,
    val valueKinds: List<RecurringMovement.ValueKind>? = null,
    val active: Boolean? = null,
    val finished: Boolean? = null,
    val financialPeriod: UUID? = null
)

data class RecurringMovementView(
    val id: UUID,
    val name: String,
    val type: String,
    val valueKind: String,
    val value: BigDecimal,
    val suggestedValue: BigDecimal,
    val installments: Int?,
    val firstInstallment: Int,
    val launchedInstallments: Int?,
    val nextInstallment: Int?,
    val finished: Boolean,
    val autoLaunch: Boolean,
    val active: Boolean,
    val classification: MovementClassificationView,
    val costCenter: MovementCostCenterView,
    val launchedInPeriod: UUID?,
    val createdOn: LocalDateTime
)

data class RecurringValueView(
    val value: BigDecimal,
    val reason: String?,
    val validFrom: LocalDateTime
)

data class RecurringLaunchedView(
    val recurringMovement: UUID,
    val installment: Int,
    val movement: MovementListView
)

data class RecurringSkippedView(
    val recurringMovement: UUID,
    val name: String,
    val reason: String
)

data class RecurringLaunchView(
    val launched: List<RecurringLaunchedView>,
    val skipped: List<RecurringSkippedView>
)
