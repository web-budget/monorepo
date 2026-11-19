package br.com.webbudget.server.application.payloads.administration

import br.com.webbudget.server.application.payloads.ErrorCodes.EMAIL_IS_INVALID
import br.com.webbudget.server.application.payloads.ErrorCodes.IS_EMPTY
import br.com.webbudget.server.application.payloads.ErrorCodes.IS_NULL
import br.com.webbudget.server.application.payloads.ErrorCodes.IS_NULL_OR_BLANK
import br.com.webbudget.server.application.payloads.StatusFilter
import br.com.webbudget.server.domain.entities.administration.Language
import br.com.webbudget.server.domain.entities.administration.UserStatus
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotEmpty
import jakarta.validation.constraints.NotNull
import java.util.UUID

data class UserCreateForm(
    @field:NotBlank(message = IS_NULL_OR_BLANK)
    val name: String?,
    @field:Email(message = EMAIL_IS_INVALID)
    @field:NotBlank(message = IS_NULL_OR_BLANK)
    val email: String?,
    @field:NotBlank(message = IS_NULL_OR_BLANK)
    val password: String?,
    @field:NotNull(message = IS_NULL)
    var defaultLanguage: Language?,
    @field:NotEmpty(message = IS_EMPTY)
    val roles: List<String>,
    val sendActivationEmail: Boolean = false
)

data class UserUpdateForm(
    val active: Boolean,
    @field:NotBlank(message = IS_NULL_OR_BLANK)
    var name: String?,
    @field:NotNull(message = IS_NULL)
    var defaultLanguage: Language?,
    @field:NotEmpty(message = IS_EMPTY)
    var roles: List<String>?
)

data class UserApproveForm(
    val roles: List<String?>?
)

data class PasswordChangeForm(
    @field:NotNull(message = IS_NULL)
    val temporary: Boolean,
    @field:NotBlank(message = IS_NULL_OR_BLANK)
    val password: String
)

data class UserView(
    val id: UUID,
    val active: Boolean,
    val name: String,
    val email: String,
    val defaultLanguage: Language,
    val authorities: List<String>,
    val status: UserStatus,
    val totpEnabled: Boolean
)

data class UserFilter(
    val filter: String?,
    val status: StatusFilter?,
    val userStatus: UserStatus?
)
