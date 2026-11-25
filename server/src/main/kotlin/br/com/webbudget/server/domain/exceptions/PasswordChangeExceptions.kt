package br.com.webbudget.server.domain.exceptions

import br.com.webbudget.server.domain.exceptions.ErrorCodes.ACCOUNT_WITHOUT_PASSWORD
import br.com.webbudget.server.domain.exceptions.ErrorCodes.INVALID_CURRENT_PASSWORD
import br.com.webbudget.server.domain.exceptions.ErrorCodes.TOO_MANY_PASSWORD_CHANGE_ATTEMPTS
import org.springframework.http.HttpStatus

class InvalidCurrentPasswordException : DomainException(
    "The current password does not match",
    INVALID_CURRENT_PASSWORD
)

class AccountWithoutPasswordException : DomainException(
    "The account has no password to change",
    ACCOUNT_WITHOUT_PASSWORD
)

class TooManyPasswordChangeAttemptsException : DomainException(
    "Too many invalid current passwords, try again later",
    TOO_MANY_PASSWORD_CHANGE_ATTEMPTS,
    status = HttpStatus.TOO_MANY_REQUESTS
)
