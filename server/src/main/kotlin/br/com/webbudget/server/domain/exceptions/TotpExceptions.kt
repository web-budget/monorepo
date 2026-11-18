package br.com.webbudget.server.domain.exceptions

import br.com.webbudget.server.domain.exceptions.ErrorCodes.INVALID_TOTP_CODE
import br.com.webbudget.server.domain.exceptions.ErrorCodes.TOO_MANY_TOTP_ATTEMPTS
import br.com.webbudget.server.domain.exceptions.ErrorCodes.TOTP_ALREADY_ENABLED
import org.springframework.http.HttpStatus

class InvalidTotpCodeException : DomainException(
    "The TOTP code is invalid",
    INVALID_TOTP_CODE,
    status = HttpStatus.UNAUTHORIZED
)

class TotpAlreadyEnabledException : DomainException(
    "The TOTP is already enabled for this account",
    TOTP_ALREADY_ENABLED,
    status = HttpStatus.CONFLICT
)

class TooManyTotpAttemptsException : DomainException(
    "Too many invalid TOTP codes, try again later",
    TOO_MANY_TOTP_ATTEMPTS,
    status = HttpStatus.TOO_MANY_REQUESTS
)
