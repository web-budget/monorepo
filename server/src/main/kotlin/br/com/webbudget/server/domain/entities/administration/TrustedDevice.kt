package br.com.webbudget.server.domain.entities.administration

import br.com.webbudget.server.domain.entities.PersistentEntity
import java.time.LocalDateTime

class TrustedDevice(
    val label: String,
    val lastUsedOn: LocalDateTime,
    val expiresOn: LocalDateTime
) : PersistentEntity()
