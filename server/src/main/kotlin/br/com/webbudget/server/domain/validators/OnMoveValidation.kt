package br.com.webbudget.server.domain.validators

import org.springframework.beans.factory.annotation.Qualifier

@MustBeDocumented
@Qualifier("ON_MOVE")
@Retention(AnnotationRetention.RUNTIME)
@Target(AnnotationTarget.CLASS, AnnotationTarget.FUNCTION, AnnotationTarget.VALUE_PARAMETER)
annotation class OnMoveValidation
