package br.com.webbudget.server.domain.exceptions

import br.com.webbudget.server.domain.exceptions.ErrorCodes.RESOURCE_NOT_FOUND
import org.springframework.http.HttpStatus

class ResourceNotFoundException : ApplicationException(
    error = RESOURCE_NOT_FOUND,
    status = HttpStatus.NOT_FOUND,
    message = "Can't find any resource with the filters provided"
)
