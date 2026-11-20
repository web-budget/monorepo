package br.com.webbudget.server.application.payloads

import br.com.webbudget.server.application.payloads.ErrorCodes.EMAIL_IS_INVALID
import br.com.webbudget.server.application.payloads.ErrorCodes.IS_NULL
import br.com.webbudget.server.application.payloads.ErrorCodes.IS_NULL_OR_BLANK
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import java.util.UUID

data class ActivateAccountForm(
    @field:NotNull(message = IS_NULL)
    val token: UUID?,
    @field:Email(message = EMAIL_IS_INVALID)
    @field:NotBlank(message = IS_NULL_OR_BLANK)
    val email: String?
)

data class ForgotPasswordForm(
    @field:Email(message = EMAIL_IS_INVALID)
    @field:NotBlank(message = IS_NULL_OR_BLANK)
    val email: String?
)

data class RecoverPasswordForm(
    @field:NotNull(message = IS_NULL)
    val token: UUID?,
    @field:Email(message = EMAIL_IS_INVALID)
    @field:NotBlank(message = IS_NULL_OR_BLANK)
    val email: String?,
    @field:NotBlank(message = IS_NULL_OR_BLANK)
    val password: String?
)
