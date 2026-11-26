package br.com.webbudget.server.domain.entities.administration

import java.time.LocalDateTime

data class InitialSetupChoice(
    val option: InitialSetupOption,
    val chosenBy: Long,
    val chosenOn: LocalDateTime
)

enum class InitialSetupOption {
    USE_TEMPLATE, START_EMPTY
}
