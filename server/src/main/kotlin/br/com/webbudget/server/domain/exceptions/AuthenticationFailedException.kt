package br.com.webbudget.server.domain.exceptions

import org.springframework.security.core.AuthenticationException

open class AuthenticationFailedException(
    val error: String,
    message: String
) : AuthenticationException(message)

class UnauthenticatedException : AuthenticationFailedException(ErrorCodes.UNAUTHENTICATED, "There is no authenticated user")

class SessionRevokedException(message: String) : AuthenticationFailedException(ErrorCodes.SESSION_REVOKED, message)

class InvalidCredentialsException : AuthenticationFailedException(ErrorCodes.INVALID_CREDENTIALS, "Invalid e-mail or password")

class AccountDisabledException : AuthenticationFailedException(ErrorCodes.ACCOUNT_DISABLED, "The account is disabled")
