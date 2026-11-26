package br.com.webbudget.server.infrastructure.config.security

import org.springframework.security.access.prepost.PreAuthorize

@Target(AnnotationTarget.CLASS, AnnotationTarget.FUNCTION)
@Retention(AnnotationRetention.RUNTIME)
@MustBeDocumented
@PreAuthorize("@roleGuard.isMainAdmin()")
annotation class RequiresMainAdmin
