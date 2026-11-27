package br.com.webbudget.server.application.payloads.administration

import br.com.webbudget.server.application.payloads.ErrorCodes.IS_NULL
import jakarta.validation.constraints.NotNull

data class InstanceSettingsForm(
    @field:NotNull(message = IS_NULL)
    val reserveMonths: Int?
)

data class InstanceSettingsView(
    val reserveMonths: Int
)
