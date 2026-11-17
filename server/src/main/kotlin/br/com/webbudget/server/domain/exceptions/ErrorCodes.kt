package br.com.webbudget.server.domain.exceptions

object ErrorCodes {
    const val INVALID_TOKEN = "invalid-token"
    const val FIELD_VALIDATION_FAILED = "field-validation-failed"
    const val RESOURCE_NOT_FOUND = "resource-not-found"
    const val CONFLICTING_PROPERTIES = "conflicting-properties"
    const val CONCURRENT_UPDATE = "concurrent-update"
    const val BAD_REQUEST = "bad-request"
    const val DATA_INTEGRITY_VIOLATION = "data-integrity-violation"
    const val INTERNAL_ERROR = "internal-error"
    const val UNAUTHENTICATED = "unauthenticated"
    const val INVALID_CREDENTIALS = "invalid-credentials"
    const val ACCOUNT_DISABLED = "account-disabled"
    const val SESSION_REVOKED = "session-revoked"
    const val FORBIDDEN = "forbidden"
    const val INVALID_CSRF_TOKEN = "invalid-csrf-token"

    const val PENDING_APPROVAL = "pending_approval"

    const val ACCOUNTED_PERIOD_MOVEMENT = "accounted-period-movement"
    const val FINANCIAL_PERIOD_NOT_OPEN = "financial-period-not-open"
    const val RECURRING_MOVEMENT_NOT_ACTIVE = "recurring-movement.errors.invalid-state"
}
