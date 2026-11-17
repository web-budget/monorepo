package br.com.webbudget.server.infrastructure.config.security

import br.com.webbudget.server.domain.security.CurrentUser
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.web.context.SecurityContextRepository
import org.springframework.stereotype.Component

@Component
class SessionPrincipalRefresher(
    private val securityContextRepository: SecurityContextRepository
) {

    fun refresh(user: CurrentUser, request: HttpServletRequest, response: HttpServletResponse) {

        val current = SecurityContextHolder.getContext().authentication?.principal as? CurrentUser

        if (current == null || current.externalId != user.externalId) {
            return
        }

        val context = SecurityContextHolder.createEmptyContext()
        context.authentication = UsernamePasswordAuthenticationToken(user, null, user.toAuthorities())
        SecurityContextHolder.setContext(context)

        securityContextRepository.saveContext(context, request, response)
    }
}
