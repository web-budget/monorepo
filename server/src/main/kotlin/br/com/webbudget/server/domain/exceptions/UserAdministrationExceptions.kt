package br.com.webbudget.server.domain.exceptions

import br.com.webbudget.server.domain.entities.administration.UserStatus
import br.com.webbudget.server.domain.exceptions.ErrorCodes.FIELD_VALIDATION_FAILED
import br.com.webbudget.server.domain.exceptions.ErrorCodes.INVALID_USER_STATUS_TRANSITION
import br.com.webbudget.server.domain.exceptions.ErrorCodes.SELF_ACTION_NOT_ALLOWED
import org.springframework.http.HttpStatus

class SelfActionNotAllowedException : DomainException(
    "This action can not be applied to your own account",
    SELF_ACTION_NOT_ALLOWED
)

class InvalidUserStatusTransitionException(current: UserStatus, expected: UserStatus) : DomainException(
    "The user status is [$current] but the action requires [$expected]",
    INVALID_USER_STATUS_TRANSITION,
    mapOf("status" to current.name, "expected" to expected.name),
    HttpStatus.CONFLICT
)

class UnknownRolesException(unknown: Collection<String>) : DomainException(
    "Some roles do not exist: $unknown",
    FIELD_VALIDATION_FAILED,
    mapOf("roles" to "unknown-role", "unknown" to unknown.toList())
)
