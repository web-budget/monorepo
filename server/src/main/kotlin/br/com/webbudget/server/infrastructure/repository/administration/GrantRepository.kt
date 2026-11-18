package br.com.webbudget.server.infrastructure.repository.administration

import br.com.webbudget.server.domain.entities.administration.Grant
import br.com.webbudget.server.domain.entities.administration.Role
import br.com.webbudget.server.jooq.administration.tables.references.GRANTS
import br.com.webbudget.server.jooq.administration.tables.references.ROLES
import org.jooq.DSLContext
import org.springframework.stereotype.Repository
import java.time.LocalDateTime
import java.util.UUID

@Repository
class GrantRepository(
    private val dsl: DSLContext
) {

    fun findByUserIds(userIds: Collection<Long>): Map<Long, List<Grant>> {

        if (userIds.isEmpty()) {
            return emptyMap()
        }

        val grants = GRANTS.`as`("grants")
        val roles = ROLES.`as`("roles")

        return dsl.select()
            .from(grants)
            .join(roles).on(roles.ID.eq(grants.ID_ROLE))
            .where(grants.ID_USER.`in`(userIds))
            .orderBy(roles.NAME)
            .fetch()
            .groupBy(
                { record -> record.get(grants.ID_USER)!! },
                { record -> record.into(grants).toGrant(record.into(roles).toRole()) }
            )
    }

    fun insert(userId: Long, role: Role): Grant {
        val record = dsl.insertInto(GRANTS)
            .set(GRANTS.EXTERNAL_ID, UUID.randomUUID())
            .set(GRANTS.VERSION, 0)
            .set(GRANTS.CREATED_ON, LocalDateTime.now())
            .set(GRANTS.ID_USER, userId)
            .set(GRANTS.ID_ROLE, role.id)
            .returning()
            .fetchSingle()

        return record.toGrant(role)
    }

    fun deleteByUserId(userId: Long) {
        dsl.deleteFrom(GRANTS)
            .where(GRANTS.ID_USER.eq(userId))
            .execute()
    }
}
