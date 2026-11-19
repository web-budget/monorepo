package br.com.webbudget.server.infrastructure.config.security

import br.com.webbudget.server.domain.entities.administration.User
import br.com.webbudget.server.domain.exceptions.SelfActionNotAllowedException
import br.com.webbudget.server.domain.security.CurrentUser
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Component

@Component
class SelfActionGuard {

    fun assertNotSelf(target: User) {
        if (isSelf(target)) {
            throw SelfActionNotAllowedException()
        }
    }

    fun assertRolesAndActivationUnchanged(target: User, newRoles: Collection<String>) {
        if (isSelf(target) && (!target.active || newRoles.toSet() != target.roleNames())) {
            throw SelfActionNotAllowedException()
        }
    }

    private fun isSelf(target: User): Boolean {
        val principal = SecurityContextHolder.getContext().authentication?.principal as? CurrentUser
        return principal != null && principal.externalId == target.externalId
    }
}
