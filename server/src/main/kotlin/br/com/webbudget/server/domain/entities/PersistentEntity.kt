package br.com.webbudget.server.domain.entities

import java.time.LocalDateTime
import java.util.UUID

abstract class PersistentEntity {

    var id: Long? = null
    var externalId: UUID? = null
    var version: Short? = null
    var createdOn: LocalDateTime? = null
    var lastUpdate: LocalDateTime? = null

    fun restore(
        id: Long?,
        externalId: UUID?,
        version: Short?,
        createdOn: LocalDateTime?,
        lastUpdate: LocalDateTime?
    ) {
        this.id = id
        this.externalId = externalId
        this.version = version
        this.createdOn = createdOn
        this.lastUpdate = lastUpdate
    }

    fun isSaved(): Boolean = id != null
}
