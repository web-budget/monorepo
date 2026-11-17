package br.com.webbudget.server.infrastructure.repository.administration

import br.com.webbudget.server.domain.entities.administration.Grant
import br.com.webbudget.server.domain.entities.administration.Language
import br.com.webbudget.server.domain.entities.administration.Role
import br.com.webbudget.server.domain.entities.administration.User
import br.com.webbudget.server.jooq.administration.tables.records.GrantsRecord
import br.com.webbudget.server.jooq.administration.tables.records.RolesRecord
import br.com.webbudget.server.jooq.administration.tables.records.UsersRecord

internal fun UsersRecord.toUser(grants: List<Grant> = emptyList()): User = User(
    active = active!!,
    name = name!!,
    email = email!!,
    password = password!!,
    defaultLanguage = Language.valueOf(defaultLanguage!!),
    grants = grants.toMutableList()
).also { user -> user.restore(id, externalId, version, createdOn, lastUpdate) }

internal fun RolesRecord.toRole(): Role = Role(name!!)
    .also { role -> role.restore(id, externalId, version, createdOn, lastUpdate) }

internal fun GrantsRecord.toGrant(role: Role): Grant = Grant(role)
    .also { grant -> grant.restore(id, externalId, version, createdOn, lastUpdate) }
