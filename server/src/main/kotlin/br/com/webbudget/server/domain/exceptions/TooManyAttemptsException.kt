package br.com.webbudget.server.domain.exceptions

import br.com.webbudget.server.domain.exceptions.ErrorCodes.TOO_MANY_LOGIN_ATTEMPTS
import br.com.webbudget.server.domain.exceptions.ErrorCodes.TOO_MANY_REGISTRATION_ATTEMPTS
import org.springframework.http.HttpStatus

class TooManyLoginAttemptsException : DomainException(
    "Too many invalid login attempts, try again later",
    TOO_MANY_LOGIN_ATTEMPTS,
    status = HttpStatus.TOO_MANY_REQUESTS
)

class TooManyRegistrationAttemptsException : DomainException(
    "Too many registration attempts, try again later",
    TOO_MANY_REGISTRATION_ATTEMPTS,
    status = HttpStatus.TOO_MANY_REQUESTS
)
