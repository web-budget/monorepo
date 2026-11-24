package br.com.webbudget.server.application.payloads.financial

import br.com.webbudget.server.application.payloads.ErrorCodes.IS_NEGATIVE
import br.com.webbudget.server.application.payloads.ErrorCodes.IS_NOT_POSITIVE
import br.com.webbudget.server.application.payloads.ErrorCodes.IS_NULL
import br.com.webbudget.server.application.payloads.ErrorCodes.IS_NULL_OR_BLANK
import br.com.webbudget.server.application.payloads.ErrorCodes.MAX_CHARS
import br.com.webbudget.server.domain.entities.financial.Movement
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Positive
import jakarta.validation.constraints.PositiveOrZero
import jakarta.validation.constraints.Size
import org.springframework.format.annotation.DateTimeFormat
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

data class PaymentForm(
    val wallet: UUID?,
    val card: UUID?,
    val paidOn: LocalDate?,
    @field:PositiveOrZero(message = IS_NEGATIVE)
    val discount: BigDecimal?
)

data class MovementCreateForm(
    @field:Size(message = MAX_CHARS, max = 150)
    @field:NotBlank(message = IS_NULL_OR_BLANK)
    val name: String?,
    @field:NotNull(message = IS_NULL)
    val type: Movement.Type?,
    @field:NotNull(message = IS_NULL)
    @field:Positive(message = IS_NOT_POSITIVE)
    val value: BigDecimal?,
    val dueDate: LocalDate?,
    @field:NotNull(message = IS_NULL)
    val financialPeriod: UUID?,
    @field:NotNull(message = IS_NULL)
    val classification: UUID?,
    @field:NotNull(message = IS_NULL)
    val costCenter: UUID?,
    val description: String?,
    @field:Valid
    val payment: PaymentForm?
)

data class MovementUpdateForm(
    @field:Size(message = MAX_CHARS, max = 150)
    @field:NotBlank(message = IS_NULL_OR_BLANK)
    val name: String?,
    @field:NotNull(message = IS_NULL)
    @field:Positive(message = IS_NOT_POSITIVE)
    val value: BigDecimal?,
    val dueDate: LocalDate?,
    @field:NotNull(message = IS_NULL)
    val classification: UUID?,
    @field:NotNull(message = IS_NULL)
    val costCenter: UUID?,
    val description: String?
)

data class MovementClassificationView(
    val id: UUID,
    val name: String,
    val type: String
)

data class MovementCostCenterView(
    val id: UUID,
    val name: String,
    val fullName: String
)

data class MovementFinancialPeriodView(
    val id: UUID,
    val name: String,
    val status: String,
    val expired: Boolean
)

data class PaymentWalletView(
    val id: UUID,
    val name: String
)

data class PaymentCardView(
    val id: UUID,
    val name: String,
    val lastFourDigits: String
)

data class PaymentView(
    val paidOn: LocalDate,
    val value: BigDecimal,
    val discount: BigDecimal,
    val valuePaid: BigDecimal,
    val wallet: PaymentWalletView?,
    val card: PaymentCardView?
)

data class MovementInvoiceView(
    val id: UUID,
    val status: String,
    val card: PaymentCardView
)

data class MovementView(
    val id: UUID,
    val name: String,
    val type: String,
    val value: BigDecimal,
    val dueDate: LocalDate,
    val status: String,
    val overdue: Boolean,
    val classification: MovementClassificationView?,
    val costCenter: MovementCostCenterView?,
    val financialPeriod: MovementFinancialPeriodView,
    val description: String? = null,
    val payment: PaymentView? = null,
    val invoice: MovementInvoiceView? = null,
    val recurringMovement: MovementRecurringView? = null
)

data class MovementListView(
    val id: UUID,
    val name: String,
    val type: String,
    val value: BigDecimal,
    val dueDate: LocalDate,
    val status: String,
    val overdue: Boolean,
    val financialPeriod: MovementFinancialPeriodView
)

data class MovementFilter(
    val filter: String? = null,
    val type: Movement.Type? = null,
    val statuses: List<Movement.Status>? = null,
    val overdue: Boolean? = null,
    val classification: UUID? = null,
    val costCenter: UUID? = null,
    val financialPeriods: List<UUID>? = null,
    @param:DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    val dueFrom: LocalDate? = null,
    @param:DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    val dueTo: LocalDate? = null,
    val invoicePayments: Boolean? = null
)

data class FinancialPeriodResultView(
    val revenues: BigDecimal,
    val expenses: BigDecimal,
    val result: BigDecimal
)

data class MovementRecurringView(
    val id: UUID,
    val name: String,
    val card: PaymentCardView?
)
