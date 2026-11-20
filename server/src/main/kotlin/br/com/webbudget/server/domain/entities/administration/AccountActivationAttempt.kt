package br.com.webbudget.server.domain.entities.administration

import br.com.webbudget.server.domain.entities.PersistentEntity
import java.time.LocalDateTime
import java.util.UUID

class AccountActivationAttempt(
    var token: UUID,
    val user: User,
    var activatedOn: LocalDateTime? = null,
    var validity: LocalDateTime = LocalDateTime.now().plusDays(VALIDITY_DAYS)
) : PersistentEntity() {

    companion object {
        const val VALIDITY_DAYS = 5L
    }
}
