package br.com.webbudget.server.application.payloads.administration

import br.com.webbudget.server.application.payloads.ErrorCodes.EMAIL_IS_INVALID
import br.com.webbudget.server.application.payloads.ErrorCodes.IS_NULL
import br.com.webbudget.server.application.payloads.ErrorCodes.IS_NULL_OR_BLANK
import br.com.webbudget.server.application.payloads.ErrorCodes.IS_OUT_OF_RANGE
import br.com.webbudget.server.application.payloads.ErrorCodes.MAX_CHARS
import br.com.webbudget.server.application.payloads.MAX_EMAIL_LENGTH
import br.com.webbudget.server.application.payloads.UntrimmedStringDeserializer
import br.com.webbudget.server.domain.entities.administration.MailSecurity
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Size
import tools.jackson.databind.annotation.JsonDeserialize
import java.time.LocalDateTime

data class MailSettingsForm(
    @field:NotBlank(message = IS_NULL_OR_BLANK)
    @field:Size(max = MAX_HOST_LENGTH, message = MAX_CHARS)
    val host: String?,
    @field:NotNull(message = IS_NULL)
    @field:Min(value = MIN_PORT, message = IS_OUT_OF_RANGE)
    @field:Max(value = MAX_PORT, message = IS_OUT_OF_RANGE)
    val port: Int?,
    @field:NotNull(message = IS_NULL)
    val security: MailSecurity?,
    @field:Size(max = MAX_USERNAME_LENGTH, message = MAX_CHARS)
    val username: String?,
    @field:JsonDeserialize(using = UntrimmedStringDeserializer::class)
    val password: String?,
    @field:Email(message = EMAIL_IS_INVALID)
    @field:NotBlank(message = IS_NULL_OR_BLANK)
    @field:Size(max = MAX_EMAIL_LENGTH, message = MAX_CHARS)
    val fromAddress: String?,
    @field:Size(max = MAX_FROM_NAME_LENGTH, message = MAX_CHARS)
    val fromName: String?,
    @field:Email(message = EMAIL_IS_INVALID)
    @field:Size(max = MAX_EMAIL_LENGTH, message = MAX_CHARS)
    val replyToAddress: String?
) {

    override fun toString(): String =
        "MailSettingsForm(host=$host, port=$port, security=$security, username=$username, password=***, " +
            "fromAddress=$fromAddress, fromName=$fromName, replyToAddress=$replyToAddress)"
}

data class MailEnabledForm(
    @field:NotNull(message = IS_NULL)
    val enabled: Boolean?
)

data class MailSettingsView(
    val enabled: Boolean,
    val configured: Boolean,
    val host: String?,
    val port: Int?,
    val security: MailSecurity,
    val username: String?,
    val passwordSet: Boolean,
    val passwordStorageAvailable: Boolean,
    val fromAddress: String?,
    val fromName: String?,
    val replyToAddress: String?,
    val lastUpdate: LocalDateTime?
)

private const val MAX_HOST_LENGTH = 255
private const val MAX_USERNAME_LENGTH = 255
private const val MAX_FROM_NAME_LENGTH = 90
private const val MIN_PORT = 1L
private const val MAX_PORT = 65535L
