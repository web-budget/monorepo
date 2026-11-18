package br.com.webbudget.server.infrastructure.config.security

import io.github.oshai.kotlinlogging.KotlinLogging
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.security.core.AuthenticationException
import org.springframework.security.web.authentication.AuthenticationFailureHandler
import org.springframework.stereotype.Component

private val logger = KotlinLogging.logger {}

@Component
class GoogleLoginFailureHandler(
    private val googleAuthProperties: GoogleAuthProperties
) : AuthenticationFailureHandler {

    override fun onAuthenticationFailure(
        request: HttpServletRequest,
        response: HttpServletResponse,
        exception: AuthenticationException
    ) {
        logger.warn(exception) { "Google login failed" }
        response.sendRedirect("${googleAuthProperties.clientBaseUrl}/login?error=oauth_failed")
    }
}
