package br.com.webbudget.server.infrastructure.config.security

import br.com.webbudget.server.domain.entities.administration.UserStatus
import br.com.webbudget.server.domain.exceptions.SessionRevokedException
import br.com.webbudget.server.domain.exceptions.UnauthenticatedException
import br.com.webbudget.server.domain.exceptions.UserNotApprovedException
import br.com.webbudget.server.domain.security.CurrentUser
import br.com.webbudget.server.domain.security.CurrentUserProvider
import br.com.webbudget.server.infrastructure.repository.administration.UserRepository
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Component

@Component
class SecurityContextCurrentUserProvider(
    private val userRepository: UserRepository
) : CurrentUserProvider {

    override fun getCurrentUser(): CurrentUser {

        val user = getSessionUser()

        if (user.status != UserStatus.APPROVED) {
            throw UserNotApprovedException(user.email)
        }

        return user
    }

    override fun getSessionUser(): CurrentUser {

        val sessionPrincipal = SecurityContextHolder.getContext().authentication?.principal as? CurrentUser
            ?: throw UnauthenticatedException()

        val user = userRepository.findByExternalId(sessionPrincipal.externalId)
            ?: throw SessionRevokedException("The account of this session does not exist anymore")

        if (user.credentialsVersion != sessionPrincipal.credentialsVersion) {
            throw SessionRevokedException("The credentials of this account changed after the session was opened")
        }

        if (!user.active) {
            throw SessionRevokedException("The account of this session is not active")
        }

        return CurrentUser.from(user)
    }
}
