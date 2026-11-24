package br.com.webbudget.server.application.payloads.registration

import br.com.webbudget.server.application.payloads.ErrorCodes.IS_NULL
import br.com.webbudget.server.application.payloads.ErrorCodes.IS_NULL_OR_BLANK
import br.com.webbudget.server.application.payloads.ErrorCodes.MAX_CHARS
import br.com.webbudget.server.application.payloads.StatusFilter
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Size
import java.util.UUID

data class CardCreateForm(
    @field:NotBlank(message = IS_NULL_OR_BLANK)
    @field:Size(message = MAX_CHARS, max = 150)
    val name: String?,
    @field:NotBlank(message = IS_NULL_OR_BLANK)
    @field:Size(message = MAX_CHARS, max = 4)
    val lastFourDigits: String?,
    val invoicePaymentDay: Int?,
    val wallet: UUID?,
    val flag: String?
)

data class CardUpdateForm(
    @field:NotBlank(message = IS_NULL_OR_BLANK)
    @field:Size(message = MAX_CHARS, max = 150)
    val name: String?,
    @field:NotBlank(message = IS_NULL_OR_BLANK)
    @field:Size(message = MAX_CHARS, max = 4)
    val lastFourDigits: String?,
    val invoicePaymentDay: Int?,
    val wallet: UUID?,
    val flag: String?,
    @field:NotNull(message = IS_NULL)
    var active: Boolean?
)

data class CardView(
    val id: UUID,
    val name: String,
    val lastFourDigits: String,
    val invoicePaymentDay: Int?,
    val active: Boolean,
    val flag: String? = null,
    val wallet: WalletListView? = null
)

data class CardListView(
    val id: UUID,
    val name: String,
    val lastFourDigits: String,
    val invoicePaymentDay: Int?,
    val active: Boolean,
    val flag: String? = null,
    val wallet: WalletListView? = null
)

data class CardFilter(
    val filter: String?,
    val status: StatusFilter?
)
