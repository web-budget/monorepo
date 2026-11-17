package br.com.webbudget.server.application.payloads

import br.com.webbudget.server.application.payloads.ErrorCodes.EMAIL_IS_INVALID
import br.com.webbudget.server.application.payloads.ErrorCodes.IS_NULL_OR_BLANK
import br.com.webbudget.server.domain.entities.administration.UserStatus
import br.com.webbudget.server.domain.security.CurrentUser
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank

data class LoginForm(
    @field:Email(message = EMAIL_IS_INVALID)
    @field:NotBlank(message = IS_NULL_OR_BLANK)
    val email: String?,
    @field:NotBlank(message = IS_NULL_OR_BLANK)
    val password: String?
)

data class SessionView(
    val name: String,
    val email: String,
    val status: UserStatus,
    val roles: List<String>
) {

    companion object {

        fun from(user: CurrentUser): SessionView = SessionView(
            name = user.name,
            email = user.email,
            status = user.status,
            roles = user.roles.sorted()
        )
    }
}
