package br.com.webbudget.server.infrastructure.config.security

import br.com.webbudget.server.domain.security.CurrentUserProvider
import org.springframework.stereotype.Component

@Component
class RoleGuard(
    private val currentUserProvider: CurrentUserProvider
) {

    fun hasRole(role: String): Boolean = role in currentUserProvider.getCurrentUser().roles
}
