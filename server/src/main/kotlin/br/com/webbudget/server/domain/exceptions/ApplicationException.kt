package br.com.webbudget.server.domain.exceptions

import org.springframework.http.HttpStatus

open class ApplicationException(
    val error: String,
    val status: HttpStatus,
    message: String = error
) : RuntimeException(message)
