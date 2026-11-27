package br.com.webbudget.server.application.payloads.registration

import br.com.webbudget.server.application.payloads.ErrorCodes.IS_NULL
import br.com.webbudget.server.application.payloads.ErrorCodes.IS_NULL_OR_BLANK
import br.com.webbudget.server.application.payloads.ErrorCodes.MAX_CHARS
import br.com.webbudget.server.domain.entities.registration.Compartment.Type
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Size
import org.springframework.format.annotation.DateTimeFormat
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

data class CompartmentCreateForm(
    @field:NotBlank(message = IS_NULL_OR_BLANK)
    @field:Size(message = MAX_CHARS, max = 150)
    val name: String?,
    @field:NotNull(message = IS_NULL)
    val type: Type?,
    @field:Size(message = MAX_CHARS, max = 150)
    val description: String? = null,
    val targetValue: BigDecimal? = null,
    @param:DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    val targetDate: LocalDate? = null
)

data class CompartmentUpdateForm(
    @field:NotBlank(message = IS_NULL_OR_BLANK)
    @field:Size(message = MAX_CHARS, max = 150)
    val name: String?,
    @field:Size(message = MAX_CHARS, max = 150)
    val description: String? = null,
    val targetValue: BigDecimal? = null,
    @param:DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    val targetDate: LocalDate? = null
)

data class CompartmentView(
    val id: UUID,
    val name: String,
    val type: Type,
    val balance: BigDecimal,
    val statementEntryCount: Int,
    val achieved: Boolean,
    val overdue: Boolean,
    val description: String? = null,
    val targetValue: BigDecimal? = null,
    val targetDate: LocalDate? = null,
    val progress: BigDecimal? = null,
    val monthlyAmount: BigDecimal? = null
)
