package br.com.webbudget.server.infrastructure.repository

import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.domain.exceptions.ErrorCodes.CONCURRENT_UPDATE

fun concurrentUpdate(): DomainException = DomainException.conflict(
    message = "The record was changed by someone else, reload it and try again",
    error = CONCURRENT_UPDATE
)
