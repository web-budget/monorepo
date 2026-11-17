package br.com.webbudget.server.domain.services.administration

import br.com.webbudget.server.domain.entities.administration.UserStatus
import br.com.webbudget.server.domain.exceptions.AccountDisabledException
import br.com.webbudget.server.domain.exceptions.InvalidCredentialsException
import br.com.webbudget.server.domain.security.CurrentUser
import br.com.webbudget.server.domain.security.CurrentUserProvider
import br.com.webbudget.server.infrastructure.config.security.toAuthorities
import br.com.webbudget.server.infrastructure.repository.administration.UserRepository
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.web.context.SecurityContextRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional(readOnly = true)
class AuthService(
    private val userRepository: UserRepository,
    private val passwordEncoder: PasswordEncoder,
    private val currentUserProvider: CurrentUserProvider,
    private val securityContextRepository: SecurityContextRepository
) {

    private val unknownUserPasswordHash: String by lazy { passwordEncoder.encode(UNKNOWN_USER_PASSWORD)!! }

    fun login(email: String, password: String, request: HttpServletRequest, response: HttpServletResponse): CurrentUser {

        val user = userRepository.findByEmail(email)

        val passwordMatches = passwordEncoder.matches(password, user?.password ?: unknownUserPasswordHash)

        if (user == null || !passwordMatches) {
            throw InvalidCredentialsException()
        }

        if (!user.active || user.status == UserStatus.BLOCKED) {
            throw AccountDisabledException()
        }

        return establishSession(CurrentUser.from(user), request, response)
    }

    fun currentSession(): CurrentUser = currentUserProvider.getSessionUser()

    fun logout(request: HttpServletRequest) {
        request.session.invalidate()
        SecurityContextHolder.clearContext()
    }

    private fun establishSession(
        user: CurrentUser,
        request: HttpServletRequest,
        response: HttpServletResponse
    ): CurrentUser {

        request.getSession(true)
        request.changeSessionId()

        val context = SecurityContextHolder.createEmptyContext()
        context.authentication = UsernamePasswordAuthenticationToken(user, null, user.toAuthorities())
        SecurityContextHolder.setContext(context)

        securityContextRepository.saveContext(context, request, response)

        return user
    }

    companion object {
        private const val UNKNOWN_USER_PASSWORD = "unknown-user-password"
    }
}
