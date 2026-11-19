package br.com.webbudget.server.infrastructure.config.security

import br.com.webbudget.server.domain.services.administration.AuthService
import br.com.webbudget.server.domain.services.administration.GoogleIdentity
import br.com.webbudget.server.domain.services.administration.GoogleLoginResult
import io.github.oshai.kotlinlogging.KotlinLogging
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.security.core.Authentication
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken
import org.springframework.security.web.authentication.AuthenticationSuccessHandler
import org.springframework.stereotype.Component

private val logger = KotlinLogging.logger {}

@Component
class GoogleLoginSuccessHandler(
    private val authService: AuthService,
    private val googleAuthProperties: GoogleAuthProperties
) : AuthenticationSuccessHandler {

    override fun onAuthenticationSuccess(
        request: HttpServletRequest,
        response: HttpServletResponse,
        authentication: Authentication
    ) {

        val identity = identityOf(authentication as OAuth2AuthenticationToken)

        if (identity == null) {
            logger.warn { "Google login rejected because the identity does not carry a verified e-mail" }
            reject(request, response)
            return
        }

        val result = try {
            authService.handleGoogleLogin(identity, request, response)
        } catch (exception: Exception) {
            logger.warn(exception) { "Google login failed while processing the OAuth2 callback" }
            reject(request, response)
            return
        }

        when (result) {
            is GoogleLoginResult.Authenticated -> response.sendRedirect("${googleAuthProperties.clientBaseUrl}/")
            is GoogleLoginResult.LinkRequired -> {
                logger.info { "Google login collided with a local account, offering to link it" }
                discardOAuth2Session(request)
                response.sendRedirect("${googleAuthProperties.clientBaseUrl}/login?error=email_in_use&linkToken=${result.linkToken}")
            }
        }
    }

    private fun identityOf(authentication: OAuth2AuthenticationToken): GoogleIdentity? {

        val attributes = authentication.principal.attributes

        if (attributes["email_verified"] != true) {
            return null
        }

        val subject = (attributes["sub"] as? String)?.takeIf { it.isNotBlank() } ?: return null
        val email = (attributes["email"] as? String)?.takeIf { it.isNotBlank() } ?: return null

        return GoogleIdentity(subject, email.trim(), attributes["name"] as? String)
    }

    private fun reject(request: HttpServletRequest, response: HttpServletResponse) {
        discardOAuth2Session(request)
        response.sendRedirect("${googleAuthProperties.clientBaseUrl}/login?error=oauth_failed")
    }

    private fun discardOAuth2Session(request: HttpServletRequest) {
        SecurityContextHolder.clearContext()
        request.getSession(false)?.invalidate()
    }
}
