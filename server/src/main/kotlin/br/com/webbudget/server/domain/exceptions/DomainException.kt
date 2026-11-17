package br.com.webbudget.server.domain.exceptions

import br.com.webbudget.server.domain.exceptions.ErrorCodes.CONFLICTING_PROPERTIES
import org.springframework.http.HttpStatus

open class DomainException(
    message: String,
    val error: String,
    val parameters: Map<String, Any?>? = null,
    val status: HttpStatus = HttpStatus.BAD_REQUEST
) : RuntimeException(message) {

    companion object {

        private const val DEFAULT_CONFLICT_MESSAGE = "Some properties are conflicting with existent data"

        fun conflict(
            parameters: Map<String, Any?>? = null,
            message: String = DEFAULT_CONFLICT_MESSAGE,
            error: String = CONFLICTING_PROPERTIES
        ): DomainException = DomainException(message, error, parameters, HttpStatus.CONFLICT)
    }
}
