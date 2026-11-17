package br.com.webbudget.server.domain.validators

fun interface BusinessValidator<T> {

    fun validate(value: T)
}
