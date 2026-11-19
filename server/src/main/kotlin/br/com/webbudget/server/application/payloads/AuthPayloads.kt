package br.com.webbudget.server.application.payloads

import br.com.webbudget.server.application.payloads.ErrorCodes.EMAIL_IS_INVALID
import br.com.webbudget.server.application.payloads.ErrorCodes.HAS_CONTROL_CHARACTERS
import br.com.webbudget.server.application.payloads.ErrorCodes.IS_NULL_OR_BLANK
import br.com.webbudget.server.application.payloads.ErrorCodes.MAX_CHARS
import br.com.webbudget.server.domain.entities.administration.Language
import br.com.webbudget.server.domain.entities.administration.TrustedDevice
import br.com.webbudget.server.domain.entities.administration.UserStatus
import br.com.webbudget.server.domain.security.CurrentUser
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size
import java.time.LocalDateTime
import java.util.UUID

data class LoginForm(
    @field:Email(message = EMAIL_IS_INVALID)
    @field:NotBlank(message = IS_NULL_OR_BLANK)
    @field:Size(max = MAX_EMAIL_LENGTH, message = MAX_CHARS)
    val email: String?,
    @field:NotBlank(message = IS_NULL_OR_BLANK)
    @field:Size(max = MAX_PASSWORD_LENGTH, message = MAX_CHARS)
    val password: String?,
    @field:Size(max = MAX_TOTP_CODE_LENGTH, message = MAX_CHARS)
    val totpCode: String? = null,
    val trustDevice: Boolean? = null
)

data class TotpEnrollForm(
    @field:Email(message = EMAIL_IS_INVALID)
    @field:NotBlank(message = IS_NULL_OR_BLANK)
    @field:Size(max = MAX_EMAIL_LENGTH, message = MAX_CHARS)
    val email: String?,
    @field:NotBlank(message = IS_NULL_OR_BLANK)
    @field:Size(max = MAX_PASSWORD_LENGTH, message = MAX_CHARS)
    val password: String?
)

data class TotpVerifyForm(
    @field:Email(message = EMAIL_IS_INVALID)
    @field:NotBlank(message = IS_NULL_OR_BLANK)
    @field:Size(max = MAX_EMAIL_LENGTH, message = MAX_CHARS)
    val email: String?,
    @field:NotBlank(message = IS_NULL_OR_BLANK)
    @field:Size(max = MAX_PASSWORD_LENGTH, message = MAX_CHARS)
    val password: String?,
    @field:NotBlank(message = IS_NULL_OR_BLANK)
    @field:Size(max = MAX_TOTP_CODE_LENGTH, message = MAX_CHARS)
    val code: String?
)

data class GoogleLinkForm(
    @field:NotBlank(message = IS_NULL_OR_BLANK)
    @field:Size(max = MAX_LINK_TOKEN_LENGTH, message = MAX_CHARS)
    val linkToken: String?,
    @field:NotBlank(message = IS_NULL_OR_BLANK)
    @field:Size(max = MAX_PASSWORD_LENGTH, message = MAX_CHARS)
    val password: String?,
    @field:Size(max = MAX_TOTP_CODE_LENGTH, message = MAX_CHARS)
    val totpCode: String? = null
)

data class AuthConfigView(
    val googleAuthEnabled: Boolean
)

data class LoginStepView(
    val status: String
) {

    companion object {
        val NEEDS_ENROLLMENT = LoginStepView("needs_enrollment")
        val NEEDS_TOTP = LoginStepView("needs_totp")
    }
}

data class TotpEnrollView(
    val secretKey: String,
    val qrCodeDataUri: String
)

data class TrustedDeviceView(
    val id: UUID,
    val label: String,
    val createdOn: LocalDateTime,
    val lastUsedOn: LocalDateTime,
    val expiresOn: LocalDateTime
) {

    companion object {

        fun from(device: TrustedDevice): TrustedDeviceView = TrustedDeviceView(
            id = device.externalId!!,
            label = device.label,
            createdOn = device.createdOn!!,
            lastUsedOn = device.lastUsedOn,
            expiresOn = device.expiresOn
        )
    }
}

data class RegisterForm(
    @field:NotBlank(message = IS_NULL_OR_BLANK)
    @field:Size(max = MAX_NAME_LENGTH, message = MAX_CHARS)
    @field:Pattern(regexp = "[^\\p{Cc}\\p{Zl}\\p{Zp}]*", message = HAS_CONTROL_CHARACTERS)
    val name: String?,
    @field:Email(message = EMAIL_IS_INVALID)
    @field:NotBlank(message = IS_NULL_OR_BLANK)
    @field:Size(max = MAX_EMAIL_LENGTH, message = MAX_CHARS)
    val email: String?,
    @field:NotBlank(message = IS_NULL_OR_BLANK)
    @field:MaxUtf8Bytes(max = MAX_REGISTRATION_PASSWORD_BYTES)
    val password: String?,
    val defaultLanguage: Language? = null
)

private const val MAX_NAME_LENGTH = 100
private const val MAX_EMAIL_LENGTH = 254
private const val MAX_PASSWORD_LENGTH = 128
private const val MAX_TOTP_CODE_LENGTH = 16
private const val MAX_LINK_TOKEN_LENGTH = 128
private const val MAX_REGISTRATION_PASSWORD_BYTES = 72

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
