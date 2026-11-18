package br.com.webbudget.server.domain.entities.administration

import br.com.webbudget.server.domain.entities.PersistentEntity
import java.time.LocalDateTime
import java.util.UUID

class PasswordRecoverAttempt(
    var token: UUID,
    val user: User,
    var used: Boolean = false,
    var validity: LocalDateTime = LocalDateTime.now().plusHours(VALIDITY_TIME_LIMIT_HOURS)
) : PersistentEntity() {

    companion object {
        private const val VALIDITY_TIME_LIMIT_HOURS = 3L
    }
}
