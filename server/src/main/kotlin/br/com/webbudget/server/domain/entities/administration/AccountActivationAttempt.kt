package br.com.webbudget.server.domain.entities.administration

import br.com.webbudget.server.domain.entities.PersistentEntity
import java.time.LocalDateTime
import java.util.UUID

class AccountActivationAttempt(
    var token: UUID,
    val user: User,
    var activatedOn: LocalDateTime? = null,
    var validity: LocalDateTime = LocalDateTime.now().plusDays(VALIDITY_TIME_LIMIT_DAYS)
) : PersistentEntity() {

    companion object {
        private const val VALIDITY_TIME_LIMIT_DAYS = 5L
    }
}
