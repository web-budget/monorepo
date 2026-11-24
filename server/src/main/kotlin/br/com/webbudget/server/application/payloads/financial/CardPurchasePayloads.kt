package br.com.webbudget.server.application.payloads.financial

import br.com.webbudget.server.application.payloads.ErrorCodes.IS_NOT_POSITIVE
import br.com.webbudget.server.application.payloads.ErrorCodes.IS_NULL
import br.com.webbudget.server.application.payloads.ErrorCodes.IS_NULL_OR_BLANK
import br.com.webbudget.server.application.payloads.ErrorCodes.MAX_CHARS
import br.com.webbudget.server.domain.entities.financial.Invoice
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Positive
import jakarta.validation.constraints.Size
import org.springframework.format.annotation.DateTimeFormat
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

data class CardPurchaseCreateForm(
    @field:Size(message = MAX_CHARS, max = 150)
    @field:NotBlank(message = IS_NULL_OR_BLANK)
    val name: String?,
    val purchasedOn: LocalDate?,
    @field:NotNull(message = IS_NULL)
    @field:Positive(message = IS_NOT_POSITIVE)
    val value: BigDecimal?,
    @field:NotNull(message = IS_NULL)
    val card: UUID?,
    @field:NotNull(message = IS_NULL)
    val financialPeriod: UUID?,
    @field:NotNull(message = IS_NULL)
    val classification: UUID?,
    @field:NotNull(message = IS_NULL)
    val costCenter: UUID?
)

data class CardPurchaseUpdateForm(
    @field:Size(message = MAX_CHARS, max = 150)
    @field:NotBlank(message = IS_NULL_OR_BLANK)
    val name: String?,
    val purchasedOn: LocalDate?,
    @field:NotNull(message = IS_NULL)
    @field:Positive(message = IS_NOT_POSITIVE)
    val value: BigDecimal?,
    @field:NotNull(message = IS_NULL)
    val classification: UUID?,
    @field:NotNull(message = IS_NULL)
    val costCenter: UUID?
)

data class InvoiceSummaryView(
    val id: UUID,
    val status: String
)

data class PurchaseRecurringView(
    val id: UUID,
    val name: String,
    val installment: Int,
    val installments: Int?
)

data class CardPurchaseView(
    val id: UUID,
    val name: String,
    val purchasedOn: LocalDate,
    val value: BigDecimal,
    val card: PaymentCardView,
    val invoice: InvoiceSummaryView,
    val financialPeriod: MovementFinancialPeriodView,
    val classification: MovementClassificationView,
    val costCenter: MovementCostCenterView,
    val movement: UUID?,
    val recurringMovement: PurchaseRecurringView? = null
)

data class CardPurchaseListView(
    val id: UUID,
    val name: String,
    val purchasedOn: LocalDate,
    val value: BigDecimal,
    val card: PaymentCardView,
    val invoice: InvoiceSummaryView,
    val recurringMovement: PurchaseRecurringView? = null
)

data class CardPurchaseFilter(
    val filter: String? = null,
    val card: UUID? = null,
    val invoice: UUID? = null,
    val financialPeriod: UUID? = null,
    val costCenter: UUID? = null,
    val classification: UUID? = null,
    @param:DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    val from: LocalDate? = null,
    @param:DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    val to: LocalDate? = null
)

data class InvoiceView(
    val id: UUID,
    val status: String,
    val value: BigDecimal,
    val card: PaymentCardView,
    val financialPeriod: MovementFinancialPeriodView
)

data class InvoiceFilter(
    val card: UUID? = null,
    val financialPeriod: UUID? = null,
    val statuses: List<Invoice.Status>? = null
)
