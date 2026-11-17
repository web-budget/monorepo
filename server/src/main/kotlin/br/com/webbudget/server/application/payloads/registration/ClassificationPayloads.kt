package br.com.webbudget.server.application.payloads.registration

import br.com.webbudget.server.application.payloads.ErrorCodes.IS_NULL
import br.com.webbudget.server.application.payloads.ErrorCodes.IS_NULL_OR_BLANK
import br.com.webbudget.server.application.payloads.ErrorCodes.MAX_CHARS
import br.com.webbudget.server.application.payloads.StatusFilter
import br.com.webbudget.server.domain.entities.registration.Classification
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Size
import java.math.BigDecimal
import java.util.UUID

data class ClassificationCreateForm(
    @field:NotBlank(message = IS_NULL_OR_BLANK)
    @field:Size(message = MAX_CHARS, max = 150)
    val name: String?,
    @field:NotNull(message = IS_NULL)
    var type: Classification.Type?,
    val budget: BigDecimal? = null,
    val description: String? = null
)

data class ClassificationUpdateForm(
    @field:NotBlank(message = IS_NULL_OR_BLANK)
    @field:Size(message = MAX_CHARS, max = 150)
    val name: String?,
    val budget: BigDecimal? = null,
    val description: String? = null,
    @field:NotNull(message = IS_NULL)
    var active: Boolean?
)

data class ClassificationView(
    val id: UUID,
    val name: String,
    val type: String,
    val active: Boolean,
    val budget: BigDecimal? = null,
    val description: String? = null
)

data class ClassificationListView(
    val id: UUID,
    val name: String,
    val type: String,
    val active: Boolean,
    val budget: BigDecimal? = null
)

data class ClassificationFilter(
    val filter: String? = null,
    val status: StatusFilter? = null
)
