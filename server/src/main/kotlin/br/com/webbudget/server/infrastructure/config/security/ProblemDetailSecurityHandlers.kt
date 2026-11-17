package br.com.webbudget.server.infrastructure.config.security

import br.com.webbudget.server.domain.entities.administration.UserStatus
import br.com.webbudget.server.domain.exceptions.AuthenticationFailedException
import br.com.webbudget.server.domain.exceptions.ErrorCodes.FORBIDDEN
import br.com.webbudget.server.domain.exceptions.ErrorCodes.INVALID_CSRF_TOKEN
import br.com.webbudget.server.domain.exceptions.ErrorCodes.PENDING_APPROVAL
import br.com.webbudget.server.domain.exceptions.ErrorCodes.UNAUTHENTICATED
import br.com.webbudget.server.domain.exceptions.SessionRevokedException
import br.com.webbudget.server.domain.exceptions.UserNotApprovedException
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.security.access.AccessDeniedException
import org.springframework.security.core.AuthenticationException
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.web.AuthenticationEntryPoint
import org.springframework.security.web.access.AccessDeniedHandler
import org.springframework.security.web.csrf.CsrfException
import org.springframework.stereotype.Component
import tools.jackson.databind.json.JsonMapper

private val UNAPPROVED_STATUS_AUTHORITIES = setOf(UserStatus.PENDING, UserStatus.BLOCKED)
    .map { "$STATUS_AUTHORITY_PREFIX$it" }
    .toSet()

private fun JsonMapper.writeProblem(
    request: HttpServletRequest,
    response: HttpServletResponse,
    status: HttpStatus,
    error: String,
    detail: String?
) {
    val problem = linkedMapOf<String, Any?>(
        "type" to "about:blank",
        "title" to status.reasonPhrase,
        "status" to status.value(),
        "detail" to detail,
        "instance" to request.requestURI,
        "error" to error
    )

    response.status = status.value()
    response.contentType = MediaType.APPLICATION_PROBLEM_JSON_VALUE
    response.characterEncoding = Charsets.UTF_8.name()
    response.writer.write(writeValueAsString(problem))
}

@Component
class ProblemDetailAuthenticationEntryPoint(
    private val jsonMapper: JsonMapper
) : AuthenticationEntryPoint {

    override fun commence(
        request: HttpServletRequest,
        response: HttpServletResponse,
        authException: AuthenticationException
    ) {
        if (authException is SessionRevokedException) {
            request.session.invalidate()
        }

        val error = (authException as? AuthenticationFailedException)?.error ?: UNAUTHENTICATED

        jsonMapper.writeProblem(request, response, HttpStatus.UNAUTHORIZED, error, authException.message)
    }
}

@Component
class ProblemDetailAccessDeniedHandler(
    private val jsonMapper: JsonMapper
) : AccessDeniedHandler {

    override fun handle(
        request: HttpServletRequest,
        response: HttpServletResponse,
        accessDeniedException: AccessDeniedException
    ) {
        val error = when {
            accessDeniedException is CsrfException -> INVALID_CSRF_TOKEN
            accessDeniedException is UserNotApprovedException || hasUnapprovedStatus() -> PENDING_APPROVAL
            else -> FORBIDDEN
        }

        jsonMapper.writeProblem(request, response, HttpStatus.FORBIDDEN, error, accessDeniedException.message)
    }

    private fun hasUnapprovedStatus(): Boolean = SecurityContextHolder.getContext().authentication
        ?.authorities
        .orEmpty()
        .any { it.authority in UNAPPROVED_STATUS_AUTHORITIES }
}
