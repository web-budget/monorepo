package br.com.webbudget.server.application.payloads.registration

import br.com.webbudget.server.application.payloads.ErrorCodes.IS_NULL
import br.com.webbudget.server.application.payloads.ErrorCodes.IS_NULL_OR_BLANK
import br.com.webbudget.server.application.payloads.ErrorCodes.MAX_CHARS
import br.com.webbudget.server.application.payloads.StatusFilter
import br.com.webbudget.server.domain.entities.registration.Wallet.Type
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Size
import java.math.BigDecimal
import java.time.LocalDateTime
import java.util.UUID

data class WalletCreateForm(
    @field:NotBlank(message = IS_NULL_OR_BLANK)
    @field:Size(message = MAX_CHARS, max = 150)
    val name: String?,
    @field:NotNull(message = IS_NULL)
    var type: Type?,
    val description: String? = null,
    val bank: String? = null,
    val agency: String? = null,
    val number: String? = null
)

data class WalletUpdateForm(
    @field:NotBlank(message = IS_NULL_OR_BLANK)
    @field:Size(message = MAX_CHARS, max = 150)
    val name: String?,
    @field:NotNull(message = IS_NULL)
    var active: Boolean?,
    val description: String? = null,
    @field:Size(message = MAX_CHARS, max = 150)
    val bank: String? = null,
    @field:Size(message = MAX_CHARS, max = 10)
    val agency: String? = null,
    @field:Size(message = MAX_CHARS, max = 16)
    val number: String? = null
)

data class WalletView(
    val id: UUID,
    val name: String,
    val type: Type,
    val currentBalance: BigDecimal,
    val active: Boolean = true,
    val description: String? = null,
    val bank: String? = null,
    val number: String? = null,
    val agency: String? = null,
    val lastEntryOn: LocalDateTime? = null
)

data class WalletListView(
    val id: UUID,
    val name: String,
    val type: Type,
    val currentBalance: BigDecimal,
    val bank: String? = null,
    val agency: String? = null,
    val number: String? = null,
    val active: Boolean = true,
    val lastEntryOn: LocalDateTime? = null
)

data class WalletFilter(
    val filter: String?,
    val status: StatusFilter?
)
