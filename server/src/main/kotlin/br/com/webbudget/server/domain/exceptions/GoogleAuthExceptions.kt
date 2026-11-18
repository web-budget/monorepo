package br.com.webbudget.server.domain.exceptions

import br.com.webbudget.server.domain.exceptions.ErrorCodes.INVALID_GOOGLE_LINK_TOKEN
import org.springframework.http.HttpStatus

class InvalidGoogleLinkTokenException : DomainException(
    "The Google link request is expired or invalid, sign in with Google again",
    INVALID_GOOGLE_LINK_TOKEN,
    status = HttpStatus.BAD_REQUEST
)

class GoogleLoginRejectedException(message: String) : RuntimeException(message)
