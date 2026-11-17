package br.com.webbudget.server.application.controllers

import br.com.webbudget.server.domain.exceptions.ApplicationException
import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.domain.exceptions.ErrorCodes.BAD_REQUEST
import br.com.webbudget.server.domain.exceptions.ErrorCodes.DATA_INTEGRITY_VIOLATION
import br.com.webbudget.server.domain.exceptions.ErrorCodes.FIELD_VALIDATION_FAILED
import br.com.webbudget.server.domain.exceptions.ErrorCodes.INTERNAL_ERROR
import io.github.oshai.kotlinlogging.KotlinLogging
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.dao.NonTransientDataAccessException
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.HttpStatusCode
import org.springframework.http.ProblemDetail
import org.springframework.http.ResponseEntity
import org.springframework.security.access.AccessDeniedException
import org.springframework.security.core.AuthenticationException
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.context.request.WebRequest
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler

private val log = KotlinLogging.logger {}

@RestControllerAdvice
class ExceptionHandlerAdvice : ResponseEntityExceptionHandler() {

    @ExceptionHandler(DomainException::class)
    fun handle(exception: DomainException): ProblemDetail =
        buildProblem(exception.status, exception.error, exception.message ?: NO_MESSAGE_PROVIDED, exception.parameters)

    @ExceptionHandler(ApplicationException::class)
    fun handle(exception: ApplicationException): ProblemDetail =
        buildProblem(exception.status, exception.error, exception.message ?: NO_MESSAGE_PROVIDED)

    @ExceptionHandler(IllegalArgumentException::class)
    fun handle(exception: IllegalArgumentException): ProblemDetail {
        log.error(exception) { "Illegal argument exception" }
        return buildProblem(HttpStatus.BAD_REQUEST, BAD_REQUEST, GENERIC_BAD_REQUEST_DETAIL)
    }

    @ExceptionHandler(DataIntegrityViolationException::class)
    fun handle(exception: DataIntegrityViolationException): ProblemDetail {
        log.error(exception) { "Data integrity violation" }
        return buildProblem(HttpStatus.BAD_REQUEST, DATA_INTEGRITY_VIOLATION, GENERIC_DATA_INTEGRITY_DETAIL)
    }

    @ExceptionHandler(NonTransientDataAccessException::class)
    fun handle(exception: NonTransientDataAccessException): ProblemDetail {
        log.error(exception) { "Non transient data access exception" }
        return buildProblem(HttpStatus.BAD_REQUEST, BAD_REQUEST, GENERIC_BAD_REQUEST_DETAIL)
    }

    @ExceptionHandler(AccessDeniedException::class)
    fun handleAccessDenied(exception: AccessDeniedException): Nothing = throw exception

    @ExceptionHandler(AuthenticationException::class)
    fun handleAuthentication(exception: AuthenticationException): Nothing = throw exception

    @ExceptionHandler(Exception::class)
    fun handle(exception: Exception): ProblemDetail {
        log.error(exception) { "Unexpected exception" }
        return buildProblem(HttpStatus.INTERNAL_SERVER_ERROR, INTERNAL_ERROR, GENERIC_INTERNAL_ERROR_DETAIL)
    }

    override fun handleMethodArgumentNotValid(
        exception: MethodArgumentNotValidException,
        headers: HttpHeaders,
        status: HttpStatusCode,
        request: WebRequest
    ): ResponseEntity<Any> {
        val violations = exception.bindingResult.fieldErrors.associate { it.field to it.defaultMessage }
        val problem = buildProblem(
            HttpStatus.UNPROCESSABLE_CONTENT,
            FIELD_VALIDATION_FAILED,
            "Some fields are missing or invalid",
            violations
        )
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_CONTENT).body(problem)
    }

    private fun buildProblem(
        status: HttpStatus,
        error: String,
        detail: String,
        parameters: Map<String, Any?>? = null
    ): ProblemDetail {
        val problem = ProblemDetail.forStatusAndDetail(status, detail)
        problem.setProperty("error", error)
        parameters?.let { problem.setProperty("parameters", it) }
        return problem
    }

    companion object {
        private const val NO_MESSAGE_PROVIDED = "No detail message provided"
        private const val GENERIC_BAD_REQUEST_DETAIL = "The request could not be processed"
        private const val GENERIC_DATA_INTEGRITY_DETAIL =
            "The operation could not be completed because this record is linked to other records"
        private const val GENERIC_INTERNAL_ERROR_DETAIL = "An unexpected error occurred, please try again later"
    }
}
