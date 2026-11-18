package br.com.webbudget.server.infrastructure.repository.administration

import br.com.webbudget.server.domain.entities.administration.Role
import br.com.webbudget.server.jooq.administration.tables.references.ROLES
import org.jooq.DSLContext
import org.springframework.stereotype.Repository

@Repository
class RoleRepository(
    private val dsl: DSLContext
) {

    fun findAll(): List<Role> {
        val roles = ROLES.`as`("roles")
        return dsl.selectFrom(roles)
            .orderBy(roles.NAME)
            .fetch { record -> record.toRole() }
    }

    fun findByName(name: String): Role? {
        val roles = ROLES.`as`("roles")
        return dsl.selectFrom(roles)
            .where(roles.NAME.eq(name))
            .fetchOne { record -> record.toRole() }
    }
}
